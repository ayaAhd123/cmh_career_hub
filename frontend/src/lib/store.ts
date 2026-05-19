import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Candidate,
  ModuleScore,
  Promotion,
  Skills,
  TimeRange,
} from "./types";
import { buildModules, emptySkills } from "./types";
import { calcEndDate } from "./calc";

interface State {
  promotions: Promotion[];
  candidates: Candidate[];
  seeded: boolean;

  globalTimeRange: TimeRange;
  globalCustomStart: string;
  globalCustomEnd: string;
  setGlobalTimeRange: (range: TimeRange) => void;
  setGlobalCustomStart: (date: string) => void;
  setGlobalCustomEnd: (date: string) => void;
  clearGlobalFilters: () => void;

  addPromotion: (data: { name: string; startDate: string }) => Promotion;
  updatePromotion: (id: string, patch: Partial<Promotion>) => void;
  archivePromotion: (id: string) => void;
  deletePromotion: (id: string) => void;

  addCandidate: (
    data: Omit<
      Candidate,
      "id" | "skills" | "modules" | "status" | "archived" | "createdAt" | "history"
    >,
  ) => { ok: boolean; error?: string };
  updateCandidate: (id: string, patch: Partial<Candidate>) => void;
  setSkills: (id: string, skills: Skills) => void;
  updateModuleScore: (id: string, moduleId: number, score: number) => void;
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

const newCandidate = (
  data: Parameters<State["addCandidate"]>[0],
): Candidate => ({
  ...data,
  id: crypto.randomUUID(),
  skills: emptySkills(),
  modules: buildModules(),
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

      globalTimeRange: "all",
      globalCustomStart: "",
      globalCustomEnd: "",

      setGlobalTimeRange: (range) => set({ globalTimeRange: range }),
      setGlobalCustomStart: (date) => set({ globalCustomStart: date }),
      setGlobalCustomEnd: (date) => set({ globalCustomEnd: date }),
      clearGlobalFilters: () => set({ globalTimeRange: "all", globalCustomStart: "", globalCustomEnd: "" }),

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

      deletePromotion: (id) =>
        set((s) => ({
          promotions: s.promotions.filter((p) => p.id !== id),
          candidates: s.candidates.filter((c) => c.promotionId !== id),
        })),

      addCandidate: (data) => {
        const exists = get().candidates.some(
          (c) => c.email !== "Not provided" && c.email.toLowerCase() === data.email.toLowerCase() && !c.archived,
        );
        if (exists) return { ok: false, error: "Email already exists" };
        const c = newCandidate(data);
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
              ? { ...c, skills, history: [...c.history, { date: new Date().toISOString(), event: "Skills updated" }] }
              : c,
          ),
        })),

      updateModuleScore: (id, moduleId, score) =>
        set((s) => ({
          candidates: s.candidates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  modules: c.modules.map((m: ModuleScore) =>
                    m.id === moduleId ? { ...m, score } : m,
                  ),
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
    { name: "careerhub-store" },
  ),
);
