import { useEffect, useState } from "react";
import { useAuth } from "./auth";

/** Wait for persisted auth on the client before route guards run. */
export const useAuthHydrated = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuth.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuth.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
};
