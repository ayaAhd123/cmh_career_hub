import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/calc";

export const Route = createFileRoute("/promotions/$id/calendar")({
  head: ({ params }) => ({ meta: [{ title: `Calendar — ${params.id}` }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { id } = Route.useParams();
  const promo = useStore((s) => s.promotions.find((p) => p.id === id));
  const candidates = useStore((s) => s.candidates.filter((c) => c.promotionId === id && !c.archived));
  const updateModule = useStore((s) => s.updateModule);

  if (!promo) return <p>Not found</p>;

  // Use the first candidate's modules as the canonical schedule (all share dates)
  const schedule = candidates[0]?.modules ?? [];

  // Aggregate completion across candidates per day
  const dayStats = schedule.map((m) => {
    const completedCount = candidates.filter(
      (c) => c.modules.find((x) => x.day === m.day)?.status === "Completed",
    ).length;
    const holidayCount = candidates.filter(
      (c) => c.modules.find((x) => x.day === m.day)?.status === "Holiday",
    ).length;
    return { ...m, completedCount, holidayCount };
  });

  const toggleAll = (day: number, status: "Completed" | "Not Started" | "Holiday") => {
    candidates.forEach((c) => updateModule(c.id, day, { status }));
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/promotions/$id" params={{ id }}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-bold">{promo.name} — Module Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Mark days completed or as holiday. Holidays don't count toward the 25 working days.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>25-Day Schedule</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {dayStats.map((m) => {
              const isHoliday = m.holidayCount > 0 && m.holidayCount === candidates.length;
              const isDone = m.completedCount > 0 && m.completedCount === candidates.length;
              return (
                <div
                  key={m.day}
                  className={`flex items-center gap-3 border rounded-md p-3 ${isDone ? "bg-success/10 border-success/30" : isHoliday ? "bg-warning/10 border-warning/40" : "bg-card"}`}
                >
                  <div className="w-12 text-center font-bold text-lg">{m.day}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(m.date)} · {m.type}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.completedCount}/{candidates.length} completed
                  </div>
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={(v) => toggleAll(m.day, v ? "Completed" : "Not Started")}
                    />
                    Done
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={isHoliday}
                      onCheckedChange={(v) => toggleAll(m.day, v ? "Holiday" : "Not Started")}
                    />
                    Holiday
                  </label>
                </div>
              );
            })}
            {schedule.length === 0 && (
              <p className="text-sm text-muted-foreground">No candidates yet to display schedule.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
