import { create } from "zustand";
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
import { apiUrl } from "./api-base";

/* ─── API helper ─── */
const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = useAuth.getState().token;
  const res = await fetch(apiUrl(`/api/v1${path}`), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired — sign in again to save to the database.");
    }
    throw new Error(
      (data as { message?: string }).message ||
        JSON.stringify((data as { errors?: unknown }).errors) ||
        `Request failed ${res.status}`,
    );
  }
  return data;
};

const promotionDbId = (promo: Promotion) => promo.dbId ?? promo.id;

/* ─── Types ─── */
interface State {
  promotions: Promotion[];
  archivedPromotions: Promotion[];
  candidates: Candidate[];
  promotionsLoaded: boolean;
  promotionsLoading: boolean;
  archivedPromotionsLoaded: boolean;
  archivedPromotionsLoading: boolean;

  globalTimeRange: TimeRange;
  globalCustomStart: string;
  globalCustomEnd: string;
  setGlobalTimeRange: (range: TimeRange) => void;
  setGlobalCustomStart: (date: string) => void;
  setGlobalCustomEnd: (date: string) => void;
  clearUiFilters: () => void;

  loadPromotions: (opts?: { search?: string }) => Promise<void>;
  loadArchivedPromotions: (opts?: { search?: string }) => Promise<void>;
  addPromotion: (data: { name: string; startDate: string }) => Promise<Promotion>;
  updatePromotion: (id: string, patch: Partial<Promotion>) => Promise<Promotion>;
  archivePromotion: (id: string) => Promise<void>;
  restorePromotion: (id: string) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  permanentDeletePromotion: (id: string) => Promise<void>;

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

  clearUiFilters: () => void;
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

const findPromotion = (get: () => State, id: string) =>
  get().promotions.find((p) => p.id === id) ??
  get().archivedPromotions.find((p) => p.id === id);

export const useStore = create<State>()((set, get) => ({
  promotions: [],
  archivedPromotions: [],
  candidates: [],
  promotionsLoaded: false,
  promotionsLoading: false,
  archivedPromotionsLoaded: false,
  archivedPromotionsLoading: false,

  globalTimeRange: "all",
  globalCustomStart: "",
  globalCustomEnd: "",

  setGlobalTimeRange: (range) => set({ globalTimeRange: range }),
  setGlobalCustomStart: (date) => set({ globalCustomStart: date }),
  setGlobalCustomEnd: (date) => set({ globalCustomEnd: date }),
  clearGlobalFilters: () =>
    set({ globalTimeRange: "all", globalCustomStart: "", globalCustomEnd: "" }),

  loadPromotions: async (opts) => {
    const search = opts?.search?.trim() ?? "";
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    set({ promotionsLoading: true });
    try {
      const data = await apiFetch(`/promotions${params}`);
      set({ promotions: data, promotionsLoaded: true });
    } catch (err) {
      console.error("Failed to load promotions", err);
      throw err;
    } finally {
      set({ promotionsLoading: false });
    }
  },

  loadArchivedPromotions: async (opts) => {
    const search = opts?.search?.trim() ?? "";
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    set({ archivedPromotionsLoading: true });
    try {
      const data = await apiFetch(`/promotions/archived/list${params}`);
      set({ archivedPromotions: data, archivedPromotionsLoaded: true });
    } catch (err) {
      console.error("Failed to load archived promotions", err);
      throw err;
    } finally {
      set({ archivedPromotionsLoading: false });
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
    set((s) => ({ promotions: [p, ...s.promotions] }));
    return p;
  },

  updatePromotion: async (id, patch) => {
    const promo = findPromotion(get, id);
    if (!promo) throw new Error("Promotion not found");

    const body: Record<string, string> = {};
    if (patch.name) body.name = patch.name;
    if (patch.startDate) {
      body.start_date = patch.startDate;
      body.end_date = calcEndDate(patch.startDate);
    }
    if (patch.status) body.status = patch.status;

    const updated: Promotion = await apiFetch(`/promotions/${promotionDbId(promo)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    set((s) => ({
      promotions: s.promotions.map((p) => (p.id === id ? updated : p)),
      archivedPromotions: s.archivedPromotions.map((p) => (p.id === id ? updated : p)),
    }));
    return updated;
  },

  archivePromotion: async (id) => {
    const promo = findPromotion(get, id);
    if (!promo) return;

    await apiFetch(`/promotions/${promotionDbId(promo)}/archive`, {
      method: "POST",
      body: JSON.stringify({ confirm_one: true, confirm_two: true }),
    });

    set((s) => ({
      promotions: s.promotions.filter((p) => p.id !== id),
    }));
    await get().loadArchivedPromotions();
  },

  restorePromotion: async (id) => {
    const promo = findPromotion(get, id);
    if (!promo) return;

    const restored: Promotion = await apiFetch(`/promotions/${promotionDbId(promo)}/restore`, {
      method: "POST",
    });

    set((s) => ({
      archivedPromotions: s.archivedPromotions.filter((p) => p.id !== id),
      promotions: [restored, ...s.promotions.filter((p) => p.id !== id)],
    }));
  },

  deletePromotion: async (id) => {
    const promo = findPromotion(get, id);
    if (!promo) return;

    await apiFetch(`/promotions/${promotionDbId(promo)}`, { method: "DELETE" });

    set((s) => ({
      promotions: s.promotions.filter((p) => p.id !== id),
    }));
    await get().loadArchivedPromotions();
  },

  permanentDeletePromotion: async (id) => {
    const promo = findPromotion(get, id);
    if (!promo) return;

    await apiFetch(`/promotions/${promotionDbId(promo)}/force-delete`, {
      method: "DELETE",
      body: JSON.stringify({ confirm_one: true, confirm_two: true }),
    });

    set((s) => ({
      archivedPromotions: s.archivedPromotions.filter((p) => p.id !== id),
      candidates: s.candidates.filter((c) => c.promotionId !== id),
    }));
  },

  addCandidate: (data) => {
    const exists = get().candidates.some(
      (c) =>
        c.email !== "Not provided" &&
        c.email.toLowerCase() === data.email.toLowerCase() &&
        !c.archived,
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
          ? {
              ...c,
              skills,
              history: [...c.history, { date: new Date().toISOString(), event: "Skills updated" }],
            }
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

  clearUiFilters: () =>
    set({
      globalTimeRange: "all",
      globalCustomStart: "",
      globalCustomEnd: "",
    }),
}));
