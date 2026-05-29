import type { Candidate, Category, DisciplineSkills, ModuleScore, Promotion, Skills, WorkSkills } from "./types";
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, endOfDay } from "date-fns";

export const disciplineAvg = (d: DisciplineSkills): number =>
  (d.discipline + d.motivation + d.communication + d.listening) / 4;

export const workAvg = (w: WorkSkills): number =>
  (w.initiative + w.analysis + w.organization + w.intellectual + w.pace + w.speed) / 6;

export const skillsAvg = (s: Skills): number =>
  (disciplineAvg(s.discipline) + workAvg(s.work)) / 2;

export const testsAvg = (modules: ModuleScore[]): number => {
  const graded = modules.filter((m) => m.hasGrade);
  if (graded.length === 0) return 0;
  return graded.reduce((a, m) => a + m.score, 0) / graded.length;
};

export const overallAverage = (c: Candidate & { avgScore?: number }): number => {
  if (typeof c.avgScore === "number") {
    return c.avgScore;
  }
  const sa = skillsAvg(c.skills); // 0-5
  const ta = testsAvg(c.modules); // 0-20
  return Math.round(((sa + (ta / 4)) / 2) * 100) / 100;
};

export const categoryFor = (avg: number): Category => {
  if (avg >= 4.0) return "Excellent";
  if (avg >= 3.5) return "Good";
  if (avg >= 2.5) return "Passable";
  return "Critical";
};

export const categoryColor = (c: Category) => {
  switch (c) {
    case "Excellent": return "bg-excellent text-white";
    case "Good": return "bg-good text-good-foreground";
    case "Passable": return "bg-passable text-white";
    case "Critical": return "bg-critical text-white";
  }
};

/** True if `dateIso` falls within optional custom start/end (inclusive, local day). */
export const isWithinCustomRange = (
  dateIso: string,
  customStart: string,
  customEnd: string,
): boolean => {
  const date = startOfDay(parseISO(dateIso));
  if (customStart) {
    const start = startOfDay(parseISO(customStart));
    if (date < start) return false;
  }
  if (customEnd) {
    const end = endOfDay(parseISO(customEnd));
    if (date > end) return false;
  }
  return true;
};

export const calcEndDate = (start: string) =>
  format(addDays(parseISO(start), 35), "yyyy-MM-dd");

export const promotionProgress = (p: Promotion) => {
  const totalWorking = 25;
  const start = parseISO(p.startDate);
  const today = new Date();
  const elapsed = Math.max(0, differenceInCalendarDays(today, start));
  const total = 35;
  const workingDone = Math.min(totalWorking, Math.round((elapsed / total) * totalWorking));
  const pct = Math.min(100, Math.round((workingDone / totalWorking) * 100));
  return { workingDone, totalWorking, pct, elapsed, total };
};

/** Prefer status stored in the database; fall back to date-based logic for legacy rows. */
export const promotionStatus = (p: Promotion): Promotion["status"] | "Archived" => {
  if (p.archived) return "Archived";
  if (p.status) return p.status;
  const today = new Date();
  if (parseISO(p.endDate) < today) return "Completed";
  return "Active";
};

export const passRate = (cands: Candidate[]) => {
  const active = cands.filter((c) => !c.archived);
  if (active.length === 0) return 0;
  const passed = active.filter((c) => overallAverage(c) >= 2.5).length;
  return Math.round((passed / active.length) * 100);
};

export const turnoverRate = (cands: Candidate[]) => {
  const active = cands.filter((c) => !c.archived);
  if (active.length === 0) return 0;
  const out = active.filter((c) => c.status === "Dismissed" || c.status === "Terminated").length;
  return Math.round((out / active.length) * 100);
};

export const formatDate = (iso: string) => {
  if (!iso || iso === "Not provided") return "Not provided";
  try {
    return format(parseISO(iso), "dd/MM/yyyy");
  } catch {
    return iso;
  }
};
