import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/badges";
import { formatDate, overallAverage, passRate, promotionProgress, promotionStatus } from "@/lib/calc";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/promotions/")({
  head: () => ({
    meta: [
      { title: "Promotions — CareerHub" },
      { name: "description", content: "All training promotions" },
    ],
  }),
  component: PromotionsList,
});

function PromotionsList() {
  const promotions = useStore((s) => s.promotions);
  const candidates = useStore((s) => s.candidates);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Promotions</h1>
      <Card>
        <CardHeader>
          <CardTitle>All cohorts ({promotions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {promotions.map((p) => {
            const cands = candidates.filter((c) => c.promotionId === p.id && !c.archived);
            const progress = promotionProgress(p);
            const avg = cands.length ? cands.reduce((a, c) => a + overallAverage(c), 0) / cands.length : 0;
            return (
              <div key={p.id} className="border rounded-lg p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                  <p className="text-xs font-mono text-muted-foreground">{p.id}</p>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.startDate)} → {formatDate(p.endDate)}
                  </p>
                </div>
                <div className="w-48">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{progress.workingDone}/25 days</span>
                    <span className="font-medium">{progress.pct}%</span>
                  </div>
                  <Progress value={progress.pct} />
                </div>
                <div className="text-center text-xs">
                  <p className="font-bold text-base">{cands.length}</p>
                  <p className="text-muted-foreground">Candidates</p>
                </div>
                <div className="text-center text-xs">
                  <p className="font-bold text-base">{avg.toFixed(1)}</p>
                  <p className="text-muted-foreground">Avg</p>
                </div>
                <div className="text-center text-xs">
                  <p className="font-bold text-base text-success">{passRate(cands)}%</p>
                  <p className="text-muted-foreground">Pass</p>
                </div>
                <StatusBadge status={promotionStatus(p)} />
                <Button asChild size="sm">
                  <Link to="/promotions/$id" params={{ id: p.id }}>
                    Open <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
