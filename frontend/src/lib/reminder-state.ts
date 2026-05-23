import type { Reminder } from "./reminders-api";

const CONTEXT_KEY = "careerhub-active-reminder";

export function setActiveReminderContext(reminder: Reminder) {
  sessionStorage.setItem(
    CONTEXT_KEY,
    JSON.stringify({
      id: reminder.id,
      title: reminder.title,
      description: reminder.description,
    }),
  );
}

export interface ActiveReminderContext {
  id: string;
  title: string;
  description: string;
}

export function getActiveReminderContext(): ActiveReminderContext | null {
  try {
    const raw = sessionStorage.getItem(CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as ActiveReminderContext) : null;
  } catch {
    return null;
  }
}

export function clearActiveReminderContext() {
  sessionStorage.removeItem(CONTEXT_KEY);
}
