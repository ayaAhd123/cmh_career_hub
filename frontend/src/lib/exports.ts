<<<<<<< HEAD
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import type { Candidate, Promotion } from "./types";
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

  let y = (doc as any).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: y,
    head: [["Discipline (/5)", "Score"]],
    body: disciplineRows(c),
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
    head: [["Module", "Score /20"]],
    body: c.modules.map((m) => [m.name, (m.score || 0).toFixed(2)]),
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
  const wb = XLSX.utils.book_new();
  const info = XLSX.utils.aoa_to_sheet([
    ["CareerHub Candidate Report"],
    [],
    ["Name", `${c.firstName} ${c.lastName}`],
    ["Email", c.email],
    ["Phone", c.phone],
    ["Promotion", promo ? `${promo.id} - ${promo.name}` : ""],
    ["Education", `${c.educationLevel} - ${c.diplomaName}`],
    ["Status", c.status],
    ["Skills Average", `${skillsAvg(c.skills).toFixed(2)}/5`],
    ["Modules Average", `${testsAvg(c.modules).toFixed(2)}/20`],
    ["Overall Average", `${overallAverage(c).toFixed(2)}/5`],
    ["Category", categoryFor(overallAverage(c))],
  ]);
  XLSX.utils.book_append_sheet(wb, info, "Info");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Skill", "Score /5"], ...disciplineRows(c)]), "Discipline");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Skill", "Score /5"], ...workRows(c)]), "Work Skills");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(c.modules), "Modules");
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
<table><tr><th>Email</th><td>${c.email}</td></tr><tr><th>Phone</th><td>${c.phone}</td></tr>
<tr><th>Education</th><td>${c.educationLevel} — ${c.diplomaName}</td></tr>
<tr><th>Promotion</th><td>${promo ? promo.id + " · " + promo.name : "—"}</td></tr>
<tr><th>Status</th><td>${c.status}</td></tr></table>
<h2>Discipline (/5)</h2><table><tr><th>Skill</th><th>Score</th></tr>
${disciplineRows(c).map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</table>
<h2>Work Skills (/5)</h2><table><tr><th>Skill</th><th>Score</th></tr>
${workRows(c).map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</table>
<h2>Modules (/20)</h2><table><tr><th>Module</th><th>Score</th></tr>
${c.modules.map((m) => `<tr><td>${m.name}</td><td>${(m.score || 0).toFixed(2)}</td></tr>`).join("")}
<tr><td><strong>Average</strong></td><td><strong>${testsAvg(c.modules).toFixed(2)}</strong></td></tr></table>
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

  const dismissed = cands.filter((c) => c.status === "Dismissed").length;
  const terminated = cands.filter((c) => c.status === "Terminated").length;

  autoTable(doc, {
    startY: 52,
    head: [["KPI", "Value"]],
    body: [
      ["Total Candidates", cands.length.toString()],
      ["Pass Rate", `${passRate(cands)}%`],
      ["Turnover Rate", `${turnoverRate(cands)}%`],
      ["Dismissed", dismissed.toString()],
      ["Terminated", terminated.toString()],
    ],
    headStyles: { fillColor: [0, 102, 204] },
  });

  const y = (doc as any).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: y,
    head: [["Name", "Email", "Avg /5", "Category", "Status"]],
    body: cands.map((c) => {
      const a = overallAverage(c);
      return [`${c.firstName} ${c.lastName}`, c.email, a.toFixed(2), categoryFor(a), c.status];
    }),
    headStyles: { fillColor: [0, 102, 204] },
    styles: { fontSize: 8 },
  });

  doc.save(`${p.id}_promotion_report.pdf`);
};

export const exportPromotionExcel = (p: Promotion, cands: Candidate[]) => {
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [
    ["CareerHub Promotion Report"],
    [],
    ["Promotion ID", p.id],
    ["Name", p.name],
    ["Start Date", p.startDate],
    ["End Date", p.endDate],
    ["Total Candidates", cands.length],
    ["Pass Rate", `${passRate(cands)}%`],
    ["Turnover Rate", `${turnoverRate(cands)}%`],
    [],
    ["CANDIDATES LIST"],
    [
      "Name",
      "Email",
      "Phone",
      "Education",
      "Skills Avg /5",
      "Modules Avg /20",
      "Overall Avg /5",
      "Category",
      "Status",
    ],
  ];

  cands.forEach((c) => {
    const a = overallAverage(c);
    rows.push([
      `${c.firstName} ${c.lastName}`,
      c.email,
      c.phone,
      c.educationLevel,
      skillsAvg(c.skills).toFixed(2),
      testsAvg(c.modules).toFixed(2),
      a.toFixed(2),
      categoryFor(a),
      c.status,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // Basic styling for all cells
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

  // Specific styles
  const titleStyle = { font: { name: "Arial", sz: 16, bold: true, color: { rgb: "0066CC" } }, alignment: { vertical: "center" } };
  const sectionStyle = { font: { name: "Arial", sz: 12, bold: true }, fill: { fgColor: { rgb: "F8FAFC" } } };
  const labelStyle = { font: { name: "Arial", sz: 10, bold: true }, fill: { fgColor: { rgb: "F1F5F9" } } };
  const headerStyle = {
    font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "0066CC" } },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "0066CC" } },
      bottom: { style: "thin", color: { rgb: "0066CC" } },
      left: { style: "thin", color: { rgb: "0066CC" } },
      right: { style: "thin", color: { rgb: "0066CC" } },
    },
  };

  if (ws["A1"]) ws["A1"].s = titleStyle;
  for (let r = 2; r <= 8; r++) {
    const ref = XLSX.utils.encode_cell({ c: 0, r });
    if (ws[ref]) ws[ref].s = { ...ws[ref].s, ...labelStyle };
  }
  if (ws["A11"]) ws["A11"].s = { ...ws["A11"].s, ...sectionStyle };

  for (let c = 0; c < 9; c++) {
    const ref = XLSX.utils.encode_cell({ c, r: 11 });
    if (ws[ref]) ws[ref].s = headerStyle;
  }

  ws["!cols"] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${p.id}_promotion_report.xlsx`);
};

export const exportPromotionCSV = (p: Promotion, cands: Candidate[]) => {
  const rows = cands.map((c) => {
    const a = overallAverage(c);
    return {
      Name: `${c.firstName} ${c.lastName}`,
      Email: c.email,
      Phone: c.phone,
      Education: c.educationLevel,
      Diploma: c.diplomaName,
      Overall: a.toFixed(2),
      Category: categoryFor(a),
      Status: c.status,
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadFile(csv, `${p.id}_candidates.csv`, "text/csv");
};

export const exportPromotionHTML = (p: Promotion, cands: Candidate[]) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${p.id} Report</title>
<style>body{font-family:Inter,system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;color:#1E293B}
h1{color:#0066CC}table{width:100%;border-collapse:collapse;margin:10px 0}
th,td{padding:8px 12px;border:1px solid #E2E8F0;text-align:left}th{background:#F8FAFC}
.kpi{display:inline-block;padding:14px 20px;background:#F8FAFC;border-radius:8px;margin:6px;border:1px solid #E2E8F0}
.kpi b{display:block;font-size:24px;color:#0066CC}</style></head><body>
<h1>CareerHub — Promotion Report</h1><h2>${p.id} · ${p.name}</h2>
<p>${formatDate(p.startDate)} → ${formatDate(p.endDate)}</p>
<div><div class="kpi"><b>${cands.length}</b>Candidates</div>
<div class="kpi"><b>${passRate(cands)}%</b>Pass Rate</div>
<div class="kpi"><b>${turnoverRate(cands)}%</b>Turnover</div></div>
<table><tr><th>Name</th><th>Email</th><th>Overall</th><th>Category</th><th>Status</th></tr>
${cands
  .map((c) => {
    const a = overallAverage(c);
    return `<tr><td>${c.firstName} ${c.lastName}</td><td>${c.email}</td><td>${a.toFixed(2)}</td><td>${categoryFor(a)}</td><td>${c.status}</td></tr>`;
  })
  .join("")}</table></body></html>`;
  downloadFile(html, `${p.id}_report.html`, "text/html");
};
=======
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

  const dismissed = cands.filter((c) => c.status === "Dismissed").length;
  const terminated = cands.filter((c) => c.status === "Terminated").length;
  const visibleCandidates = cands.filter((c) => c.status !== "Dismissed" && c.status !== "Terminated");

  autoTable(doc, {
    startY: 52,
    head: [["KPI", "Value"]],
    body: [
      ["Total Candidates", visibleCandidates.length.toString()],
      ["Pass Rate", `${passRate(visibleCandidates)}%`],
      ["Turnover Rate", `${turnoverRate(visibleCandidates)}%`],
      ["Dismissed", dismissed.toString()],
      ["Terminated", terminated.toString()],
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

  let y = (doc as any).lastAutoTable.finalY + 8;
  categoryGroups.forEach((group) => {
    if (group.items.length === 0) return;
    const [r, g, b] = categoryRgb(group.category);
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    doc.text(`${group.category} (${group.items.length})`, 14, y);
    y += 6;
    const groupHead = [
      { content: 'Category' },
      { content: 'Name' },
      { content: 'Discipline', colSpan: 4, styles: { halign: 'center' } },
      { content: 'Work Skills', colSpan: 6, styles: { halign: 'center' } },
      { content: 'Avg /5' },
      { content: 'Classement' },
    ];
    const subHead = [
      'Category',
      'Name',
      'Discipline',
      'Motivation',
      'Communication',
      'Listening',
      'Initiative',
      'Analysis',
      'Organization',
      'Intellectual',
      'Pace',
      'Speed',
      'Avg /5',
      'Classement',
    ];

    autoTable(doc, {
      startY: y,
      head: [groupHead as any, subHead as any],
      body: group.items.map((c) => promotionCandidateRow(c, rankMap.get(c.id) ?? 0)),
      headStyles: { fillColor: [r, g, b], textColor: 255 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        1: { cellWidth: 40 },
        12: { halign: 'center' },
        13: { halign: 'center' },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
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

  const headerRow = [
    "Category",
    "Name",
    "Discipline",
    "Motivation",
    "Communication",
    "Listening",
    "Initiative",
    "Analysis",
    "Organisation",
    "Intellectual",
    "Pace",
    "Speed",
    "Avg /5",
    "Classement",
  ];

  categoryGroups.forEach((group) => {
    if (!group.items.length) return;
    // add a group label row and a grouped header row (Discipline / Work Skills)
    const groupLabelRow = [ `${group.category} (${group.items.length})` ];
    const groupHeaderRow = [
      '',
      '',
      'Discipline', '', '', '',
      'Work Skills', '', '', '', '', '',
      '',
      '',
    ];
    rows.push(groupLabelRow);
    rows.push(groupHeaderRow);
    rows.push(headerRow);
    group.items.forEach((c) => rows.push(promotionCandidateRow(c, rankMap.get(c.id) ?? 0)));
    rows.push([]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

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
  const categoryStyle = { font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } } };
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

  let currentRow = 10;
  categoryGroups.forEach((group) => {
    if (!group.items.length) return;
    const categoryCell = XLSX.utils.encode_cell({ c: 0, r: currentRow });
    if (ws[categoryCell]) {
      ws[categoryCell].s = {
        ...ws[categoryCell].s,
        ...categoryStyle,
        fill: { fgColor: { rgb: categoryHex(group.category).slice(1).toUpperCase() } },
      };
    }
    currentRow += 1;

    for (let c = 0; c < headerRow.length; c++) {
      const ref = XLSX.utils.encode_cell({ c, r: currentRow });
      if (ws[ref]) ws[ref].s = headerStyle;
    }
    currentRow += group.items.length + 2;
  });

  ws["!cols"] = Array(headerRow.length).fill({ wch: 14 });
  ws["!cols"][0] = { wch: 12 }; // Category
  ws["!cols"][1] = { wch: 30 }; // Name
  ws["!cols"][2] = { wch: 12 };
  ws["!cols"][3] = { wch: 12 };
  ws["!cols"][4] = { wch: 12 };
  ws["!cols"][5] = { wch: 12 };
  ws["!cols"][6] = { wch: 12 };
  ws["!cols"][7] = { wch: 12 };
  ws["!cols"][8] = { wch: 14 };
  ws["!cols"][9] = { wch: 14 };
  ws["!cols"][10] = { wch: 10 };
  ws["!cols"][11] = { wch: 10 };
  ws["!cols"][12] = { wch: 10 };
  ws["!cols"][13] = { wch: 12 };

  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${p.id}_promotion_report.xlsx`);
};

export const exportPromotionCSV = (p: Promotion, cands: Candidate[]) => {
  const visibleCandidates = cands.filter((c) => c.status !== "Dismissed" && c.status !== "Terminated");
  const rankMap = buildPromotionRankMap(visibleCandidates);
  const categoryGroups = categoryOrder.map((category) => ({
    category,
    items: [...visibleCandidates]
      .filter((c) => categoryFor(overallAverage(c)) === category)
      .sort((a, b) => overallAverage(b) - overallAverage(a) || `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
  }));

  const rows: any[][] = [];
  const headerRow = [
    "Category",
    "Name",
    "Discipline",
    "Motivation",
    "Communication",
    "Listening",
    "Initiative",
    "Analysis",
    "Organization",
    "Intellectual",
    "Pace",
    "Speed",
    "Avg /5",
    "Classement",
  ];

  categoryGroups.forEach((group) => {
    if (!group.items.length) return;
    rows.push([`${group.category} (${group.items.length})`]);
    rows.push(headerRow);
    group.items.forEach((c) => {
      const avg = overallAverage(c).toFixed(2);
      rows.push([
        categoryFor(parseFloat(avg)),
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
        avg,
        rankMap.get(c.id) ?? "",
      ]);
    });
    rows.push([]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadFile(csv, `${p.id}_candidates.csv`, "text/csv");
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

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${p.id} Report</title>
<style>body{font-family:Inter,system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;color:#1E293B}
h1{color:#0066CC}h2{border-bottom:2px solid #0066CC;padding-bottom:6px;margin-top:30px}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}
th,td{padding:8px 10px;border:1px solid #E2E8F0;text-align:left;vertical-align:middle}
th{background:#F8FAFC}
.category-heading{padding:12px 14px;color:#FFF;border-radius:6px;margin-top:24px;display:inline-block}
.category-Excellent{background:#10B981}
.category-Good{background:#3B82F6}
.category-Passable{background:#F59E0B}
.category-Critical{background:#EF4444}
.kpi{display:inline-block;padding:14px 20px;background:#F8FAFC;border-radius:8px;margin:6px;border:1px solid #E2E8F0}
.kpi b{display:block;font-size:24px;color:#0066CC}
</style></head><body>
<h1>CareerHub — Promotion Report</h1><h2>${p.id} · ${p.name}</h2>
<p>${formatDate(p.startDate)} → ${formatDate(p.endDate)}</p>
<div><div class="kpi"><b>${cands.length}</b>Candidates</div>
<div class="kpi"><b>${passRate(cands)}%</b>Pass Rate</div>
<div class="kpi"><b>${turnoverRate(cands)}%</b>Turnover</div></div>
${categoryGroups
  .map((group) => {
    if (group.items.length === 0) return "";
    return `
    <div class="category-heading category-${group.category}">${group.category} (${group.items.length})</div>
    <div class="table-wrap"><table><thead>
    <tr>
      <th rowspan="2">Category</th>
      <th rowspan="2">Name</th>
      <th colspan="4">Discipline</th>
      <th colspan="6">Work Skills</th>
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
      ${group.items
        .map((c) => {
          const rank = rankMap.get(c.id) ?? 0;
          const avg = overallAverage(c).toFixed(2);
          return `<tr>
            <td>${categoryFor(parseFloat(avg))}</td>
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
        })
        .join("")}
    </tbody></table></div>`;
  })
  .join("")}
</body></html>`;
  downloadFile(html, `${p.id}_report.html`, "text/html");
};
>>>>>>> f5378b5081c7b85fe4f26ccb7182c94321541ef9
