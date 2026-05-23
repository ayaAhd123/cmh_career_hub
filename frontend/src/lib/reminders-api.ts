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
}

export interface RemindersResponse {
  reminders: Reminder[];
  total: number;
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

export async function fetchReminders(): Promise<RemindersResponse> {
  const token = useAuth.getState().token;

  const res = await fetch(apiUrl("/api/v1/reminders"), {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to load reminders");
  }

  return data;
}
