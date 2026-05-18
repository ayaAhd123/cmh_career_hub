import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { promotionStatus } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const REMINDER_LIMIT = 6;

export function RemindersPopover() {
  const promotions = useStore((s) => s.promotions);
  const candidates = useStore((s) => s.candidates);

  const [open, setOpen] = useState(false);

  const reminders = useMemo(() => {
    const now = new Date();

    const results = promotions.flatMap((promotion) => {
      const status = promotionStatus(promotion);
      const startIn = differenceInCalendarDays(parseISO(promotion.startDate), now);
      const endIn = differenceInCalendarDays(parseISO(promotion.endDate), now);
      const promoCandidates = candidates.filter((c) => c.promotionId === promotion.id && !c.archived);
      const graduatedCount = promoCandidates.filter((c) => c.status === "Graduated").length;

      const remindersForPromo = [] as Array<{
        title: string;
        description: string;
        type: string;
        time: string;
        href: string;
      }>;

      if (status === "Active") {
        if (endIn >= 0 && endIn <= 7) {
          remindersForPromo.push({
            title: `${promotion.name} ends in ${endIn} day${endIn === 1 ? "" : "s"}`,
            description: "Review results and add admin notes before the campaign closes.",
            type: "Promotion",
            time: `${endIn}d left`,
            href: `/promotions/${promotion.id}`,
          });
        }

        if (startIn > 0 && startIn <= 7) {
          remindersForPromo.push({
            title: `${promotion.name} starts in ${startIn} day${startIn === 1 ? "" : "s"}`,
            description: "Prepare the campaign and add notes ahead of launch.",
            type: "Upcoming",
            time: `Starts in ${startIn}d`,
            href: `/promotions/${promotion.id}`,
          });
        }

        if (promoCandidates.length < 8 && startIn <= 0) {
          remindersForPromo.push({
            title: `${promotion.name} has only ${promoCandidates.length} candidates`,
            description: "You may want to follow up with more candidates or review engagement.",
            type: "Reminder",
            time: "Low activity",
            href: `/promotions/${promotion.id}`,
          });
        }

        if (graduatedCount === 0 && startIn <= 0) {
          remindersForPromo.push({
            title: `${promotion.name} has no graduates yet`,
            description: "Consider adding progress notes or checking candidate outcomes.",
            type: "Insight",
            time: "Needs review",
            href: `/promotions/${promotion.id}`,
          });
        }

        if (endIn >= 8 && endIn <= 14) {
          remindersForPromo.push({
            title: `${promotion.name} is halfway through`,
            description: "Keep an eye on performance as the promotion moves into its final phase.",
            type: "Progress",
            time: `In ${endIn}d`,
            href: `/promotions/${promotion.id}`,
          });
        }
      }

      return remindersForPromo;
    });

    return results
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, REMINDER_LIMIT);
  }, [promotions, candidates]);

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
              : hasReminders
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive-foreground"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          )}
          aria-label="Open reminders"
        >
          <Bell className="h-5 w-5" />
          {!open && hasReminders ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-80 p-4 bg-card ring-1 ring-border/20 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Reminders</p>
            <p className="text-xs text-muted-foreground">Actionable alerts for your promotions</p>
          </div>
          <Badge variant="secondary" className="rounded-full px-2 py-1 text-[11px]">
            {reminders.length}
          </Badge>
        </div>

        <div className="mt-4 space-y-2">
          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <Link
                key={reminder.title}
                to={reminder.href}
                className="group block rounded-lg border border-border/80 bg-card px-3 py-2 transition hover:border-primary/70 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[9px] uppercase tracking-[0.2em] py-1 px-2">
                    {reminder.type}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{reminder.time}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground line-clamp-2">{reminder.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground line-clamp-2">{reminder.description}</p>
              </Link>
            ))
          ) : (
            <div className="rounded-lg border border-border/80 bg-card px-3 py-4 text-center text-sm text-muted-foreground">
              No reminders at the moment.
            </div>
          )}
        </div>

        {reminders.length > 0 && (
          <div className="mt-4 border-t border-border pt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Showing {reminders.length} reminders</span>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Mark all read
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
