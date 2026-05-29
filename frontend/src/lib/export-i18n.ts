import type { CandidateStatus, Category } from "./types";

export type ExportLocale = "en" | "fr";

const strings = {
  en: {
    sheetName: "Candidates",
    allCandidates: "All Candidates",
    graduates: "Graduates",
    exportedMeta: (date: string) =>
      `Exported ${date} · Grouped by promotion · Cloud Marketing Hub`,
    promoTitle: (name: string, count: number) =>
      `${name} (${count} candidate${count === 1 ? "" : "s"})`,
    headers: [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Gender",
      "Age",
      "Education",
      "Diploma Name",
      "Diploma Avg",
      "Status",
      "Avg Score",
      "Category",
      "Recruitment Date",
    ],
    unassigned: "Unassigned",
    status: {
      Active: "Active",
      Graduated: "Graduated",
      Dismissed: "Dismissed",
      Terminated: "Terminated",
      Archived: "Archived",
    } satisfies Record<CandidateStatus, string>,
    category: {
      Excellent: "Excellent",
      Good: "Good",
      Passable: "Passable",
      Critical: "Critical",
    } satisfies Record<Category, string>,
    gender: {
      Homme: "Male",
      Femme: "Female",
    },
  },
  fr: {
    sheetName: "Candidats",
    allCandidates: "Tous les candidats",
    graduates: "Diplômés",
    exportedMeta: (date: string) =>
      `Exporté le ${date} · Regroupé par promotion · Cloud Marketing Hub`,
    promoTitle: (name: string, count: number) =>
      `${name} (${count} candidat${count === 1 ? "" : "s"})`,
    headers: [
      "Prénom",
      "Nom",
      "E-mail",
      "Téléphone",
      "Genre",
      "Âge",
      "Formation",
      "Intitulé du diplôme",
      "Moy. diplôme",
      "Statut",
      "Moy. score",
      "Catégorie",
      "Date de recrutement",
    ],
    unassigned: "Non assigné",
    status: {
      Active: "Actif",
      Graduated: "Diplômé",
      Dismissed: "Exclu",
      Terminated: "Résilié",
      Archived: "Archivé",
    } satisfies Record<CandidateStatus, string>,
    category: {
      Excellent: "Excellent",
      Good: "Bien",
      Passable: "Passable",
      Critical: "Critique",
    } satisfies Record<Category, string>,
    gender: {
      Homme: "Homme",
      Femme: "Femme",
    },
  },
} as const;

export function getExportStrings(locale: ExportLocale) {
  return strings[locale] ?? strings.en;
}

export function genderExportLabel(gender: string, locale: ExportLocale): string {
  const labels = strings[locale]?.gender ?? strings.en.gender;
  return labels[gender as keyof typeof labels] ?? gender;
}

/** English UI label for stored Homme/Femme values */
export function formatGenderDisplay(gender: string): string {
  return genderExportLabel(gender, "en");
}

export function normalizeExportLocale(locale?: string): ExportLocale {
  return locale === "fr" ? "fr" : "en";
}
