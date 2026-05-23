import { toast } from "sonner";

export function getApiErrorMessage(err: unknown, fallback = "Une erreur est survenue"): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function showApiError(err: unknown, fallback?: string): void {
  toast.error(getApiErrorMessage(err, fallback));
}
