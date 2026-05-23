import { useEffect } from "react";
import { applyTheme, useTheme } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const sync = () => applyTheme(useTheme.getState().theme);
    if (useTheme.persist.hasHydrated()) {
      sync();
      return;
    }
    return useTheme.persist.onFinishHydration(sync);
  }, []);

  return <>{children}</>;
}
