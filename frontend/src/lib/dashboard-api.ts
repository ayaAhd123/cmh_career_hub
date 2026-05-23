import { useAuth } from "./auth";
import { apiUrl } from "./api-base";
import type { DashboardStats, TimeRange } from "./types";

export async function fetchDashboardStats(
  timeRange: TimeRange,
  customStart: string,
  customEnd: string,
): Promise<DashboardStats> {
  const token = useAuth.getState().token;
  const params = new URLSearchParams({ timeRange });

  if (timeRange === "custom") {
    if (customStart) params.set("customStart", customStart);
    if (customEnd) params.set("customEnd", customEnd);
  }

  const res = await fetch(apiUrl(`/api/v1/dashboard/stats?${params}`), {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to load dashboard stats");
  }

  return data;
}
