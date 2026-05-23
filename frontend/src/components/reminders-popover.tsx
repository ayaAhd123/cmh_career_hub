import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CalendarClock, Users, AlertTriangle } from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { promotionStatus } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const REMINDER_LIMIT = 8;
/** Alert when an active promotion has fewer candidates than this. */
const MIN_CANDIDATES = 5;
const ENDING_SOON_DAYS = 7;
const STARTING_SOON_DAYS = 7;

type Reminder = {
  id: string;
  title: string;
  description: string;
  type: string;
  time: string;
  promotionId: string;
  priority: number;
  icon: typeof Bell;
};

export function RemindersPopover() {
  const promotions = useStore((s) => s.promotions);
  const candidates = useStore((s) => s.candidates);
  const [open, setOpen] = useState(false);

  const reminders = useMemo(() => {
    const now = new Date();
    const items: Reminder[] = [];

    promotions.forEach((promotion) => {
      if (promotion.archived) return;

      const status = promotionStatus(promotion);
      const startIn = differenceInCalendarDays(parseISO(promotion.startDate), now);
      const endIn = differenceInCalendarDays(parseISO(promotion.endDate), now);
      const promoCandidates = candidates.filter(
        (c) => c.promotionId === promotion.id && !c.archived,
      );

      if (status !== "Active" && status !== "Pending") return;

      if (endIn >= 0 && endIn <= ENDING_SOON_DAYS) {
        items.push({
          id: `${promotion.id}-end`,
          title: `« ${promotion.name} » se termine bientôt`,
          description: `${promotion.id} — ${endIn === 0 ? "dernier jour" : `${endIn} jour(s) restant(s)`}. Pensez à finaliser les évaluations.`,
          type: "Fin proche",
          time: endIn === 0 ? "Aujourd'hui" : `J-${endIn}`,
          promotionId: promotion.id,
          priority: endIn <= 3 ? 1 : 2,
          icon: CalendarClock,
        });
      }

      if (startIn > 0 && startIn <= STARTING_SOON_DAYS) {
        items.push({
          id: `${promotion.id}-start`,
          title: `« ${promotion.name} » démarre bientôt`,
          description: `${promotion.id} — lancement dans ${startIn} jour(s). Préparez les candidats.`,
          type: "Démarrage",
          time: `D-${startIn}`,
          promotionId: promotion.id,
          priority: 3,
          icon: CalendarClock,
        });
      }

      if (startIn <= 0 && promoCandidates.length < MIN_CANDIDATES) {
        items.push({
          id: `${promotion.id}-low`,
          title: `Peu de candidats — ${promotion.name}`,
          description: `Seulement ${promoCandidates.length} candidat(s) sur ${MIN_CANDIDATES} recommandés. Ajoutez des participants.`,
          type: "Effectif",
          time: `${promoCandidates.length} cand.`,
          promotionId: promotion.id,
          priority: 2,
          icon: Users,
        });
      }

      if (startIn <= 0 && endIn > ENDING_SOON_DAYS && promoCandidates.length === 0) {
        items.push({
          id: `${promotion.id}-empty`,
          title: `Promotion vide — ${promotion.name}`,
          description: `${promotion.id} n'a aucun candidat. Ajoutez des personnes depuis la fiche promotion.`,
          type: "Action",
          time: "0 cand.",
          promotionId: promotion.id,
          priority: 1,
          icon: AlertTriangle,
        });
      }
    });

    return items
      .sort((a, b) => a.priority - b.priority || a.time.localeCompare(b.time))
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
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          )}
          aria-label="Ouvrir les rappels"
        >
          <Bell className="h-5 w-5" />
          {!open && hasReminders ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {reminders.length > 9 ? "9+" : reminders.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-[22rem] p-4 bg-card ring-1 ring-border/20 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Rappels</p>
            <p className="text-xs text-muted-foreground">
              Fins proches, effectifs faibles, promotions à préparer
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full px-2 py-1 text-[11px]">
            {reminders.length}
          </Badge>
        </div>

        <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
          {reminders.length > 0 ? (
            reminders.map((reminder) => {
              const Icon = reminder.icon;
              return (
                <Link
                  key={reminder.id}
                  to="/promotions/$id"
                  params={{ id: reminder.promotionId }}
                  onClick={() => setOpen(false)}
                  className="group flex gap-3 rounded-lg border border-border/80 bg-card px-3 py-2.5 transition hover:border-primary/70 hover:bg-primary/5"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0">
                        {reminder.type}
                      </Badge>
                      <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                        {reminder.time}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-foreground line-clamp-2">
                      {reminder.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground line-clamp-2">
                      {reminder.description}
                    </p>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              Aucun rappel pour le moment.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
