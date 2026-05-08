import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, format, parseISO } from "date-fns";
import type {
  Candidate,
  ModuleEntry,
  Promotion,
  Skills,
  TestScore,
} from "./types";
import { calcEndDate } from "./calc";

interface State {
  promotions: Promotion[];
  candidates: Candidate[];
  seeded: boolean;

  addPromotion: (data: { name: string; startDate: string }) => Promotion;
  updatePromotion: (id: string, patch: Partial<Promotion>) => void;
  archivePromotion: (id: string) => void;

  addCandidate: (
    data: Omit<
      Candidate,
      "id" | "skills" | "tests" | "modules" | "status" | "archived" | "createdAt" | "history"
    >,
  ) => { ok: boolean; error?: string };
  updateCandidate: (id: string, patch: Partial<Candidate>) => void;
  setSkills: (id: string, skills: Skills) => void;
  addTest: (id: string, test: Omit<TestScore, "id">) => void;
  updateTest: (id: string, testId: string, patch: Partial<TestScore>) => void;
  removeTest: (id: string, testId: string) => void;
  updateModule: (id: string, day: number, patch: Partial<ModuleEntry>) => void;
  changeStatus: (id: string, status: Candidate["status"]) => void;
  archiveCandidate: (id: string) => void;
  restoreCandidate: (id: string) => void;
  hardDeleteCandidate: (id: string) => void;

  resetSeed: () => void;
}

const generatePromotionId = (existing: Promotion[]): string => {
  const year = new Date().getFullYear();
  const yearPromos = existing.filter((p) => p.id.includes(`PROMO-${year}-`));
  const next = String(yearPromos.length + 1).padStart(3, "0");
  return `PROMO-${year}-${next}`;
};

const buildModules = (startDate: string): ModuleEntry[] => {
  const titles = [
    "Introduction & Onboarding", "Company Culture & Values", "Core Concepts",
    "Foundational Theory", "Theory Recap & Test",
    "Practice Lab 1", "Practice Lab 2", "Practice Lab 3", "Practice Lab 4", "Practice Test 1",
    "Advanced Practice 1", "Advanced Practice 2", "Group Project Kickoff", "Group Project Work", "Mid-Module Review",
    "Real-World Scenarios", "Client Simulation", "Practice Test 2", "Soft Skills Workshop", "Peer Review",
    "Capstone Day 1", "Capstone Day 2", "Capstone Presentation", "Final Test", "Graduation & Feedback",
  ];
  const modules: ModuleEntry[] = [];
  let day = 0;
  for (let i = 0; i < 35 && day < 25; i++) {
    const d = addDays(parseISO(startDate), i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    modules.push({
      day: day + 1,
      date: format(d, "yyyy-MM-dd"),
      title: `Day ${day + 1}: ${titles[day]}`,
      type: day < 5 ? "Theory" : "Practice",
      status: "Not Started",
    });
    day++;
  }
  return modules;
};

const newCandidate = (
  data: Parameters<State["addCandidate"]>[0],
): Candidate => ({
  ...data,
  id: crypto.randomUUID(),
  skills: { communication: 0, technical: 0, teamwork: 0, problemSolving: 0, adaptability: 0 },
  tests: [],
  modules: [],
  status: "Active",
  archived: false,
  createdAt: new Date().toISOString(),
  history: [{ date: new Date().toISOString(), event: "Candidate recruited" }],
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      promotions: [],
      candidates: [],
      seeded: false,

      addPromotion: ({ name, startDate }) => {
        const id = generatePromotionId(get().promotions);
        const p: Promotion = {
          id,
          name,
          startDate,
          endDate: calcEndDate(startDate),
          status: "Active",
          archived: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ promotions: [...s.promotions, p] }));
        return p;
      },

      updatePromotion: (id, patch) =>
        set((s) => ({
          promotions: s.promotions.map((p) =>
            p.id === id
              ? { ...p, ...patch, endDate: patch.startDate ? calcEndDate(patch.startDate) : p.endDate }
              : p,
          ),
        })),

      archivePromotion: (id) =>
        set((s) => ({
          promotions: s.promotions.map((p) =>
            p.id === id ? { ...p, archived: true, status: "Archived" } : p,
          ),
        })),

      addCandidate: (data) => {
        const exists = get().candidates.some(
          (c) => c.email.toLowerCase() === data.email.toLowerCase() && !c.archived,
        );
        if (exists) return { ok: false, error: "Email already exists" };
        const promo = get().promotions.find((p) => p.id === data.promotionId);
        const c = newCandidate(data);
        if (promo) c.modules = buildModules(promo.startDate);
        set((s) => ({ candidates: [...s.candidates, c] }));
        return { ok: true };
      },

      updateCandidate: (id, patch) =>
        set((s) => ({
          candidates: s.candidates.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      setSkills: (id, skills) =>
        set((s) => ({
          candidates: s.candidates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  skills,
                  history: [
                    ...c.history,
                    { date: new Date().toISOString(), event: "Skills updated" },
                  ],
                }
              : c,
          ),
        })),

      addTest: (id, test) =>
        set((s) => ({
          candidates: s.candidates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  tests: [...c.tests, { ...test, id: crypto.randomUUID() }],
                  history: [
                    ...c.history,
                    {
                      date: new Date().toISOString(),
                      event: `Test "${test.name}" scored ${test.score}/20`,
                    },
                  ],
                }
              : c,
          ),
        })),

      updateTest: (id, testId, patch) =>
        set((s) => ({
          candidates: s.candidates.map((c) =>
            c.id === id
              ? { ...c, tests: c.tests.map((t) => (t.id === testId ? { ...t, ...patch } : t)) }
              : c,
          ),
        })),

      removeTest: (id, testId) =>
        set((s) => ({
          candidates: s.candidates.map((c) =>
            c.id === id ? { ...c, tests: c.tests.filter((t) => t.id !== testId) } : c,
          ),
        })),

      updateModule: (id, day, patch) =>
        set((s) => ({
          candidates: s.candidates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  modules: c.modules.map((m) => (m.day === day ? { ...m, ...patch } : m)),
                }
              : c,
          ),
        })),

      changeStatus: (id, status) =>
        set((s) => ({
          candidates: s.candidates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status,
                  statusChangedAt: new Date().toISOString(),
                  history: [
                    ...c.history,
                    { date: new Date().toISOString(), event: `Status changed to ${status}` },
                  ],
                }
              : c,
          ),
        })),

      archiveCandidate: (id) =>
        set((s) => ({
          candidates: s.candidates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  archived: true,
                  archivedAt: new Date().toISOString(),
                  status: "Archived",
                  history: [
                    ...c.history,
                    { date: new Date().toISOString(), event: "Candidate archived" },
                  ],
                }
              : c,
          ),
        })),

      restoreCandidate: (id) =>
        set((s) => ({
          candidates: s.candidates.map((c) =>
            c.id === id ? { ...c, archived: false, status: "Active" } : c,
          ),
        })),

      hardDeleteCandidate: (id) =>
        set((s) => ({ candidates: s.candidates.filter((c) => c.id !== id) })),

      resetSeed: () => set({ promotions: [], candidates: [], seeded: false }),
    }),
    { name: "nexushr-store" },
  ),
);
