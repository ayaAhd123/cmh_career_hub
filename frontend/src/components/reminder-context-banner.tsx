import { useEffect, useState } from "react";
import { X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearActiveReminderContext,
  getActiveReminderContext,
  type ActiveReminderContext,
} from "@/lib/reminder-state";
import { markReminderReadApi, dispatchRemindersRefresh } from "@/lib/reminders-api";

export function ReminderContextBanner() {
  const [context, setContext] = useState<ActiveReminderContext | null>(null);

  useEffect(() => {
    setContext(getActiveReminderContext());
  }, []);

  if (!context) return null;

  const dismiss = () => {
    void markReminderReadApi(context.id).catch(console.error);
    clearActiveReminderContext();
    setContext(null);
    dispatchRemindersRefresh();
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15">
        <Bell className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{context.title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{context.description}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss reminder"
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
