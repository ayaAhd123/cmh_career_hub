<<<<<<< HEAD
export type Category = "Excellent" | "Good" | "Passable" | "Critical";
export type CandidateStatus = "Active" | "Graduated" | "Dismissed" | "Terminated" | "Archived";
export type PromotionStatus = "Active" | "Completed" | "Archived";
export type EducationLevel = "Bac+2" | "Bac+3" | "Bac+5" | "Bac+8";
export type TimeRange = "all" | "today" | "yesterday" | "current_week" | "last_week" | "current_month" | "last_month" | "current_year" | "last_year" | "custom";

export const MODULE_NAMES = [
  "Notions en Email Marketing",
  "Composants de l'Email",
  "CPA (Cost Per Action)",
  "Authentification de l'Email",
  "Délivrabilité de l'Email",
] as const;

export interface DisciplineSkills {
  discipline: number;   // Discipline et ponctualité
  motivation: number;
  communication: number;
  listening: number;    // Sens de l'écoute
}

export interface WorkSkills {
  initiative: number;     // Sens de l'initiative
  analysis: number;       // Capacité d'analyse
  organization: number;
  intellectual: number;   // Aptitudes intellectuelles
  pace: number;           // Rythme d'avancement
  speed: number;          // Rapidité d'exécution
}

export interface Skills {
  discipline: DisciplineSkills;
  work: WorkSkills;
}

export interface ModuleScore {
  id: number;       // 1..5
  name: string;
  score: number;    // /20
}

export type Gender = "Homme" | "Femme";

export interface Candidate {
  id: string;
  promotionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  recruitmentDate: string;
  age: number | string;
  gender: Gender | string;
  photo?: string;
  educationLevel: EducationLevel | string;
  diplomaName: string;
  diplomaAverage: number | string;
  skills: Skills;
  modules: ModuleScore[];
  status: CandidateStatus;
  statusChangedAt?: string;
  archived: boolean;
  archivedAt?: string;
  createdAt: string;
  history: { date: string; event: string }[];
}

export interface Promotion {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  archived: boolean;
  createdAt: string;
}

export const emptySkills = (): Skills => ({
  discipline: { discipline: 0, motivation: 0, communication: 0, listening: 0 },
  work: { initiative: 0, analysis: 0, organization: 0, intellectual: 0, pace: 0, speed: 0 },
});

export const buildModules = (): ModuleScore[] =>
  MODULE_NAMES.map((name, i) => ({ id: i + 1, name, score: 0 }));
=======
export type Category = "Excellent" | "Good" | "Passable" | "Critical";
export type CandidateStatus = "Active" | "Graduated" | "Dismissed" | "Terminated" | "Archived";
export type PromotionStatus = "Active" | "Completed" | "Archived";
export type EducationLevel = "Bac+2" | "Bac+3" | "Bac+5" | "Bac+8";
export type TimeRange = "all" | "today" | "yesterday" | "current_week" | "last_week" | "current_month" | "last_month" | "current_year" | "last_year" | "custom";

export const MODULE_NAMES = [
  "Notions en Email Marketing",
  "Composants de l'Email",
  "CPA (Cost Per Action)",
  "Authentification de l'Email",
  "Délivrabilité de l'Email",
] as const;

export interface DisciplineSkills {
  discipline: number;   // Discipline et ponctualité
  motivation: number;
  communication: number;
  listening: number;    // Sens de l'écoute
}

export interface WorkSkills {
  initiative: number;     // Sens de l'initiative
  analysis: number;       // Capacité d'analyse
  organization: number;
  intellectual: number;   // Aptitudes intellectuelles
  pace: number;           // Rythme d'avancement
  speed: number;          // Rapidité d'exécution
}

export interface Skills {
  discipline: DisciplineSkills;
  work: WorkSkills;
}

export interface ModuleScore {
  id: number;       // 1..5
  name: string;
  score: number;    // /20
}

export type Gender = "Homme" | "Femme";

export interface Candidate {
  id: string;
  promotionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  recruitmentDate: string;
  age: number | string;
  gender: Gender | string;
  photo?: string;
  educationLevel: EducationLevel | string;
  diplomaName: string;
  diplomaAverage: number | string;
  skills: Skills;
  modules: ModuleScore[];
  status: CandidateStatus;
  statusChangedAt?: string;
  archived: boolean;
  archivedAt?: string;
  createdAt: string;
  history: { date: string; event: string }[];
}

export interface Promotion {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  archived: boolean;
  createdAt: string;
}

export const emptySkills = (): Skills => ({
  discipline: { discipline: 0, motivation: 0, communication: 0, listening: 0 },
  work: { initiative: 0, analysis: 0, organization: 0, intellectual: 0, pace: 0, speed: 0 },
});

export const buildModules = (): ModuleScore[] =>
  MODULE_NAMES.map((name, i) => ({ id: i + 1, name, score: 0 }));
>>>>>>> f5378b5081c7b85fe4f26ccb7182c94321541ef9
