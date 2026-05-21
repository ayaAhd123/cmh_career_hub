import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import type { Candidate, Promotion, Category } from "./types";
import {
  categoryFor, disciplineAvg, formatDate, overallAverage, passRate, skillsAvg, testsAvg, turnoverRate, workAvg,
} from "./calc";

const downloadFile = (data: BlobPart, name: string, type: string) => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const disciplineRows = (c: Candidate) => [
  ["Discipline et ponctualité", c.skills.discipline.discipline.toFixed(1)],
  ["Motivation", c.skills.discipline.motivation.toFixed(1)],
  ["Communication", c.skills.discipline.communication.toFixed(1)],
  ["Sens de l'écoute", c.skills.discipline.listening.toFixed(1)],
  ["Average", disciplineAvg(c.skills.discipline).toFixed(2)],
];
const workRows = (c: Candidate) => [
  ["Sens de l'initiative", c.skills.work.initiative.toFixed(1)],
  ["Capacité d'analyse", c.skills.work.analysis.toFixed(1)],
  ["Organisation", c.skills.work.organization.toFixed(1)],
  ["Aptitudes intellectuelles", c.skills.work.intellectual.toFixed(1)],
  ["Rythme d'avancement", c.skills.work.pace.toFixed(1)],
  ["Rapidité d'exécution", c.skills.work.speed.toFixed(1)],
  ["Average", workAvg(c.skills.work).toFixed(2)],
];

const categoryOrder: Category[] = ["Excellent", "Good", "Passable", "Critical"];
const categoryRgb = (category: Category) => {
  switch (category) {
    case "Excellent": return [16, 185, 129] as const;
    case "Good": return [59, 130, 246] as const;
    case "Passable": return [245, 158, 11] as const;
    case "Critical": return [239, 68, 68] as const;
  }
};
const categoryHex = (category: Category) => {
  switch (category) {
    case "Excellent": return "#10B981";
    case "Good": return "#3B82F6";
    case "Passable": return "#F59E0B";
    case "Critical": return "#EF4444";
  }
};

const buildPromotionRankMap = (cands: Candidate[]) => {
  const sorted = [...cands].sort((a, b) => {
    const diff = overallAverage(b) - overallAverage(a);
    if (Math.abs(diff) > 0.001) return diff;
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  });
  return new Map(sorted.map((c, i) => [c.id, i + 1]));
};

const promotionCandidateRow = (c: Candidate, rank: number) => [
  categoryFor(overallAverage(c)),
  `${c.firstName} ${c.lastName}`,
  c.skills.discipline.discipline.toFixed(1),
  c.skills.discipline.motivation.toFixed(1),
  c.skills.discipline.communication.toFixed(1),
  c.skills.discipline.listening.toFixed(1),
  c.skills.work.initiative.toFixed(1),
  c.skills.work.analysis.toFixed(1),
  c.skills.work.organization.toFixed(1),
  c.skills.work.intellectual.toFixed(1),
  c.skills.work.pace.toFixed(1),
  c.skills.work.speed.toFixed(1),
  overallAverage(c).toFixed(2),
  rank.toString(),
];

export const exportCandidatePDF = (c: Candidate, promo?: Promotion) => {
  const doc = new jsPDF();
  const avg = overallAverage(c);
  doc.setFontSize(20);
  doc.setTextColor(0, 102, 204);
  doc.text("CareerHub — Candidate Report", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`by CMH Cloud Marketing Hub · Generated ${formatDate(new Date().toISOString())}`, 14, 26);

  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text(`${c.firstName} ${c.lastName}`, 14, 38);

  autoTable(doc, {
    startY: 44,
    head: [["Field", "Value"]],
    body: [
      ["Email", c.email],
      ["Phone", c.phone],
      ["Recruitment Date", formatDate(c.recruitmentDate)],
      ["Education", `${c.educationLevel} - ${c.diplomaName}`],
      ["Diploma Average", c.diplomaAverage === "Not provided" ? "Not provided" : `${c.diplomaAverage}/20`],
      ["Promotion", promo ? `${promo.id} ${promo.name}` : "—"],
      ["Status", c.status],
    ],
    theme: "striped",
    headStyles: { fillColor: [0, 102, 204] },
  });
  // Reordered: Modules -> Work Skills -> Discipline
  let y = (doc as any).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: y,
    head: [["Module", "Score /20"]],
    body: c.modules.map((m) => [m.name, (m.score || 0).toFixed(2)]),
    headStyles: { fillColor: [0, 102, 204] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: y,
    head: [["Work Skills (/5)", "Score"]],
    body: workRows(c),
    headStyles: { fillColor: [0, 102, 204] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: y,
    head: [["Discipline (/5)", "Score"]],
    body: disciplineRows(c),
    headStyles: { fillColor: [0, 102, 204] },
  });

  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setTextColor(30);
  doc.text(`Skills Average: ${skillsAvg(c.skills).toFixed(2)}/5`, 14, y);
  doc.text(`Modules Average: ${testsAvg(c.modules).toFixed(2)}/20`, 14, y + 7);
  doc.text(`Overall Average: ${avg.toFixed(2)}/5`, 14, y + 14);
  doc.text(`Category: ${categoryFor(avg)}`, 14, y + 21);
  doc.text(`Recommendation: ${avg >= 10 ? "PASS" : "FAIL"}`, 14, y + 28);

  doc.save(`${c.firstName}_${c.lastName}_report.pdf`);
};

export const exportCandidateExcel = (c: Candidate, promo?: Promotion) => {
  // Single-sheet report with clear light colors and ordered sections: Info, Modules, Work Skills, Discipline
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [];
  rows.push(["CareerHub Candidate Report"]);
  rows.push([]);
  rows.push(["Name", `${c.firstName} ${c.lastName}`]);
  rows.push(["Email", c.email]);
  rows.push(["Phone", c.phone]);
  rows.push(["Promotion", promo ? `${promo.id} - ${promo.name}` : ""]);
  rows.push(["Education", `${c.educationLevel} - ${c.diplomaName}`]);
  rows.push(["Status", c.status]);
  rows.push(["Skills Average", `${skillsAvg(c.skills).toFixed(2)}/5`]);
  rows.push(["Modules Average", `${testsAvg(c.modules).toFixed(2)}/20`]);
  rows.push(["Overall Average", `${overallAverage(c).toFixed(2)}/5`]);
  rows.push(["Category", categoryFor(overallAverage(c))]);
  rows.push([]);

  // Modules section
  rows.push(["Modules", "Score /20"]);
  c.modules.forEach((m) => rows.push([m.name, (m.score || 0).toFixed(2)]));
  rows.push(["Average", testsAvg(c.modules).toFixed(2)]);
  rows.push([]);

  // Work Skills section
  rows.push(["Work Skills", "Score /5"]);
  workRows(c).forEach((r) => rows.push(r));
  rows.push([]);

  // Discipline section
  rows.push(["Discipline", "Score /5"]);
  disciplineRows(c).forEach((r) => rows.push(r));

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // create merges for the group header rows (merge Discipline across its 4 cols, Work Skills across its 6 cols)
  const merges: any[] = [];
  // find group header rows and add merges where a row has 'Discipline' and 'Work Skills'
  rows.forEach((r, idx) => {
    if (!r) return;
    // Discipline starts at col 2 now, Work Skills at col 6
    if (r[2] === 'Discipline' && r[6] === 'Work Skills') {
      merges.push({ s: { r: idx, c: 2 }, e: { r: idx, c: 5 } });
      merges.push({ s: { r: idx, c: 6 }, e: { r: idx, c: 11 } });
    }
  });
  if (merges.length) ws['!merges'] = merges;

  // Apply basic and specific styling for a light, clear look
  for (const key in ws) {
    if (key[0] === "!") continue;
    ws[key].s = {
      font: { name: "Arial", sz: 10 },
      alignment: { vertical: "center", horizontal: "left" },
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } },
      },
    };
  }

  const titleStyle = { font: { name: "Arial", sz: 16, bold: true, color: { rgb: "0066CC" } }, alignment: { vertical: "center" } };
  const sectionHeader = { font: { name: "Arial", sz: 12, bold: true }, fill: { fgColor: { rgb: "F8FAFC" } } };
  const labelStyle = { font: { name: "Arial", sz: 10, bold: true }, fill: { fgColor: { rgb: "F1F5F9" } } };
  const headerStyle = { font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0066CC" } }, alignment: { vertical: "center", horizontal: "center" } };

  if (ws["A1"]) ws["A1"].s = titleStyle;

  // Labels in the info block (rows 3..11 original) - adapt to rows index
  for (let r = 3; r <= 11; r++) {
    const ref = XLSX.utils.encode_cell({ c: 0, r });
    if (ws[ref]) ws[ref].s = { ...ws[ref].s, ...labelStyle };
  }

  // Section headers: find their row indices
  const findRowIndex = (text: string) => {
    for (let R = 0; R < rows.length; R++) {
      const cell = rows[R][0];
      if (cell === text) return R;
    }
    return -1;
  };

  const modulesHeaderRow = findRowIndex("Modules");
  const workHeaderRow = findRowIndex("Work Skills");
  const discHeaderRow = findRowIndex("Discipline");

  if (modulesHeaderRow >= 0) {
    const ref = XLSX.utils.encode_cell({ c: 0, r: modulesHeaderRow });
    if (ws[ref]) ws[ref].s = { ...ws[ref].s, ...sectionHeader };
    const ref2 = XLSX.utils.encode_cell({ c: 1, r: modulesHeaderRow });
    if (ws[ref2]) ws[ref2].s = { ...ws[ref2].s, ...headerStyle };
  }
  if (workHeaderRow >= 0) {
    const ref = XLSX.utils.encode_cell({ c: 0, r: workHeaderRow });
    if (ws[ref]) ws[ref].s = { ...ws[ref].s, ...sectionHeader };
    const ref2 = XLSX.utils.encode_cell({ c: 1, r: workHeaderRow });
    if (ws[ref2]) ws[ref2].s = { ...ws[ref2].s, ...headerStyle };
  }
  if (discHeaderRow >= 0) {
    const ref = XLSX.utils.encode_cell({ c: 0, r: discHeaderRow });
    if (ws[ref]) ws[ref].s = { ...ws[ref].s, ...sectionHeader };
    const ref2 = XLSX.utils.encode_cell({ c: 1, r: discHeaderRow });
    if (ws[ref2]) ws[ref2].s = { ...ws[ref2].s, ...headerStyle };
  }

  ws["!cols"] = [
    { wch: 40 },
    { wch: 20 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${c.firstName}_${c.lastName}_report.xlsx`);
};

export const exportCandidateHTML = (c: Candidate, promo?: Promotion) => {
  const avg = overallAverage(c);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${c.firstName} ${c.lastName} — CareerHub Report</title>
<style>body{font-family:Inter,system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;color:#1E293B}
h1{color:#0066CC}h2{border-bottom:2px solid #0066CC;padding-bottom:6px;margin-top:30px}
table{width:100%;border-collapse:collapse;margin:10px 0}th,td{padding:8px 12px;border:1px solid #E2E8F0;text-align:left}
th{background:#F8FAFC}.badge{display:inline-block;padding:4px 12px;border-radius:999px;font-weight:600;color:white}
.excellent{background:#10B981}.good{background:#3B82F6}.passable{background:#F59E0B}.critical{background:#EF4444}</style></head><body>
<h1>CareerHub — Candidate Report</h1><p style="color:#64748B">by CMH Cloud Marketing Hub</p>
<h2>${c.firstName} ${c.lastName}</h2>
<p><strong>Overall Average:</strong> ${avg.toFixed(2)}/5 — <span class="badge ${categoryFor(avg).toLowerCase()}">${categoryFor(avg)}</span></p>

<!-- Personal infos -->
<h2>Personal infos</h2>
<table><tr><th>Email</th><td>${c.email}</td></tr><tr><th>Phone</th><td>${c.phone}</td></tr>
<tr><th>Education</th><td>${c.educationLevel} — ${c.diplomaName}</td></tr>
<tr><th>Promotion</th><td>${promo ? promo.id + " · " + promo.name : "—"}</td></tr>
<tr><th>Status</th><td>${c.status}</td></tr></table>

<!-- Modules -->
<h2>Modules (/20)</h2>
<table><tr><th>Module</th><th>Score</th></tr>
${c.modules.map((m) => `<tr><td>${m.name}</td><td>${(m.score || 0).toFixed(2)}</td></tr>`).join("")}
<tr><td><strong>Average</strong></td><td><strong>${testsAvg(c.modules).toFixed(2)}</strong></td></tr></table>

<!-- Work Skills -->
<h2>Work Skills (/5)</h2>
<table><tr><th>Skill</th><th>Score</th></tr>
${workRows(c).map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</table>

<!-- Discipline -->
<h2>Discipline (/5)</h2>
<table><tr><th>Skill</th><th>Score</th></tr>
${disciplineRows(c).map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</table>

<p>Recommendation: <strong>${avg >= 10 ? "PASS" : "FAIL"}</strong></p></body></html>`;
  downloadFile(html, `${c.firstName}_${c.lastName}_report.html`, "text/html");
};


export const exportPromotionPDF = (p: Promotion, cands: Candidate[]) => {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setTextColor(0, 102, 204);
  doc.text("CareerHub — Promotion Report", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated ${formatDate(new Date().toISOString())}`, 14, 26);
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text(`${p.id} — ${p.name}`, 14, 38);
  doc.setFontSize(10);
  doc.text(`Period: ${formatDate(p.startDate)} → ${formatDate(p.endDate)}`, 14, 45);

  const visibleCandidates = cands.filter((c) => c.status !== "Dismissed" && c.status !== "Terminated");

  autoTable(doc, {
    startY: 52,
    head: [["KPI", "Value"]],
    body: [
      ["Total Candidates", visibleCandidates.length.toString()],
      ["Pass Rate", `${passRate(visibleCandidates)}%`],
      ["Turnover Rate", `${turnoverRate(visibleCandidates)}%`],
    ],
    headStyles: { fillColor: [0, 102, 204] },
  });

  const rankMap = buildPromotionRankMap(visibleCandidates);
  const categoryGroups = categoryOrder.map((category) => ({
    category,
    items: visibleCandidates
      .filter((c) => categoryFor(overallAverage(c)) === category)
      .sort((a, b) => overallAverage(b) - overallAverage(a) || `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
  }));

  const categoryLightRgb = (cat: Category): [number, number, number] => {
    if (cat === 'Excellent') return [209, 250, 229];
    if (cat === 'Good')      return [219, 234, 254];
    if (cat === 'Passable')  return [254, 243, 199];
    return [254, 226, 226]; // Critical
  };

  const bodyRows: any[] = [];
  categoryGroups.forEach(group => {
    if (group.items.length === 0) return;
    const lightRgb = categoryLightRgb(group.category);
    const darkRgb  = categoryRgb(group.category);
    group.items.forEach((c, index) => {
      const rawRow = promotionCandidateRow(c, rankMap.get(c.id) ?? 0);
      if (index === 0) {
        rawRow[0] = {
          content: group.category,
          rowSpan: group.items.length,
          styles: { fillColor: darkRgb || undefined, textColor: 255, fontStyle: 'bold', valign: 'middle', halign: 'center' }
        } as any;
        // colour remaining cells lightly
        const styledRow = rawRow.map((cell: any, ci: number) =>
          ci === 0 ? cell : { content: cell, styles: { fillColor: lightRgb } }
        );
        bodyRows.push(styledRow);
      } else {
        rawRow.shift();
        const styledRow = rawRow.map((cell: any) => ({ content: cell, styles: { fillColor: lightRgb } }));
        bodyRows.push(styledRow);
      }
    });
  });

  let y = (doc as any).lastAutoTable.finalY + 8;
  const groupHead = [
    { content: 'Category' },
    { content: 'Name' },
    { content: 'Discipline', colSpan: 4, styles: { halign: 'center' } },
    { content: 'Work Skills', colSpan: 6, styles: { halign: 'center' } },
    { content: 'Avg /5' },
    { content: 'Classement' },
  ];
  const subHead = [
    'Category', 'Name',
    'Discipline', 'Motivation', 'Communication', 'Listening',
    'Initiative', 'Analysis', 'Organization', 'Intellectual', 'Pace', 'Speed',
    'Avg /5', 'Classement',
  ];

  autoTable(doc, {
    startY: y,
    head: [groupHead as any, subHead as any],
    body: bodyRows,
    headStyles: { fillColor: [0, 102, 204], textColor: 255 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      1: { cellWidth: 40 },
      12: { halign: 'center' },
      13: { halign: 'center' },
    }
  });

  // Color legend
  let legendY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.text('Color Legend:', 14, legendY);
  legendY += 6;
  const legendItems: { cat: Category; label: string }[] = [
    { cat: 'Excellent', label: 'Excellent  — Avg ≥ 4.5' },
    { cat: 'Good',      label: 'Good       — Avg ≥ 3.5' },
    { cat: 'Passable',  label: 'Passable   — Avg ≥ 2.5' },
    { cat: 'Critical',  label: 'Critical   — Avg < 2.5' },
  ];
  legendItems.forEach(({ cat, label }) => {
    const rgb = categoryRgb(cat);
    if (rgb) {
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(14, legendY - 4, 8, 5, 1, 1, 'F');
    }
    doc.setTextColor(30);
    doc.setFontSize(9);
    doc.text(label, 26, legendY);
    legendY += 7;
  });

  doc.save(`${p.id}_promotion_report.pdf`);
};

export const exportPromotionExcel = (p: Promotion, cands: Candidate[]) => {
  const wb = XLSX.utils.book_new();
  const visibleCandidates = cands.filter((c) => c.status !== "Dismissed" && c.status !== "Terminated");
  const rankMap = buildPromotionRankMap(visibleCandidates);
  const categoryGroups = categoryOrder.map((category) => ({
    category,
    items: visibleCandidates
      .filter((c) => categoryFor(overallAverage(c)) === category)
      .sort((a, b) => overallAverage(b) - overallAverage(a) || `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
  }));
  const allItems = categoryGroups.flatMap(g => g.items);

  const rows: any[][] = [
    ["CareerHub Promotion Report"],
    [],
    ["Promotion ID", p.id],
    ["Name", p.name],
    ["Start Date", formatDate(p.startDate)],
    ["End Date", formatDate(p.endDate)],
    ["Total Candidates", visibleCandidates.length],
    ["Pass Rate", `${passRate(visibleCandidates)}%`],
    ["Turnover Rate", `${turnoverRate(visibleCandidates)}%`],
    [],
  ];

  const groupHeaderRow = [
    '', '', 'Discipline', '', '', '', 'Work Skills', '', '', '', '', '', '', ''
  ];
  const headerRow = [
    "Category", "Name",
    "Discipline", "Motivation", "Communication", "Listening",
    "Initiative", "Analysis", "Organisation", "Intellectual", "Pace", "Speed",
    "Avg /5", "Classement",
  ];

  rows.push(groupHeaderRow);
  rows.push(headerRow);
  allItems.forEach((c) => rows.push(promotionCandidateRow(c, rankMap.get(c.id) ?? 0)));

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const merges: any[] = [];
  merges.push({ s: { r: 10, c: 2 }, e: { r: 10, c: 5 } });
  merges.push({ s: { r: 10, c: 6 }, e: { r: 10, c: 11 } });
  
  let currentRowMerge = 12;
  categoryGroups.forEach(group => {
    if (group.items.length === 0) return;
    if (group.items.length > 1) {
      merges.push({ s: { r: currentRowMerge, c: 0 }, e: { r: currentRowMerge + group.items.length - 1, c: 0 } });
    }
    currentRowMerge += group.items.length;
  });
  
  ws['!merges'] = merges;

  for (const key in ws) {
    if (key[0] === "!") continue;
    ws[key].s = {
      font: { name: "Arial", sz: 10 },
      alignment: { vertical: "center", horizontal: "left" },
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } },
      },
    };
  }

  const titleStyle = { font: { name: "Arial", sz: 16, bold: true, color: { rgb: "0066CC" } }, alignment: { vertical: "center" } };
  const summaryLabel = { font: { name: "Arial", sz: 10, bold: true }, fill: { fgColor: { rgb: "F1F5F9" } } };
  const headerStyle = {
    font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "0066CC" } },
    alignment: { vertical: "center", horizontal: "center" },
  };

  if (ws["A1"]) ws["A1"].s = titleStyle;
  for (let r = 2; r <= 8; r++) {
    const ref = XLSX.utils.encode_cell({ c: 0, r });
    if (ws[ref]) ws[ref].s = { ...ws[ref].s, ...summaryLabel };
  }

  for (let c = 0; c < headerRow.length; c++) {
    const ref1 = XLSX.utils.encode_cell({ c, r: 10 });
    const ref2 = XLSX.utils.encode_cell({ c, r: 11 });
    if (ws[ref1]) ws[ref1].s = headerStyle;
    if (ws[ref2]) ws[ref2].s = headerStyle;
  }

  // Light hex fills per category
  const lightHex: Record<string, string> = {
    Excellent: 'D1FAE5',
    Good:      'DBEAFE',
    Passable:  'FEF3C7',
    Critical:  'FEE2E2',
  };

  let currentRow = 12;
  categoryGroups.forEach((group) => {
    if (group.items.length === 0) return;
    const category = group.category;
    const darkHex = categoryHex(category).slice(1).toUpperCase();
    const rowLight = lightHex[category] ?? 'F8FAFC';
    group.items.forEach(() => {
      for (let col = 0; col < headerRow.length; col++) {
        const ref = XLSX.utils.encode_cell({ c: col, r: currentRow });
        if (!ws[ref]) continue;
        if (col === 0) {
          // Category cell — dark background
          ws[ref].s = {
            ...ws[ref].s,
            fill: { fgColor: { rgb: darkHex } },
            font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
            alignment: { vertical: "center", horizontal: "center" }
          };
        } else {
          // Other cells — light background
          ws[ref].s = {
            ...ws[ref].s,
            fill: { fgColor: { rgb: rowLight } },
          };
        }
      }
      currentRow++;
    });
  });

  // Legend rows
  const legendStartRow = currentRow + 1;
  ws[XLSX.utils.encode_cell({ c: 0, r: legendStartRow })] = { v: 'Color Legend', t: 's', s: { font: { bold: true, sz: 11 } } };
  const legendDefs = [
    { cat: 'Excellent', label: 'Excellent — Avg ≥ 4.5 / 5', hex: '10B981', light: 'D1FAE5' },
    { cat: 'Good',      label: 'Good      — Avg ≥ 3.5 / 5', hex: '3B82F6', light: 'DBEAFE' },
    { cat: 'Passable',  label: 'Passable  — Avg ≥ 2.5 / 5', hex: 'F59E0B', light: 'FEF3C7' },
    { cat: 'Critical',  label: 'Critical  — Avg < 2.5 / 5',  hex: 'EF4444', light: 'FEE2E2' },
  ];
  legendDefs.forEach(({ label, hex, light }, i) => {
    const r = legendStartRow + 1 + i;
    const swatch = XLSX.utils.encode_cell({ c: 0, r });
    const text   = XLSX.utils.encode_cell({ c: 1, r });
    ws[swatch] = { v: '  ', t: 's', s: { fill: { fgColor: { rgb: hex } }, font: { color: { rgb: 'FFFFFF' }, bold: true } } };
    ws[text]   = { v: label, t: 's', s: { fill: { fgColor: { rgb: light } }, font: { sz: 10 } } };
  });
  const legendEnd = legendStartRow + 1 + legendDefs.length;
  if (!ws['!ref']) ws['!ref'] = `A1:B${legendEnd}`;
  else {
    const ref = XLSX.utils.decode_range(ws['!ref']);
    if (ref.e.r < legendEnd) { ref.e.r = legendEnd; ws['!ref'] = XLSX.utils.encode_range(ref); }
  }

  ws["!cols"] = [
    { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${p.id}_promotion_report.xlsx`);
};

export const exportPromotionHTML = (p: Promotion, cands: Candidate[]) => {
  const visibleCandidates = cands.filter((c) => c.status !== "Dismissed" && c.status !== "Terminated");
  const rankMap = buildPromotionRankMap(visibleCandidates);
  const categoryGroups = categoryOrder.map((category) => ({
    category,
    items: visibleCandidates
      .filter((c) => categoryFor(overallAverage(c)) === category)
      .sort((a, b) => overallAverage(b) - overallAverage(a) || `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
  }));

  // Light bg color per category
  const catLightBg: Record<string, string> = {
    Excellent: '#D1FAE5',
    Good:      '#DBEAFE',
    Passable:  '#FEF3C7',
    Critical:  '#FEE2E2',
  };

  let htmlRows = "";
  categoryGroups.forEach(group => {
    if (group.items.length === 0) return;
    const cat = group.category;
    const rowBg = catLightBg[cat] ?? '#F8FAFC';
    group.items.forEach((c, index) => {
      const rank = rankMap.get(c.id) ?? 0;
      const avg = overallAverage(c).toFixed(2);
      const catCell = index === 0 
        ? `<td rowspan="${group.items.length}" class="category-td category-${cat}">${cat}</td>`
        : "";
      
      htmlRows += `<tr style="background:${rowBg}">
        ${catCell}
        <td>${c.firstName} ${c.lastName}</td>
        <td>${c.skills.discipline.discipline.toFixed(1)}</td>
        <td>${c.skills.discipline.motivation.toFixed(1)}</td>
        <td>${c.skills.discipline.communication.toFixed(1)}</td>
        <td>${c.skills.discipline.listening.toFixed(1)}</td>
        <td>${c.skills.work.initiative.toFixed(1)}</td>
        <td>${c.skills.work.analysis.toFixed(1)}</td>
        <td>${c.skills.work.organization.toFixed(1)}</td>
        <td>${c.skills.work.intellectual.toFixed(1)}</td>
        <td>${c.skills.work.pace.toFixed(1)}</td>
        <td>${c.skills.work.speed.toFixed(1)}</td>
        <td>${avg}</td>
        <td>${rank}</td>
      </tr>`;
    });
  });

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${p.id} Report</title>
<style>body{font-family:Inter,system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;color:#1E293B}
h1{color:#0066CC}h2{border-bottom:2px solid #0066CC;padding-bottom:6px;margin-top:30px}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}
th,td{padding:8px 10px;border:1px solid #E2E8F0;text-align:left;vertical-align:middle}
th{background:#F8FAFC}
.category-td{color:#FFF;font-weight:bold;text-align:center;}
.category-Excellent{background:#10B981}
.category-Good{background:#3B82F6}
.category-Passable{background:#F59E0B}
.category-Critical{background:#EF4444}
.kpi{display:inline-block;padding:14px 20px;background:#F8FAFC;border-radius:8px;margin:6px;border:1px solid #E2E8F0}
.kpi b{display:block;font-size:24px;color:#0066CC}
.legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px;padding:16px;background:#F8FAFC;border-radius:10px;border:1px solid #E2E8F0}
.legend h3{width:100%;margin:0 0 8px;font-size:14px;color:#1E293B}
.legend-item{display:flex;align-items:center;gap:8px;font-size:13px}
.legend-swatch{width:18px;height:18px;border-radius:4px;flex-shrink:0}
.legend-label b{display:block;font-size:12px}
.legend-label span{font-size:11px;color:#64748B}
</style></head><body>
<h1>CareerHub — Promotion Report</h1><h2>${p.id} · ${p.name}</h2>
<p>${formatDate(p.startDate)} → ${formatDate(p.endDate)}</p>
<div><div class="kpi"><b>${visibleCandidates.length}</b>Candidates</div>
<div class="kpi"><b>${passRate(visibleCandidates)}%</b>Pass Rate</div>
<div class="kpi"><b>${turnoverRate(visibleCandidates)}%</b>Turnover</div></div>

<div class="table-wrap"><table><thead>
<tr>
  <th rowspan="2">Category</th>
  <th rowspan="2">Name</th>
  <th colspan="4" style="text-align:center">Discipline</th>
  <th colspan="6" style="text-align:center">Work Skills</th>
  <th rowspan="2">Avg /5</th>
  <th rowspan="2">Classement</th>
</tr>
<tr>
  <th>Discipline</th>
  <th>Motivation</th>
  <th>Communication</th>
  <th>Listening</th>
  <th>Initiative</th>
  <th>Analysis</th>
  <th>Organization</th>
  <th>Intellectual</th>
  <th>Pace</th>
  <th>Speed</th>
</tr>
</thead><tbody>
  ${htmlRows}
</tbody></table></div>

<div class="legend">
  <h3>Color Legend</h3>
  <div class="legend-item">
    <div class="legend-swatch" style="background:#10B981"></div>
    <div class="legend-label"><b>Excellent</b><span>Overall average ≥ 4.5 / 5</span></div>
  </div>
  <div class="legend-item">
    <div class="legend-swatch" style="background:#3B82F6"></div>
    <div class="legend-label"><b>Good</b><span>Overall average ≥ 3.5 / 5</span></div>
  </div>
  <div class="legend-item">
    <div class="legend-swatch" style="background:#F59E0B"></div>
    <div class="legend-label"><b>Passable</b><span>Overall average ≥ 2.5 / 5</span></div>
  </div>
  <div class="legend-item">
    <div class="legend-swatch" style="background:#EF4444"></div>
    <div class="legend-label"><b>Critical</b><span>Overall average &lt; 2.5 / 5</span></div>
  </div>
</div>
</body></html>`;
  downloadFile(html, `${p.id}_report.html`, "text/html");
};
