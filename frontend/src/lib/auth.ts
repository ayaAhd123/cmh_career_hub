import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AdminProfile {
  name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  profile: AdminProfile | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<AdminProfile, "name" | "email">>) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000';

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      profile: null,
      login: async (email, password) => {
        try {
          const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return {
              ok: false,
              error: (data as { message?: string }).message || 'Invalid credentials',
            };
          }
          set({ token: data.token, isAuthenticated: true, profile: data.user });
          return { ok: true };
        } catch (err) {
          console.error('Login failed', err);
          return { ok: false, error: 'Cannot reach the API server' };
        }
      },
      logout: async () => {
        try {
          const token = get().token;
          if (token) {
            await fetch(`${API_BASE}/api/v1/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });
          }
        } catch (err) {
          console.error('Logout failed', err);
        }
        set({ token: null, isAuthenticated: false, profile: null });
      },
      updateProfile: async (patch) => {
        try {
          const token = get().token;
          if (!token) throw new Error('Not authenticated');
          const res = await fetch(`${API_BASE}/api/v1/auth/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(patch),
          });
          if (!res.ok) throw new Error('Failed to update profile');
          const data = await res.json();
          set({ profile: data.user });
        } catch (err) {
          console.error('Update profile failed', err);
          throw err;
        }
      },
      changePassword: async (current, next) => {
        try {
          const token = get().token;
          if (!token) return { ok: false, error: 'Not authenticated' };
          const res = await fetch(`${API_BASE}/api/v1/auth/change-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ current, next }),
          });
          if (res.ok) return { ok: true };
          const data = await res.json();
          return { ok: false, error: data.message || data.errors ? JSON.stringify(data.errors) : 'Failed' };
        } catch (err) {
          console.error('Change password failed', err);
          return { ok: false, error: (err as Error).message };
        }
      },
    }),
    {
      name: "careerhub-auth",
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        profile: state.profile,
      }),
    },
  ),
);

(async () => {
  if (typeof window === "undefined") return;
  try {
    const store = (useAuth as any).getState();
    const token = store.token;
    if (!token) return;

    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      (useAuth as any).setState({ token: null, isAuthenticated: false, profile: null });
      return;
    }

    const data = await res.json();
    (useAuth as any).setState({ isAuthenticated: true, profile: data.user });
  } catch (err) {
    // ignore
  }
})();
