import type { Category } from "./types";

export type ExportLocale = "en" | "fr";

/** Module and skill names always stay in French in exported files. */
export const SKILL_NAMES_FR = {
  discipline: "Discipline et ponctualité",
  motivation: "Motivation",
  communication: "Communication",
  listening: "Sens de l'écoute",
  initiative: "Sens de l'initiative",
  analysis: "Capacité d'analyse",
  organization: "Organisation",
  intellectual: "Aptitudes intellectuelles",
  pace: "Rythme d'avancement",
  speed: "Rapidité d'exécution",
} as const;

export const PROMOTION_SKILL_COLUMNS = [
  SKILL_NAMES_FR.discipline,
  SKILL_NAMES_FR.motivation,
  SKILL_NAMES_FR.communication,
  SKILL_NAMES_FR.listening,
  SKILL_NAMES_FR.initiative,
  SKILL_NAMES_FR.analysis,
  SKILL_NAMES_FR.organization,
  SKILL_NAMES_FR.intellectual,
  SKILL_NAMES_FR.pace,
  SKILL_NAMES_FR.speed,
] as const;

export type ExportLabels = ReturnType<typeof getExportLabels>;

const CATEGORY_LABELS: Record<ExportLocale, Record<Category, string>> = {
  en: {
    Excellent: "Excellent",
    Good: "Good",
    Passable: "Passable",
    Critical: "Critical",
  },
  fr: {
    Excellent: "Excellent",
    Good: "Bon",
    Passable: "Passable",
    Critical: "Critique",
  },
};

export const categoryLabel = (category: Category, locale: ExportLocale) =>
  CATEGORY_LABELS[locale][category];

export function getExportLabels(locale: ExportLocale) {
  const en = {
    candidateReportTitle: "CareerHub - Candidate Report",
    promotionReportTitle: "CareerHub - Promotion Report",
    generatedBy: (date: string) => `by CMH Cloud Marketing Hub - Generated ${date}`,
    generated: (date: string) => `Generated ${date}`,
    field: "Field",
    value: "Value",
    email: "Email",
    phone: "Phone",
    recruitmentDate: "Recruitment Date",
    education: "Education",
    diplomaAverage: "Diploma Average",
    promotion: "Promotion",
    status: "Status",
    notProvided: "Not provided",
    module: "Module",
    scoreOutOf20: "Score /20",
    scoreOutOf5: "Score /5",
    workSkillsOutOf5: "Work Skills (/5)",
    disciplineOutOf5: "Discipline (/5)",
    score: "Score",
    skill: "Skill",
    average: "Average",
    modules: "Modules",
    workSkills: "Work Skills",
    discipline: "Discipline",
    skillsAverage: "Skills Average",
    modulesAverage: "Modules Average",
    overallAverage: "Overall Average",
    category: "Category",
    recommendation: "Recommendation",
    pass: "PASS",
    fail: "FAIL",
    personalInfos: "Personal infos",
    modulesSection: "Modules (/20)",
    workSkillsSection: "Work Skills (/5)",
    disciplineSection: "Discipline (/5)",
    name: "Name",
    period: (start: string, end: string) => `Period: ${start} to ${end}`,
    kpi: "KPI",
    totalCandidates: "Total Candidates",
    passRate: "Pass Rate",
    turnoverRate: "Turnover Rate",
    promotionId: "Promotion ID",
    startDate: "Start Date",
    endDate: "End Date",
    avgOutOf5: "Avg /5",
    ranking: "Ranking",
    colorLegend: "Color Legend:",
    candidates: "Candidates",
    turnover: "Turnover",
    legendExcellent: "Overall average >= 4.5 / 5",
    legendGood: "Overall average >= 3.5 / 5",
    legendPassable: "Overall average >= 2.5 / 5",
    legendCritical: "Overall average < 2.5 / 5",
    legendExcellentShort: "Excellent - Avg >= 4.5 / 5",
    legendGoodShort: "Good      - Avg >= 3.5 / 5",
    legendPassableShort: "Passable  - Avg >= 2.5 / 5",
    legendCriticalShort: "Critical  - Avg < 2.5 / 5",
    htmlCandidateTitle: "CareerHub — Candidate Report",
    htmlPromotionTitle: "CareerHub — Promotion Report",
    htmlOverallAverage: "Overall Average:",
    htmlRecommendation: "Recommendation:",
  };

  const fr = {
    candidateReportTitle: "CareerHub - Rapport candidat",
    promotionReportTitle: "CareerHub - Rapport promotion",
    generatedBy: (date: string) => `par CMH Cloud Marketing Hub - Généré le ${date}`,
    generated: (date: string) => `Généré le ${date}`,
    field: "Champ",
    value: "Valeur",
    email: "E-mail",
    phone: "Téléphone",
    recruitmentDate: "Date de recrutement",
    education: "Formation",
    diplomaAverage: "Moyenne du diplôme",
    promotion: "Promotion",
    status: "Statut",
    notProvided: "Non renseigné",
    module: "Module",
    scoreOutOf20: "Note /20",
    scoreOutOf5: "Note /5",
    workSkillsOutOf5: "Compétences professionnelles (/5)",
    disciplineOutOf5: "Discipline (/5)",
    score: "Note",
    skill: "Compétence",
    average: "Moyenne",
    modules: "Modules",
    workSkills: "Compétences professionnelles",
    discipline: "Discipline",
    skillsAverage: "Moyenne compétences",
    modulesAverage: "Moyenne modules",
    overallAverage: "Moyenne globale",
    category: "Catégorie",
    recommendation: "Recommandation",
    pass: "ADMIS",
    fail: "ÉCHEC",
    personalInfos: "Informations personnelles",
    modulesSection: "Modules (/20)",
    workSkillsSection: "Compétences professionnelles (/5)",
    disciplineSection: "Discipline (/5)",
    name: "Nom",
    period: (start: string, end: string) => `Période : ${start} au ${end}`,
    kpi: "Indicateur",
    totalCandidates: "Nombre de candidats",
    passRate: "Taux de réussite",
    turnoverRate: "Taux d'attrition",
    promotionId: "ID promotion",
    startDate: "Date de début",
    endDate: "Date de fin",
    avgOutOf5: "Moy. /5",
    ranking: "Classement",
    colorLegend: "Légende des couleurs :",
    candidates: "Candidats",
    turnover: "Attrition",
    legendExcellent: "Moyenne globale >= 4,5 / 5",
    legendGood: "Moyenne globale >= 3,5 / 5",
    legendPassable: "Moyenne globale >= 2,5 / 5",
    legendCritical: "Moyenne globale < 2,5 / 5",
    legendExcellentShort: "Excellent - Moy. >= 4,5 / 5",
    legendGoodShort: "Bon       - Moy. >= 3,5 / 5",
    legendPassableShort: "Passable  - Moy. >= 2,5 / 5",
    legendCriticalShort: "Critique  - Moy. < 2,5 / 5",
    htmlCandidateTitle: "CareerHub — Rapport candidat",
    htmlPromotionTitle: "CareerHub — Rapport promotion",
    htmlOverallAverage: "Moyenne globale :",
    htmlRecommendation: "Recommandation :",
  };

  return locale === "fr" ? fr : en;
}

export type ExportOptions = { locale?: ExportLocale };

export const resolveExportLocale = (opts?: ExportOptions): ExportLocale =>
  opts?.locale ?? "fr";

/** jsPDF standard fonts only support Latin-1; strip symbols that corrupt PDF text. */
export const pdfSafeText = (text: string) =>
  text
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/[\u2013\u2014]/g, "-");
