import type { Reminder } from "./reminders-api";

const READ_KEY = "careerhub-read-reminders";
const DISMISSED_KEY = "careerhub-dismissed-reminders";
const CONTEXT_KEY = "careerhub-active-reminder";

function readStorageKey(userKey: string) {
  return `${READ_KEY}:${userKey}`;
}

function dismissedStorageKey(userKey: string) {
  return `${DISMISSED_KEY}:${userKey}`;
}

function readSet(userKey: string): Set<string> {
  if (!userKey) return new Set();
  try {
    const raw = localStorage.getItem(readStorageKey(userKey));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function dismissedSet(userKey: string): Set<string> {
  if (!userKey) return new Set();
  try {
    const raw = localStorage.getItem(dismissedStorageKey(userKey));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeReadSet(userKey: string, ids: Set<string>) {
  if (!userKey) return;
  localStorage.setItem(readStorageKey(userKey), JSON.stringify([...ids]));
}

function writeDismissedSet(userKey: string, ids: Set<string>) {
  if (!userKey) return;
  localStorage.setItem(dismissedStorageKey(userKey), JSON.stringify([...ids]));
}

export function isReminderRead(userKey: string, reminderId: string): boolean {
  return readSet(userKey).has(reminderId);
}

export function markReminderRead(userKey: string, reminderId: string) {
  const ids = readSet(userKey);
  ids.add(reminderId);
  writeReadSet(userKey, ids);
}

export function markAllRemindersRead(userKey: string, reminderIds: string[]) {
  if (!userKey || reminderIds.length === 0) return;
  const ids = readSet(userKey);
  for (const id of reminderIds) {
    ids.add(id);
  }
  writeReadSet(userKey, ids);
}

export function isReminderDismissed(userKey: string, reminderId: string): boolean {
  return dismissedSet(userKey).has(reminderId);
}

export function dismissReminder(userKey: string, reminderId: string) {
  const ids = dismissedSet(userKey);
  ids.add(reminderId);
  writeDismissedSet(userKey, ids);
  markReminderRead(userKey, reminderId);
}

export function filterVisibleReminders<T extends { id: string }>(userKey: string, reminders: T[]): T[] {
  const dismissed = dismissedSet(userKey);
  return reminders.filter((r) => !dismissed.has(r.id));
}

export function countUnread(userKey: string, reminderIds: string[]): number {
  const read = readSet(userKey);
  return reminderIds.filter((id) => !read.has(id)).length;
}

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
