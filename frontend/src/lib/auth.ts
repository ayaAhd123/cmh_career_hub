import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AdminProfile {
  name: string;
  email: string;
  password: string;
}

interface AuthState {
  isAuthenticated: boolean;
  profile: AdminProfile;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateProfile: (patch: Partial<Pick<AdminProfile, "name" | "email">>) => void;
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
}

const DEFAULT_PROFILE: AdminProfile = {
  name: "Admin CMH",
  email: "admin@cmh.ma",
  password: "1234",
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      profile: DEFAULT_PROFILE,
      login: (email, password) => {
        const p = get().profile;
        if (email.trim().toLowerCase() === p.email.toLowerCase() && password === p.password) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isAuthenticated: false }),
      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      changePassword: (current, next) => {
        const p = get().profile;
        if (current !== p.password) return { ok: false, error: "Current password incorrect" };
        if (next.length < 4) return { ok: false, error: "Password must be at least 4 characters" };
        set({ profile: { ...p, password: next } });
        return { ok: true };
      },
    }),
    { name: "careerhub-auth" },
  ),
);
