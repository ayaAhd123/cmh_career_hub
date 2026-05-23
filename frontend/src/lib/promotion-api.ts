import { useAuth } from "./auth";
import type { Category } from "./types";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8000";

export interface PromotionStatsProgress {
  workingDone: number;
  totalWorking: number;
  pct: number;
}

export interface PromotionStatsKpis {
  totalCandidates: number;
  passRate: number;
  avgScore: number;
  atRisk: number;
}

export interface PromotionChartEntry {
  name: string;
  value: number;
}

export interface PromotionScoreEntry {
  name: string;
  count: number;
}

export interface PromotionPerformer {
  id: string;
  firstName: string;
  lastName: string;
  avgScore: number;
  category: Category;
}

export interface PromotionDemographicEntry {
  name: string;
  value: number;
  avg: number;
}

export interface PromotionStats {
  promotion: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    archived: boolean;
  };
  progress: PromotionStatsProgress;
  kpis: PromotionStatsKpis;
  categoryDistribution: PromotionChartEntry[];
  scoreDistribution: PromotionScoreEntry[];
  topPerformers: PromotionPerformer[];
  demographics: {
    gender: PromotionDemographicEntry[];
    education: PromotionDemographicEntry[];
    age: PromotionDemographicEntry[];
  };
}

export async function fetchPromotionStats(promotionId: string): Promise<PromotionStats> {
  const token = useAuth.getState().token;

  const res = await fetch(`${API_BASE}/api/v1/promotions/${promotionId}/stats`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to load promotion stats");
  }

  return data;
}
