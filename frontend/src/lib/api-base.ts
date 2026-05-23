/**
 * API root URL. In dev, defaults to same-origin so Vite can proxy /api → Laravel.
 * Set VITE_API_BASE_URL in .env when the API runs on another host (e.g. production).
 */
export const API_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  (import.meta.env.DEV ? "" : "http://localhost:8000")
);

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalized}` : normalized;
}
