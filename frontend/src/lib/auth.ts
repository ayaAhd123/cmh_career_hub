import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiUrl } from "./api-base";

export interface AdminProfile {
  name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  profile: AdminProfile | null;
  /** False until persisted token is validated against the API (or absent). */
  sessionReady: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<AdminProfile, "name" | "email">>) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      profile: null,
      sessionReady: false,
      login: async (email, password) => {
        try {
          const res = await fetch(apiUrl("/api/v1/auth/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return {
              ok: false,
              error: (data as { message?: string }).message || "Invalid credentials",
            };
          }
          set({
            token: data.token,
            isAuthenticated: true,
            profile: data.user,
            sessionReady: true,
          });
          return { ok: true };
        } catch (err) {
          console.error("Login failed", err);
          return { ok: false, error: "Cannot reach the API server" };
        }
      },
      logout: async () => {
        try {
          const token = get().token;
          if (token) {
            await fetch(apiUrl("/api/v1/auth/logout"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
          }
        } catch (err) {
          console.error("Logout failed", err);
        }
        set({ token: null, isAuthenticated: false, profile: null, sessionReady: true });
      },
      updateProfile: async (patch) => {
        try {
          const token = get().token;
          if (!token) throw new Error("Not authenticated");
          const res = await fetch(apiUrl("/api/v1/auth/profile"), {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(patch),
          });
          if (!res.ok) throw new Error("Failed to update profile");
          const data = await res.json();
          set({ profile: data.user });
        } catch (err) {
          console.error("Update profile failed", err);
          throw err;
        }
      },
      changePassword: async (current, next) => {
        try {
          const token = get().token;
          if (!token) return { ok: false, error: "Not authenticated" };
          const res = await fetch(apiUrl("/api/v1/auth/change-password"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ current, next }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            if ((data as { token?: string }).token) {
              set({ token: (data as { token: string }).token });
            }
            return { ok: true };
          }
          const errors = (data as { errors?: Record<string, string[]> }).errors;
          const firstFieldError = errors
            ? Object.values(errors)[0]?.[0]
            : undefined;
          return {
            ok: false,
            error:
              firstFieldError ||
              (data as { message?: string }).message ||
              "Failed to change password",
          };
        } catch (err) {
          console.error("Change password failed", err);
          return { ok: false, error: (err as Error).message };
        }
      },
    }),
    {
      name: "careerhub-auth",
      partialize: (state) => ({ token: state.token }),
    },
  ),
);

const validateStoredSession = async () => {
  if (typeof window === "undefined") return;

  const { token } = useAuth.getState();
  if (!token) {
    useAuth.setState({ sessionReady: true });
    return;
  }

  try {
    const res = await fetch(apiUrl("/api/v1/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      useAuth.setState({
        token: null,
        isAuthenticated: false,
        profile: null,
        sessionReady: true,
      });
      return;
    }

    const data = await res.json();
    useAuth.setState({
      isAuthenticated: true,
      profile: data.user,
      sessionReady: true,
    });
  } catch {
    useAuth.setState({ sessionReady: true });
  }
};

void validateStoredSession();
