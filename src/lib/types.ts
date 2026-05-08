export type Category = "Excellent" | "Good" | "Passable" | "Critical";
export type CandidateStatus = "Active" | "Graduated" | "Dismissed" | "Terminated" | "Archived";
export type PromotionStatus = "Active" | "Completed" | "Archived";
export type EducationLevel = "Bac" | "Bac+2" | "Bac+3" | "Bac+5" | "Bac+8";
export type ModuleStatus = "Not Started" | "In Progress" | "Completed" | "Holiday";

export interface Skills {
  communication: number;
  technical: number;
  teamwork: number;
  problemSolving: number;
  adaptability: number;
}

export interface TestScore {
  id: string;
  name: string;
  score: number;
  date: string;
}

export interface ModuleEntry {
  day: number;
  date: string;
  title: string;
  type: "Theory" | "Practice";
  status: ModuleStatus;
  score?: number;
  participation?: number;
  discipline?: number;
  notes?: string;
}

export interface Candidate {
  id: string;
  promotionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  recruitmentDate: string;
  photo?: string;
  educationLevel: EducationLevel;
  diplomaName: string;
  diplomaAverage: number;
  skills: Skills;
  tests: TestScore[];
  modules: ModuleEntry[];
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
