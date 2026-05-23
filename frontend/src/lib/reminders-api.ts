import { useAuth } from "./auth";
import { apiUrl } from "./api-base";

export type ReminderIcon = "calendar" | "users" | "alert" | "clipboard" | "bell" | "trending";

export type ReminderType =
  | "ending_soon"
  | "starting_soon"
  | "low_candidates"
  | "empty_promotion"
  | "critical_candidates"
  | "incomplete_evaluations"
  | "closure_pending"
  | "unassigned_candidates"
  | "pass_rate_drop"
  | "low_pass_rate";

export interface ReminderLink {
  to: "/promotions/$id" | "/candidates" | "/";
  params?: { id: string };
  search?: {
    tab?: "overview" | "candidates" | "demographics";
    promotion_id?: string;
    category?: string;
    status?: string;
  };
}

export interface Reminder {
  id: string;
  type: ReminderType;
  priority: number;
  title: string;
  description: string;
  timeLabel: string;
  promotionId: string | null;
  icon: ReminderIcon;
  link: ReminderLink;
  isRead?: boolean;
}

export interface RemindersResponse {
  reminders: Reminder[];
  total: number;
  unreadCount: number;
  allCount: number;
}

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  ending_soon: "Ending soon",
  starting_soon: "Starting soon",
  low_candidates: "Headcount",
  empty_promotion: "Action",
  critical_candidates: "At risk",
  incomplete_evaluations: "Evaluations",
  closure_pending: "Closure",
  unassigned_candidates: "Unassigned",
  pass_rate_drop: "Success rate",
  low_pass_rate: "Success rate",
};

export const REMINDERS_REFRESH_EVENT = "careerhub:reminders-refresh";

export function dispatchRemindersRefresh() {
  window.dispatchEvent(new CustomEvent(REMINDERS_REFRESH_EVENT));
}

const authHeaders = (): HeadersInit => {
  const token = useAuth.getState().token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export async function fetchReminders(): Promise<RemindersResponse> {
  const res = await fetch(apiUrl("/api/v1/reminders"), {
    headers: authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to load reminders");
  }

  return data;
}

export async function markReminderReadApi(reminderId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/reminders/${encodeURIComponent(reminderId)}/read`), {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to mark reminder as read");
  }
}

export async function markAllRemindersReadApi(reminderIds: string[]): Promise<void> {
  const res = await fetch(apiUrl("/api/v1/reminders/read-all"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ids: reminderIds }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to mark all reminders as read");
  }
}

export async function dismissReminderApi(reminderId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/reminders/${encodeURIComponent(reminderId)}/dismiss`), {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to dismiss reminder");
  }
}

export async function snoozeReminderApi(reminderId: string, hours = 24): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/reminders/${encodeURIComponent(reminderId)}/snooze`), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ hours }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to snooze reminder");
  }
}
