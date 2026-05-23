import { useAuth } from "./auth";
import { apiUrl } from "./api-base";
import type { Category, Candidate } from "./types";

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

  const res = await fetch(apiUrl(`/api/v1/promotions/${promotionId}/stats`), {
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

export async function fetchPromotionExportCandidates(promotionId: string): Promise<Candidate[]> {
  const token = useAuth.getState().token;

  const res = await fetch(apiUrl(`/api/v1/promotions/${promotionId}/export-data`), {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to load promotion export data");
  }

  return (data.candidates ?? []).map((c: Candidate) => ({
    ...c,
    age: c.age ?? "Not provided",
    diplomaAverage: c.diplomaAverage ?? "Not provided",
  }));
}
