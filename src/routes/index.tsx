import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GraduationCap, Users, TrendingUp, AlertTriangle, Plus, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/badges";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcEndDate, formatDate, overallAverage, passRate, promotionProgress, promotionStatus, turnoverRate } from "@/lib/calc";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Career-Hub" },
      { name: "description", content: "Overview of all training promotions and candidates." },
    ],
  }),
  component: DashboardPage,
});

function AddPromotionDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const add = useStore((s) => s.addPromotion);
  const nav = useNavigate();

  const submit = () => {
    if (!name.trim()) return toast.error("Name is required");
    const p = add({ name: name.trim(), startDate });
    toast.success(`Promotion ${p.id} created`);
    setOpen(false);
    setName("");
    nav({ to: "/promotions/$id", params: { id: p.id } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Promotion
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Promotion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Sales Bootcamp Q1" />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              Auto end date: {formatDate(calcEndDate(startDate))} (5 weeks · 25 working days)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DashboardPage() {
  const promotions = useStore((s) => s.promotions);
  const candidates = useStore((s) => s.candidates);

  const kpis = useMemo(() => {
    const active = candidates.filter((c) => !c.archived && c.status === "Active");
    const all = candidates.filter((c) => !c.archived);
    return {
      totalPromos: promotions.filter((p) => !p.archived).length,
      activeCands: active.length,
      passRate: passRate(all),
      turnover: turnoverRate(all),
    };
  }, [promotions, candidates]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of all training cohorts and candidates.
          </p>
        </div>
        <AddPromotionDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Promotions" value={kpis.totalPromos} icon={GraduationCap} />
        <KpiCard label="Active Candidates" value={kpis.activeCands} icon={Users} tone="success" />
        <KpiCard label="Global Pass Rate" value={`${kpis.passRate}%`} icon={TrendingUp} tone="success" />
        <KpiCard label="Global Turnover" value={`${kpis.turnover}%`} icon={AlertTriangle} tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Promotions</CardTitle>
        </CardHeader>
        <CardContent>
          {promotions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No promotions yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {promotions.map((p) => {
                const progress = promotionProgress(p);
                const promoCands = candidates.filter((c) => c.promotionId === p.id && !c.archived);
                const avg =
                  promoCands.length === 0
                    ? 0
                    : promoCands.reduce((a, c) => a + overallAverage(c), 0) / promoCands.length;
                return (
                  <Card key={p.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-muted-foreground">{p.id}</p>
                          <h3 className="font-semibold truncate">{p.name}</h3>
                        </div>
                        <StatusBadge status={promotionStatus(p)} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.startDate)} → {formatDate(p.endDate)}
                      </p>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            {progress.workingDone}/{progress.totalWorking} working days
                          </span>
                          <span className="font-medium">{progress.pct}%</span>
                        </div>
                        <Progress value={progress.pct} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                        <div>
                          <p className="font-bold text-base text-foreground">{promoCands.length}</p>
                          <p className="text-muted-foreground">Candidates</p>
                        </div>
                        <div>
                          <p className="font-bold text-base text-success">{passRate(promoCands)}%</p>
                          <p className="text-muted-foreground">Pass</p>
                        </div>
                        <div>
                          <p className="font-bold text-base text-foreground">{avg.toFixed(1)}</p>
                          <p className="text-muted-foreground">Avg /20</p>
                        </div>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <Link to="/promotions/$id" params={{ id: p.id }}>
                          View Details <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
