import type { Candidate, Category, Promotion, Skills } from "./types";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

export const skillsAvg = (s: Skills): number =>
  (s.communication + s.technical + s.teamwork + s.problemSolving + s.adaptability) / 5;

export const testsAvg = (tests: { score: number }[]): number =>
  tests.length === 0 ? 0 : tests.reduce((a, t) => a + t.score, 0) / tests.length;

export const overallAverage = (c: Candidate): number => {
  const sa = skillsAvg(c.skills); // 0-5
  const ta = testsAvg(c.tests); // 0-20
  // Formula: (skills_avg × 4 + tests_avg) / 2  -> sa*4 maps 0-5 to 0-20
  return Math.round(((sa * 4 + ta) / 2) * 100) / 100;
};

export const categoryFor = (avg: number): Category => {
  if (avg >= 16) return "Excellent";
  if (avg >= 14) return "Good";
  if (avg >= 10) return "Passable";
  return "Critical";
};

export const categoryColor = (c: Category) => {
  switch (c) {
    case "Excellent":
      return "bg-excellent text-white";
    case "Good":
      return "bg-good text-white";
    case "Passable":
      return "bg-passable text-white";
    case "Critical":
      return "bg-critical text-white";
  }
};

export const calcEndDate = (start: string) =>
  format(addDays(parseISO(start), 35), "yyyy-MM-dd");

export const promotionProgress = (p: Promotion) => {
  const totalWorking = 25;
  // For demo: progress based on calendar days elapsed mapped to 25 working days
  const start = parseISO(p.startDate);
  const today = new Date();
  const elapsed = Math.max(0, differenceInCalendarDays(today, start));
  const total = 35;
  const workingDone = Math.min(totalWorking, Math.round((elapsed / total) * totalWorking));
  const pct = Math.min(100, Math.round((workingDone / totalWorking) * 100));
  return { workingDone, totalWorking, pct, elapsed, total };
};

export const promotionStatus = (p: Promotion): Promotion["status"] => {
  if (p.archived) return "Archived";
  const today = new Date();
  if (parseISO(p.endDate) < today) return "Completed";
  return "Active";
};

export const passRate = (cands: Candidate[]) => {
  const active = cands.filter((c) => !c.archived);
  if (active.length === 0) return 0;
  const passed = active.filter((c) => overallAverage(c) >= 10).length;
  return Math.round((passed / active.length) * 100);
};

export const turnoverRate = (cands: Candidate[]) => {
  const active = cands.filter((c) => !c.archived);
  if (active.length === 0) return 0;
  const out = active.filter((c) => c.status === "Dismissed" || c.status === "Terminated").length;
  return Math.round((out / active.length) * 100);
};

export const formatDate = (iso: string) => format(parseISO(iso), "dd/MM/yyyy");
