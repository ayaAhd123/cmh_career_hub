import { useAuth } from "./auth";
import { apiUrl } from "./api-base";
import type { ExportLocale } from "./export-i18n";
import type {
  Candidate,
  Category,
  CandidateStatus,
  EducationLevel,
  Gender,
  ModuleScore,
  Skills,
} from "./types";

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
  /** graduates = passed or status Graduated; archived = state Archived */
  scope?: "graduates" | "archived";
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

export interface CreateCandidatePayload {
  promotionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  recruitmentDate: string;
  age: number;
  gender: Gender | string;
  educationLevel: EducationLevel | string;
  diplomaName: string;
  diplomaAverage: number;
  photo?: string;
}

export interface CandidateDetail extends CandidateListItem {
  skills: Skills;
  modules: ModuleScore[];
  history: { date: string; event: string }[];
}

async function parseApiResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? "Invalid response from server"
        : `Server error (${res.status}). Check that the API is running.`,
    );
  }
}

export async function fetchCandidateApi(id: string): Promise<CandidateDetail> {
  const res = await fetch(apiUrl(`/api/v1/candidates/${id}`), {
    headers: authHeaders(),
  });

  const data = await parseApiResponse(res);
  if (!res.ok) {
    throw new Error((data.message as string) || "Failed to load candidate");
  }

  return data as CandidateDetail;
}

export function candidateDetailToCandidate(detail: CandidateDetail): Candidate & { avgScore: number } {
  return {
    id: detail.id,
    promotionId: detail.promotionId,
    firstName: detail.firstName,
    lastName: detail.lastName,
    email: detail.email,
    phone: detail.phone,
    recruitmentDate: detail.recruitmentDate,
    age: detail.age ?? "Not provided",
    gender: detail.gender,
    photo: detail.photo,
    educationLevel: detail.educationLevel,
    diplomaName: detail.diplomaName,
    diplomaAverage: detail.diplomaAverage ?? "Not provided",
    skills: detail.skills,
    modules: detail.modules,
    status: detail.status,
    archived: detail.archived,
    createdAt: detail.createdAt,
    history: detail.history ?? [],
    avgScore: detail.avgScore,
  };
}

export async function createCandidateApi(
  payload: CreateCandidatePayload,
): Promise<CandidateListItem> {
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/v1/candidates"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Cannot reach the API server. Start Laravel with: php artisan serve",
    );
  }

  const data = await parseApiResponse(res);
  if (!res.ok) {
    const firstError = data.errors
      ? Object.values(data.errors as Record<string, string[]>)[0]?.[0]
      : undefined;
    throw new Error(
      (firstError as string) || (data.message as string) || "Failed to create candidate",
    );
  }

  return data as CandidateListItem;
}

export async function fetchCandidates(
  filters: CandidateFilters,
): Promise<CandidateListResponse> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "All") params.set(key, value);
  });

  const res = await fetch(apiUrl(`/api/v1/candidates?${params}`), {
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
): Promise<CandidateDetail> {
  const res = await fetch(apiUrl(`/api/v1/candidates/${id}`), {
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

export async function updateCandidateSkillsApi(
  id: string,
  skills: Skills,
): Promise<CandidateDetail> {
  const res = await fetch(apiUrl(`/api/v1/candidates/${id}/skills`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ skills }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update skills");
  }

  return data;
}

export async function updateCandidateModuleGradesApi(
  id: string,
  modules: ModuleScore[],
): Promise<CandidateDetail> {
  const res = await fetch(apiUrl(`/api/v1/candidates/${id}/module-grades`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ modules }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update module scores");
  }

  return data;
}

export async function updateCandidateStatusApi(
  id: string,
  status: CandidateStatus,
): Promise<CandidateDetail> {
  const res = await fetch(apiUrl(`/api/v1/candidates/${id}/status`), {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update status");
  }

  return data;
}

export async function restoreCandidateApi(id: string): Promise<CandidateDetail> {
  const res = await fetch(apiUrl(`/api/v1/candidates/${id}/restore`), {
    method: "POST",
    headers: authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to restore candidate");
  }

  return data;
}

export async function deleteCandidateApi(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/candidates/${id}`), {
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

  const res = await fetch(apiUrl(`/api/v1/candidates/export?${params}`), {
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
