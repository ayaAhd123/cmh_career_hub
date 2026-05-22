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
import { useAuth } from "./auth";

/* ─── API helper ─── */
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8000";

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = useAuth.getState().token;
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data.errors) || `Request failed ${res.status}`);
  return data;
};

/* ─── Types ─── */
interface State {
  promotions: Promotion[];
  candidates: Candidate[];
  seeded: boolean;
  promotionsLoaded: boolean;

  globalTimeRange: TimeRange;
  globalCustomStart: string;
  globalCustomEnd: string;
  setGlobalTimeRange: (range: TimeRange) => void;
  setGlobalCustomStart: (date: string) => void;
  setGlobalCustomEnd: (date: string) => void;
  clearGlobalFilters: () => void;

  // Promotions — now async (call API)
  loadPromotions: () => Promise<void>;
  addPromotion: (data: { name: string; startDate: string }) => Promise<Promotion>;
  updatePromotion: (id: string, patch: Partial<Promotion>) => Promise<void>;
  archivePromotion: (id: string) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;

  // Candidates — still local for now
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
      promotionsLoaded: false,

      globalTimeRange: "all",
      globalCustomStart: "",
      globalCustomEnd: "",

      setGlobalTimeRange: (range) => set({ globalTimeRange: range }),
      setGlobalCustomStart: (date) => set({ globalCustomStart: date }),
      setGlobalCustomEnd: (date) => set({ globalCustomEnd: date }),
      clearGlobalFilters: () => set({ globalTimeRange: "all", globalCustomStart: "", globalCustomEnd: "" }),

      /* ─── Promotions (API‑backed) ─── */
      loadPromotions: async () => {
        try {
          const data = await apiFetch("/promotions");
          set({ promotions: data, promotionsLoaded: true });
        } catch (err) {
          console.error("Failed to load promotions", err);
        }
      },

      addPromotion: async ({ name, startDate }) => {
        const endDate = calcEndDate(startDate);
        const p: Promotion = await apiFetch("/promotions", {
          method: "POST",
          body: JSON.stringify({
            name,
            start_date: startDate,
            end_date: endDate,
            status: "Active",
          }),
        });
        set((s) => ({ promotions: [...s.promotions, p] }));
        return p;
      },

      updatePromotion: async (id, patch) => {
        // Find the DB id for this promotion
        const promo = get().promotions.find((p) => p.id === id);
        if (!promo) return;
        const dbId = (promo as any).dbId || id;

        const body: Record<string, string> = {};
        if (patch.name) body.name = patch.name;
        if (patch.startDate) {
          body.start_date = patch.startDate;
          body.end_date = calcEndDate(patch.startDate);
        }
        if (patch.status) body.status = patch.status;

        const updated: Promotion = await apiFetch(`/promotions/${dbId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        set((s) => ({
          promotions: s.promotions.map((p) => (p.id === id ? updated : p)),
        }));
      },

      archivePromotion: async (id) => {
        const promo = get().promotions.find((p) => p.id === id);
        if (!promo) return;
        const dbId = (promo as any).dbId || id;

        const updated: Promotion = await apiFetch(`/promotions/${dbId}`, {
          method: "PUT",
          body: JSON.stringify({ status: "Archived" }),
        });
        set((s) => ({
          promotions: s.promotions.map((p) => (p.id === id ? updated : p)),
        }));
      },

      deletePromotion: async (id) => {
        const promo = get().promotions.find((p) => p.id === id);
        if (!promo) return;
        const dbId = (promo as any).dbId || id;

        await apiFetch(`/promotions/${dbId}`, { method: "DELETE" });
        set((s) => ({
          promotions: s.promotions.filter((p) => p.id !== id),
          candidates: s.candidates.filter((c) => c.promotionId !== id),
        }));
      },

      /* ─── Candidates (still local) ─── */
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

      resetSeed: () => set({ promotions: [], candidates: [], seeded: false, promotionsLoaded: false }),
    }),
    {
      name: "careerhub-store",
      partialize: (state) => ({
        // Only persist candidates & UI filters locally — promotions come from DB
        candidates: state.candidates,
        seeded: state.seeded,
        globalTimeRange: state.globalTimeRange,
        globalCustomStart: state.globalCustomStart,
        globalCustomEnd: state.globalCustomEnd,
      }),
    },
  ),
);
