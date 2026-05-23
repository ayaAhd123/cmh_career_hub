import { useAuth } from "./auth";
import type { ExportLocale } from "./export-i18n";
import type { Candidate, Category, CandidateStatus, EducationLevel, Gender } from "./types";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8000";

export interface CandidateListItem {
  id: string;
  dbId: number;
  promotionId: string;
  promotionName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  recruitmentDate: string;
  age: number | null;
  gender: Gender | string;
  photo?: string;
  educationLevel: EducationLevel | string;
  diplomaName: string;
  diplomaAverage: number | string | null;
  status: CandidateStatus;
  avgScore: number;
  category: Category;
  archived: boolean;
  createdAt: string;
}

export interface CandidateFilters {
  q?: string;
  status?: string;
  gender?: string;
  education_level?: string;
  category?: string;
  promotion_id?: string;
  sort?: string;
}

interface CandidateListResponse {
  data: CandidateListItem[];
  meta: { total: number };
}

const authHeaders = (): HeadersInit => {
  const token = useAuth.getState().token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export async function fetchCandidates(
  filters: CandidateFilters,
): Promise<CandidateListResponse> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "All") params.set(key, value);
  });

  const res = await fetch(`${API_BASE}/api/v1/candidates?${params}`, {
    headers: authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to load candidates");
  }

  return data;
}

export async function updateCandidateApi(
  id: string,
  payload: Partial<Candidate>,
): Promise<CandidateListItem> {
  const res = await fetch(`${API_BASE}/api/v1/candidates/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update candidate");
  }

  return data;
}

export async function deleteCandidateApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/candidates/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify({ confirm: "DELETE" }),
  });

  if (res.status === 204) return;

  const data = await res.json();
  throw new Error(data.message || "Failed to delete candidate");
}

export async function exportCandidatesApi(
  format: "csv" | "json" | "html",
  filters: CandidateFilters,
  lang: ExportLocale = "en",
): Promise<Blob> {
  const params = new URLSearchParams({ format, lang });

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "All") params.set(key, value);
  });

  const res = await fetch(`${API_BASE}/api/v1/candidates/export?${params}`, {
    headers: {
      ...(useAuth.getState().token
        ? { Authorization: `Bearer ${useAuth.getState().token}` }
        : {}),
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to export candidates");
  }

  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
