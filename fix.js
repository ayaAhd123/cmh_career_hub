const fs = require('fs');

const code = `
export const exportPromotionPDF = (p: Promotion, cands: Candidate[]) => {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setTextColor(0, 102, 204);
  doc.text("CareerHub — Promotion Report", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(\`Generated \${formatDate(new Date().toISOString())}\`, 14, 26);
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text(\`\${p.id} — \${p.name}\`, 14, 38);
  doc.setFontSize(10);
  doc.text(\`Period: \${formatDate(p.startDate)} → \${formatDate(p.endDate)}\`, 14, 45);

  const visibleCandidates = cands.filter((c) => c.status !== "Dismissed" && c.status !== "Terminated");

  autoTable(doc, {
    startY: 52,
    head: [["KPI", "Value"]],
    body: [
      ["Total Candidates", visibleCandidates.length.toString()],
      ["Pass Rate", \`\${passRate(visibleCandidates)}%\`],
      ["Turnover Rate", \`\${turnoverRate(visibleCandidates)}%\`],
    ],
    headStyles: { fillColor: [0, 102, 204] },
  });

  const rankMap = buildPromotionRankMap(visibleCandidates);
  const categoryGroups = categoryOrder.map((category) => ({
    category,
    items: visibleCandidates
      .filter((c) => categoryFor(overallAverage(c)) === category)
      .sort((a, b) => overallAverage(b) - overallAverage(a) || \`\${a.firstName} \${a.lastName}\`.localeCompare(\`\${b.firstName} \${b.lastName}\`)),
  }));

  const bodyRows: any[] = [];
  categoryGroups.forEach(group => {
    if (group.items.length === 0) return;
    group.items.forEach((c, index) => {
      const row = promotionCandidateRow(c, rankMap.get(c.id) ?? 0);
      if (index === 0) {
        row[0] = {
          content: group.category,
          rowSpan: group.items.length,
          styles: { fillColor: categoryRgb(group.category) || undefined, textColor: 255, fontStyle: 'bold', valign: 'middle', halign: 'center' }
        } as any;
        bodyRows.push(row);
      } else {
        row.shift();
        bodyRows.push(row);
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

  doc.save(\`\${p.id}_promotion_report.pdf\`);
};

export const exportPromotionExcel = (p: Promotion, cands: Candidate[]) => {
  const wb = XLSX.utils.book_new();
  const visibleCandidates = cands.filter((c) => c.status !== "Dismissed" && c.status !== "Terminated");
  const rankMap = buildPromotionRankMap(visibleCandidates);
  const categoryGroups = categoryOrder.map((category) => ({
    category,
    items: visibleCandidates
      .filter((c) => categoryFor(overallAverage(c)) === category)
      .sort((a, b) => overallAverage(b) - overallAverage(a) || \`\${a.firstName} \${a.lastName}\`.localeCompare(\`\${b.firstName} \${b.lastName}\`)),
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
    ["Pass Rate", \`\${passRate(visibleCandidates)}%\`],
    ["Turnover Rate", \`\${turnoverRate(visibleCandidates)}%\`],
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

  let currentRow = 12;
  categoryGroups.forEach((group) => {
    if (group.items.length === 0) return;
    const category = group.category;
    const hex = categoryHex(category).slice(1).toUpperCase();
    group.items.forEach(() => {
      const ref = XLSX.utils.encode_cell({ c: 0, r: currentRow });
      if (ws[ref]) {
        ws[ref].s = {
          ...ws[ref].s,
          fill: { fgColor: { rgb: hex } },
          font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { vertical: "center", horizontal: "center" }
        };
      }
      currentRow++;
    });
  });

  ws["!cols"] = [
    { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, \`\${p.id}_promotion_report.xlsx\`);
};

export const exportPromotionHTML = (p: Promotion, cands: Candidate[]) => {
  const visibleCandidates = cands.filter((c) => c.status !== "Dismissed" && c.status !== "Terminated");
  const rankMap = buildPromotionRankMap(visibleCandidates);
  const categoryGroups = categoryOrder.map((category) => ({
    category,
    items: visibleCandidates
      .filter((c) => categoryFor(overallAverage(c)) === category)
      .sort((a, b) => overallAverage(b) - overallAverage(a) || \`\${a.firstName} \${a.lastName}\`.localeCompare(\`\${b.firstName} \${b.lastName}\`)),
  }));

  let htmlRows = "";
  categoryGroups.forEach(group => {
    if (group.items.length === 0) return;
    const cat = group.category;
    group.items.forEach((c, index) => {
      const rank = rankMap.get(c.id) ?? 0;
      const avg = overallAverage(c).toFixed(2);
      const catCell = index === 0 
        ? \`<td rowspan="\${group.items.length}" class="category-td category-\${cat}">\${cat}</td>\`
        : "";
      
      htmlRows += \`<tr>
        \${catCell}
        <td>\${c.firstName} \${c.lastName}</td>
        <td>\${c.skills.discipline.discipline.toFixed(1)}</td>
        <td>\${c.skills.discipline.motivation.toFixed(1)}</td>
        <td>\${c.skills.discipline.communication.toFixed(1)}</td>
        <td>\${c.skills.discipline.listening.toFixed(1)}</td>
        <td>\${c.skills.work.initiative.toFixed(1)}</td>
        <td>\${c.skills.work.analysis.toFixed(1)}</td>
        <td>\${c.skills.work.organization.toFixed(1)}</td>
        <td>\${c.skills.work.intellectual.toFixed(1)}</td>
        <td>\${c.skills.work.pace.toFixed(1)}</td>
        <td>\${c.skills.work.speed.toFixed(1)}</td>
        <td>\${avg}</td>
        <td>\${rank}</td>
      </tr>\`;
    });
  });

  const html = \`<!doctype html><html><head><meta charset="utf-8"><title>\${p.id} Report</title>
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
</style></head><body>
<h1>CareerHub — Promotion Report</h1><h2>\${p.id} · \${p.name}</h2>
<p>\${formatDate(p.startDate)} → \${formatDate(p.endDate)}</p>
<div><div class="kpi"><b>\${visibleCandidates.length}</b>Candidates</div>
<div class="kpi"><b>\${passRate(visibleCandidates)}%</b>Pass Rate</div>
<div class="kpi"><b>\${turnoverRate(visibleCandidates)}%</b>Turnover</div></div>

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
  \${htmlRows}
</tbody></table></div>
</body></html>\`;
  downloadFile(html, \`\${p.id}_report.html\`, "text/html");
};
`;

fs.appendFileSync('c:/Users/DevMachine/cmh_career_hub/frontend/src/lib/exports.ts', code, 'utf-8');
