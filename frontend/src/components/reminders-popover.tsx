import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarClock,
  Users,
  AlertTriangle,
  ClipboardList,
  TrendingDown,
  MoreVertical,
  Check,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchReminders,
  markReminderReadApi,
  markAllRemindersReadApi,
  dismissReminderApi,
  snoozeReminderApi,
  REMINDER_TYPE_LABELS,
  REMINDERS_REFRESH_EVENT,
  type Reminder,
  type ReminderIcon,
} from "@/lib/reminders-api";
import { setActiveReminderContext } from "@/lib/reminder-state";
import { useAuthHydrated } from "@/lib/auth-hydration";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const REMINDER_LIST_MAX_HEIGHT = "17.75rem";
const POLL_MS = 5 * 60 * 1000;

const ICONS: Record<ReminderIcon, typeof Bell> = {
  calendar: CalendarClock,
  users: Users,
  alert: AlertTriangle,
  clipboard: ClipboardList,
  bell: Bell,
  trending: TrendingDown,
};

function ReminderItem({
  reminder,
  onOpen,
  onDismiss,
  onMarkRead,
  onSnooze,
}: {
  reminder: Reminder;
  onOpen: (reminder: Reminder) => void;
  onDismiss: (reminderId: string) => void;
  onMarkRead: (reminderId: string) => void;
  onSnooze: (reminderId: string) => void;
}) {
  const Icon = ICONS[reminder.icon] ?? Bell;
  const typeLabel = REMINDER_TYPE_LABELS[reminder.type] ?? reminder.type;
  const isRead = reminder.isRead === true;

  return (
    <div
      className={cn(
        "group flex items-start gap-0.5 rounded-lg border transition",
        isRead
          ? "border-border/80 bg-muted/20"
          : "border-primary/35 bg-primary/10 shadow-sm",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(reminder)}
        className="flex min-w-0 flex-1 gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-primary/5"
      >
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            isRead ? "bg-muted" : "bg-primary/15",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              isRead ? "text-muted-foreground group-hover:text-primary" : "text-primary",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0">
              {typeLabel}
            </Badge>
            <span className="flex items-center gap-1.5 shrink-0">
              {!isRead ? (
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
              ) : null}
              <span className="text-[11px] font-medium text-muted-foreground">
                {reminder.timeLabel}
              </span>
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-foreground line-clamp-2">
            {reminder.title}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground line-clamp-2">
            {reminder.description}
          </p>
        </div>
      </button>

      <div className="mt-2 mr-0.5 flex shrink-0 flex-col items-center gap-1">
        {!isRead ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-primary"
            aria-label="Mark as read"
            title="Mark as read"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(reminder.id);
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
              aria-label="Reminder options"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {!isRead ? (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onMarkRead(reminder.id);
                }}
              >
                Mark as read
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onSnooze(reminder.id);
              }}
            >
              <Clock className="mr-2 h-3.5 w-3.5" />
              Snooze 24h
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                onDismiss(reminder.id);
              }}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function RemindersPopover() {
  const navigate = useNavigate();
  const hydrated = useAuthHydrated();
  const token = useAuth((s) => s.token);
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [total, setTotal] = useState(0);
  const [allCount, setAllCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadReminders = useCallback(async () => {
    if (!token) {
      setReminders([]);
      setTotal(0);
      setAllCount(0);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchReminders();
      setReminders(data.reminders);
      setTotal(data.total);
      setAllCount(data.allCount);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error(err);
      setReminders([]);
      setTotal(0);
      setAllCount(0);
      setUnreadCount(0);
      setLoadError(true);
      toast.error("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open && hydrated && token) {
      void loadReminders();
    }
  }, [open, hydrated, token, loadReminders]);

  useEffect(() => {
    const onRefresh = () => {
      void loadReminders();
    };
    window.addEventListener(REMINDERS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REMINDERS_REFRESH_EVENT, onRefresh);
  }, [loadReminders]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      void loadReminders();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [token, loadReminders]);

  const handleOpenReminder = async (reminder: Reminder) => {
    try {
      if (!reminder.isRead) {
        await markReminderReadApi(reminder.id);
      }
    } catch (err) {
      console.error(err);
    }

    setActiveReminderContext(reminder);
    setReminders((prev) =>
      prev.map((r) => (r.id === reminder.id ? { ...r, isRead: true } : r)),
    );
    setUnreadCount((prev) => Math.max(0, prev - (reminder.isRead ? 0 : 1)));
    setOpen(false);

    const link = reminder.link;
    if (link.to === "/") {
      void navigate({ to: "/" });
      return;
    }

    if (link.to === "/promotions/$id" && link.params?.id) {
      void navigate({
        to: "/promotions/$id",
        params: { id: link.params.id },
        search: link.search ?? {},
      });
      return;
    }

    void navigate({
      to: "/candidates",
      search: link.search ?? {},
    });
  };

  const handleMarkAllRead = async () => {
    const ids = reminders.filter((r) => !r.isRead).map((r) => r.id);
    if (ids.length === 0) return;
    try {
      await markAllRemindersReadApi(ids);
      setReminders((prev) => prev.map((r) => ({ ...r, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark reminders as read");
    }
  };

  const handleMarkRead = async (reminderId: string) => {
    try {
      await markReminderReadApi(reminderId);
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, isRead: true } : r)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark reminder as read");
    }
  };

  const handleDismiss = async (reminderId: string) => {
    try {
      await dismissReminderApi(reminderId);
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      setTotal((prev) => Math.max(0, prev - 1));
      setUnreadCount((prev) => {
        const dismissed = reminders.find((r) => r.id === reminderId);
        return Math.max(0, prev - (dismissed?.isRead ? 0 : 1));
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove reminder");
    }
  };

  const handleSnooze = async (reminderId: string) => {
    try {
      await snoozeReminderApi(reminderId, 24);
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      setTotal((prev) => Math.max(0, prev - 1));
      setUnreadCount((prev) => {
        const snoozed = reminders.find((r) => r.id === reminderId);
        return Math.max(0, prev - (snoozed?.isRead ? 0 : 1));
      });
      toast.success("Reminder snoozed for 24 hours");
    } catch (err) {
      console.error(err);
      toast.error("Failed to snooze reminder");
    }
  };

  const hasReminders = reminders.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-10 w-10 rounded-full transition-colors",
            open
              ? "bg-muted/10 text-foreground"
              : unreadCount > 0
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          )}
          aria-label="Open reminders"
        >
          <Bell className="h-5 w-5" />
          {!open && unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-[22rem] p-4 bg-card ring-1 ring-border/20 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Reminders</p>
              {hasReminders && !loading ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto shrink-0 px-0 text-xs text-primary"
                  disabled={unreadCount === 0}
                  onClick={() => void handleMarkAllRead()}
                >
                  Mark all as read
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loadError
                ? "Could not load reminders — try again later"
                : unreadCount > 0
                  ? `${unreadCount} unread · click to open the related page`
                  : "End dates, headcount, evaluations, and follow-ups"}
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full px-2 py-1 text-[11px] shrink-0">
            {loading ? "…" : unreadCount > 0 ? `${unreadCount}/${total}` : total}
          </Badge>
        </div>

        {!loading && allCount > total ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Showing {total} of {allCount} active reminders
          </p>
        ) : null}

        <div
          className="mt-4 space-y-2 overflow-y-auto pr-0.5"
          style={{ maxHeight: REMINDER_LIST_MAX_HEIGHT }}
        >
          {loading && !hasReminders ? (
            <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              Loading reminders…
            </div>
          ) : hasReminders ? (
            reminders.map((reminder) => (
              <ReminderItem
                key={reminder.id}
                reminder={reminder}
                onOpen={(r) => void handleOpenReminder(r)}
                onDismiss={(id) => void handleDismiss(id)}
                onMarkRead={(id) => void handleMarkRead(id)}
                onSnooze={(id) => void handleSnooze(id)}
              />
            ))
          ) : (
            <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              {loadError ? "Reminders unavailable." : "No reminders right now."}
            </div>
          )}
        </div>

        {!loading && reminders.length > 3 ? (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Scroll for {reminders.length - 3} more
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
