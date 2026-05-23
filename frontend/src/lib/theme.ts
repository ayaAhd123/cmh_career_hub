import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
    }),
    { name: "careerhub-theme" },
  ),
);

export const applyTheme = (theme: Theme) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
};

/** Inline script to run before paint and avoid light flash when dark mode is saved. */
export const themeInitScript = `(function(){try{var r=localStorage.getItem("careerhub-theme");if(!r)return;var p=JSON.parse(r);if(p.state&&p.state.theme==="dark")document.documentElement.classList.add("dark")}catch(e){}})();`;
