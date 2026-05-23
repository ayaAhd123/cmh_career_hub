import { useCallback, useEffect, useMemo, useState } from "react";
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
  REMINDER_TYPE_LABELS,
  type Reminder,
  type ReminderIcon,
} from "@/lib/reminders-api";
import {
  countUnread,
  dismissReminder,
  filterVisibleReminders,
  isReminderRead,
  markAllRemindersRead,
  markReminderRead,
  setActiveReminderContext,
} from "@/lib/reminder-state";
import { useAuthHydrated } from "@/lib/auth-hydration";
import { useAuth } from "@/lib/auth";

/** ~3 reminder cards visible, rest scrolls */
const REMINDER_LIST_MAX_HEIGHT = "17.75rem";

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
  isRead,
  onOpen,
  onDismiss,
  onMarkRead,
}: {
  reminder: Reminder;
  isRead: boolean;
  onOpen: (reminder: Reminder) => void;
  onDismiss: (reminderId: string) => void;
  onMarkRead: (reminderId: string) => void;
}) {
  const Icon = ICONS[reminder.icon] ?? Bell;
  const typeLabel = REMINDER_TYPE_LABELS[reminder.type] ?? reminder.type;

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
          <DropdownMenuContent align="end" className="w-40">
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
  const userKey = useAuth((s) => s.profile?.email ?? "guest");
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [readVersion, setReadVersion] = useState(0);

  const loadReminders = useCallback(async () => {
    if (!token) {
      setReminders([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchReminders();
      setReminders(data.reminders);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      setReminders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open && hydrated && token) {
      void loadReminders();
    }
  }, [open, hydrated, token, loadReminders]);

  const visibleReminders = useMemo(
    () => filterVisibleReminders(userKey, reminders),
    [userKey, reminders, readVersion],
  );

  const unreadCount = useMemo(
    () => countUnread(userKey, visibleReminders.map((r) => r.id)),
    [userKey, visibleReminders, readVersion],
  );

  const bumpReadState = () => setReadVersion((v) => v + 1);

  const handleOpenReminder = (reminder: Reminder) => {
    markReminderRead(userKey, reminder.id);
    setActiveReminderContext(reminder);
    bumpReadState();
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

  const handleMarkAllRead = () => {
    markAllRemindersRead(
      userKey,
      visibleReminders.map((r) => r.id),
    );
    bumpReadState();
  };

  const handleMarkRead = (reminderId: string) => {
    markReminderRead(userKey, reminderId);
    bumpReadState();
  };

  const handleDismiss = (reminderId: string) => {
    dismissReminder(userKey, reminderId);
    bumpReadState();
  };

  const hasVisibleReminders = visibleReminders.length > 0;

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
                : hasVisibleReminders
                  ? "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
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
              {hasVisibleReminders && !loading ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto shrink-0 px-0 text-xs text-primary"
                  disabled={unreadCount === 0}
                  onClick={handleMarkAllRead}
                >
                  Mark all as read
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} unread · click to open the related page`
                : "End dates, headcount, evaluations, and follow-ups"}
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full px-2 py-1 text-[11px] shrink-0">
            {loading ? "…" : unreadCount > 0 ? `${unreadCount}/${visibleReminders.length}` : visibleReminders.length}
          </Badge>
        </div>

        <div
          className="mt-4 space-y-2 overflow-y-auto pr-0.5"
          style={{ maxHeight: REMINDER_LIST_MAX_HEIGHT }}
        >
          {loading && visibleReminders.length === 0 ? (
            <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              Loading reminders…
            </div>
          ) : hasVisibleReminders ? (
            visibleReminders.map((reminder) => (
              <ReminderItem
                key={reminder.id}
                reminder={reminder}
                isRead={isReminderRead(userKey, reminder.id)}
                onOpen={handleOpenReminder}
                onDismiss={handleDismiss}
                onMarkRead={handleMarkRead}
              />
            ))
          ) : (
            <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              {reminders.length > 0 ? "All reminders dismissed." : "No reminders right now."}
            </div>
          )}
        </div>

        {!loading && visibleReminders.length > 3 ? (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Scroll for {visibleReminders.length - 3} more
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
