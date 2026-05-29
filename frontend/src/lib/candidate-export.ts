import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CandidateListItem } from "./candidate-api";
import type { Category, CandidateStatus } from "./types";
import { getExportStrings, genderExportLabel, type ExportLocale } from "./export-i18n";
import { pdfSafeText } from "./export-labels";

export type CandidatesExportVariant = "all" | "graduates";

const CATEGORY_PDF_RGB: Record<Category, [number, number, number]> = {
  Excellent: [209, 250, 229],
  Good: [236, 253, 245],
  Passable: [254, 243, 199],
  Critical: [254, 226, 226],
};

const BLACK = "000000";

const CATEGORY_FILLS: Record<Category, string> = {
  Excellent: "D1FAE5",
  Good: "ECFDF5",
  Passable: "FEF3C7",
  Critical: "FEE2E2",
};

const STATUS_FILLS: Record<CandidateStatus, string> = {
  Active: "DBEAFE",
  Graduated: "D1FAE5",
  Dismissed: "FEF3C7",
  Terminated: "FEE2E2",
  Archived: "F1F5F9",
};

function groupByPromotion(candidates: CandidateListItem[], unassignedLabel: string) {
  const map = new Map<string, { name: string; items: CandidateListItem[] }>();

  for (const candidate of candidates) {
    const id = candidate.promotionId || "unassigned";
    const name = candidate.promotionName || unassignedLabel;
    const existing = map.get(id);
    if (existing) existing.items.push(candidate);
    else map.set(id, { name, items: [candidate] });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function setCell(
  ws: XLSX.WorkSheet,
  c: number,
  r: number,
  value: string | number,
  style?: object,
) {
  const ref = XLSX.utils.encode_cell({ c, r });
  ws[ref] = {
    v: value,
    t: typeof value === "number" ? "n" : "s",
    ...(style ? { s: style } : {}),
  };
}

function expandRange(ws: XLSX.WorkSheet, r: number, c: number) {
  const ref = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  if (r > ref.e.r) ref.e.r = r;
  if (c > ref.e.c) ref.e.c = c;
  ws["!ref"] = XLSX.utils.encode_range(ref);
}

export function exportCandidatesExcel(
  candidates: CandidateListItem[],
  locale: ExportLocale = "en",
  variant: CandidatesExportVariant = "all",
) {
  const t = getExportStrings(locale);
  const title = variant === "graduates" ? t.graduates : t.allCandidates;
  const headers = [...t.headers];
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  let row = 0;
  const lastCol = headers.length - 1;

  const titleStyle = {
    font: { name: "Segoe UI", sz: 16, bold: true, color: { rgb: BLACK } },
    fill: { fgColor: { rgb: "EEF2FF" } },
    alignment: { vertical: "center" },
  };
  const metaStyle = {
    font: { name: "Segoe UI", sz: 10, color: { rgb: BLACK } },
    fill: { fgColor: { rgb: "F8FAFC" } },
  };
  const promoStyle = {
    font: { name: "Segoe UI", sz: 12, bold: true, color: { rgb: BLACK } },
    fill: { fgColor: { rgb: "E0E7FF" } },
    alignment: { vertical: "center" },
    border: {
      bottom: { style: "thin", color: { rgb: "C7D2FE" } },
    },
  };
  const headerStyle = {
    font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: BLACK } },
    fill: { fgColor: { rgb: "E2E8F0" } },
    alignment: { vertical: "center", horizontal: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } },
    },
  };
  const cellStyle = {
    font: { name: "Segoe UI", sz: 10, color: { rgb: BLACK } },
    alignment: { vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
  };

  setCell(ws, 0, row, `${title} (${candidates.length})`, titleStyle);
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: lastCol } });
  expandRange(ws, row, lastCol);
  row++;

  setCell(
    ws,
    0,
    row,
    t.exportedMeta(new Date().toLocaleString(locale === "fr" ? "fr-FR" : "en-US")),
    metaStyle,
  );
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: lastCol } });
  expandRange(ws, row, lastCol);
  row += 2;

  for (const group of groupByPromotion(candidates, t.unassigned)) {
    setCell(
      ws,
      0,
      row,
      t.promoTitle(group.name, group.items.length),
      promoStyle,
    );
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: lastCol } });
    for (let c = 1; c <= lastCol; c++) {
      setCell(ws, c, row, "", promoStyle);
    }
    expandRange(ws, row, lastCol);
    row++;

    headers.forEach((header, c) => {
      setCell(ws, c, row, header, headerStyle);
    });
    expandRange(ws, row, lastCol);
    row++;

    group.items.forEach((candidate, index) => {
      const zebra = index % 2 === 1 ? { fill: { fgColor: { rgb: "FAFBFF" } } } : {};
      const status = candidate.status as CandidateStatus;
      const category = candidate.category as Category;
      const values: (string | number)[] = [
        candidate.firstName,
        candidate.lastName,
        candidate.email,
        candidate.phone,
        genderExportLabel(String(candidate.gender), locale),
        candidate.age ?? "",
        candidate.educationLevel,
        candidate.diplomaName,
        candidate.diplomaAverage ?? "",
        t.status[status] ?? candidate.status,
        Number(candidate.avgScore.toFixed(2)),
        t.category[category] ?? candidate.category,
        candidate.recruitmentDate,
      ];

      values.forEach((value, c) => {
        let style = { ...cellStyle, ...zebra };

        if (c === 9 && status in STATUS_FILLS) {
          style = {
            ...style,
            font: { ...cellStyle.font, bold: true, color: { rgb: BLACK } },
            fill: { fgColor: { rgb: STATUS_FILLS[status] } },
            alignment: { ...cellStyle.alignment, horizontal: "center" },
          };
        }

        if (c === 11 && category in CATEGORY_FILLS) {
          style = {
            ...style,
            font: { ...cellStyle.font, bold: true, color: { rgb: BLACK } },
            fill: { fgColor: { rgb: CATEGORY_FILLS[category] } },
            alignment: { ...cellStyle.alignment, horizontal: "center" },
          };
        }

        if (c === 10) {
          style = {
            ...style,
            font: { ...cellStyle.font, bold: true, color: { rgb: BLACK } },
            fill: { fgColor: { rgb: "F5F3FF" } },
            alignment: { ...cellStyle.alignment, horizontal: "center" },
          };
        }

        setCell(ws, c, row, value, style);
      });

      expandRange(ws, row, lastCol);
      row++;
    });

    row++;
  }

  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 28 },
    { wch: 16 },
    { wch: 10 },
    { wch: 6 },
    { wch: 10 },
    { wch: 22 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t.sheetName);
  XLSX.writeFile(wb, variant === "graduates" ? "graduates.xlsx" : "candidates.xlsx");
}

function listRow(
  candidate: CandidateListItem,
  locale: ExportLocale,
  t: ReturnType<typeof getExportStrings>,
): string[] {
  const status = candidate.status as CandidateStatus;
  const category = candidate.category as Category;
  return [
    candidate.firstName,
    candidate.lastName,
    candidate.email,
    candidate.phone,
    genderExportLabel(String(candidate.gender), locale),
    candidate.age != null ? String(candidate.age) : "",
    candidate.educationLevel,
    candidate.diplomaName,
    candidate.diplomaAverage != null ? String(candidate.diplomaAverage) : "",
    t.status[status] ?? candidate.status,
    candidate.avgScore.toFixed(2),
    t.category[category] ?? candidate.category,
    candidate.recruitmentDate,
  ];
}

export function exportCandidatesPDF(
  candidates: CandidateListItem[],
  locale: ExportLocale = "en",
  variant: CandidatesExportVariant = "all",
) {
  const t = getExportStrings(locale);
  const title = variant === "graduates" ? t.graduates : t.allCandidates;
  const filename = variant === "graduates" ? "graduates.pdf" : "candidates.pdf";
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let y = 14;

  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(pdfSafeText(`${title} (${candidates.length})`), margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    pdfSafeText(t.exportedMeta(new Date().toLocaleString(locale === "fr" ? "fr-FR" : "en-US"))),
    margin,
    y,
  );
  y += 8;

  const headers = t.headers.map((h) => pdfSafeText(h));
  const categoryCol = headers.length - 2;

  for (const group of groupByPromotion(candidates, t.unassigned)) {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 14;
    }

    doc.setFontSize(11);
    doc.setTextColor(0, 51, 153);
    doc.text(pdfSafeText(t.promoTitle(group.name, group.items.length)), margin, y);
    y += 5;

    const body = group.items.map((candidate) => {
      const cells = listRow(candidate, locale, t).map((value) => pdfSafeText(String(value)));
      const category = candidate.category as Category;
      return cells.map((content, colIndex) => {
        if (colIndex === categoryCol && category in CATEGORY_PDF_RGB) {
          return {
            content,
            styles: { fillColor: CATEGORY_PDF_RGB[category], fontSize: 7 },
          };
        }
        return { content, styles: { fontSize: 7 } };
      });
    });

    autoTable(doc, {
      startY: y,
      head: [headers],
      body,
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      headStyles: {
        fillColor: [0, 102, 204],
        textColor: 255,
        fontSize: 7,
        halign: "center",
      },
      styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 18 },
        2: { cellWidth: 32 },
        3: { cellWidth: 20 },
        4: { cellWidth: 14 },
        5: { cellWidth: 10, halign: "center" },
        6: { cellWidth: 14 },
        7: { cellWidth: 22 },
        8: { cellWidth: 14, halign: "center" },
        9: { cellWidth: 16, halign: "center" },
        10: { cellWidth: 14, halign: "center" },
        11: { cellWidth: 16, halign: "center" },
        12: { cellWidth: 18, halign: "center" },
      },
      didDrawPage: () => {
        doc.setFontSize(8);
        doc.setTextColor(130);
        doc.text(
          pdfSafeText("Cloud Marketing Hub — CareerHub"),
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 6,
          { align: "center" },
        );
      },
    });

    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += 8;
  }

  doc.save(filename);
}
