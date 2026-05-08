import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import { KpiCard } from "@/components/kpi-card";
import {
  categoryFor,
  formatDate,
  overallAverage,
  passRate,
  promotionProgress,
  promotionStatus,
} from "@/lib/calc";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Star,
  AlertTriangle,
  Download,
  Calendar,
  ArrowRight,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddCandidateDialog } from "@/components/add-candidate-dialog";
import {
  exportPromotionPDF, exportPromotionExcel, exportPromotionCSV, exportPromotionHTML,
} from "@/lib/exports";

export const Route = createFileRoute("/promotions/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — NexusHR` },
      { name: "description", content: `Detailed dashboard for promotion ${params.id}` },
    ],
  }),
  component: PromotionDetail,
});

const COLORS: Record<string, string> = {
  Excellent: "hsl(165 60% 45%)",
  Good: "hsl(220 70% 55%)",
  Passable: "hsl(40 90% 55%)",
  Critical: "hsl(15 75% 55%)",
};

function PromotionDetail() {
  const { id } = Route.useParams();
  const promotion = useStore((s) => s.promotions.find((p) => p.id === id));
  const allCandidates = useStore((s) => s.candidates);
  const candidates = useMemo(
    () => allCandidates.filter((c) => c.promotionId === id && !c.archived),
    [allCandidates, id],
  );
  const archive = useStore((s) => s.archivePromotion);
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  if (!promotion) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Promotion not found</h2>
        <Button asChild className="mt-4">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const progress = promotionProgress(promotion);

  const categoryDist = useMemo(() => {
    const counts = { Excellent: 0, Good: 0, Passable: 0, Critical: 0 };
    candidates.forEach((c) => {
      counts[categoryFor(overallAverage(c))]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [candidates]);

  const scoreDist = useMemo(() => {
    const ranges = [
      { name: "0-5", min: 0, max: 5 },
      { name: "5-10", min: 5, max: 10 },
      { name: "10-12", min: 10, max: 12 },
      { name: "12-14", min: 12, max: 14 },
      { name: "14-16", min: 14, max: 16 },
      { name: "16-20", min: 16, max: 20.01 },
    ];
    return ranges.map((r) => ({
      name: r.name,
      count: candidates.filter((c) => {
        const a = overallAverage(c);
        return a >= r.min && a < r.max;
      }).length,
    }));
  }, [candidates]);

  const top3 = [...candidates]
    .sort((a, b) => overallAverage(b) - overallAverage(a))
    .slice(0, 3);

  const filtered = candidates.filter((c) => {
    const a = overallAverage(c);
    const cat = categoryFor(a);
    const q = search.toLowerCase();
    const match =
      !q ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q);
    const cm = filterCat === "all" || cat === filterCat;
    const sm = filterStatus === "all" || c.status === filterStatus;
    return match && cm && sm;
  });

  const avgScore =
    candidates.length === 0
      ? 0
      : candidates.reduce((a, c) => a + overallAverage(c), 0) / candidates.length;

  const atRisk = candidates.filter((c) => {
    const cat = categoryFor(overallAverage(c));
    return cat === "Passable" || cat === "Critical";
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{promotion.id}</p>
              <h1 className="text-2xl font-bold">{promotion.name}</h1>
              <p className="text-sm text-muted-foreground">
                {formatDate(promotion.startDate)} → {formatDate(promotion.endDate)} · 5 weeks · 25 working days
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={promotionStatus(promotion)} />
              <Button asChild variant="outline" size="sm">
                <Link to="/promotions/$id/calendar" params={{ id: promotion.id }}>
                  <Calendar className="mr-1 h-4 w-4" /> Calendar
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-1 h-4 w-4" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportPromotionPDF(promotion, candidates)}>PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportPromotionExcel(promotion, candidates)}>Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportPromotionCSV(promotion, candidates)}>CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportPromotionHTML(promotion, candidates)}>HTML</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Archive this promotion?")) {
                    archive(promotion.id);
                    nav({ to: "/" });
                  }
                }}
              >
                Archive
              </Button>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">
                Progress: {progress.workingDone}/{progress.totalWorking} working days
              </span>
              <span className="font-semibold">{progress.pct}%</span>
            </div>
            <Progress value={progress.pct} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Candidates" value={candidates.length} icon={Users} />
        <KpiCard label="Pass Rate" value={`${passRate(candidates)}%`} icon={TrendingUp} tone="success" />
        <KpiCard label="Average Score" value={avgScore.toFixed(2)} icon={Star} hint="/ 20" />
        <KpiCard label="At Risk" value={atRisk} icon={AlertTriangle} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Performance by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryDist} dataKey="value" nameKey="name" outerRadius={90} label>
                    {categoryDist.map((d) => (
                      <Cell key={d.name} fill={COLORS[d.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Score Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDist}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(220 70% 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top 3 Performers</CardTitle></CardHeader>
        <CardContent>
          {top3.length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidates yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {top3.map((c, idx) => {
                const a = overallAverage(c);
                return (
                  <Link
                    key={c.id}
                    to="/candidates/$id"
                    params={{ id: c.id }}
                    className="border rounded-lg p-4 hover:bg-muted/40 transition-colors flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{a.toFixed(2)}/20</p>
                    </div>
                    <CategoryBadge category={categoryFor(a)} />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>Candidates ({filtered.length})</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56"
              />
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="h-9 px-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Categories</option>
                <option>Excellent</option>
                <option>Good</option>
                <option>Passable</option>
                <option>Critical</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 px-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Statuses</option>
                <option>Active</option>
                <option>Graduated</option>
                <option>Dismissed</option>
                <option>Terminated</option>
              </select>
              <AddCandidateDialog promotionId={promotion.id} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Education</th>
                  <th className="py-2 px-3">Avg /20</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const a = overallAverage(c);
                  return (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">{c.email}</td>
                      <td className="py-2 px-3 text-xs">{c.educationLevel}</td>
                      <td className="py-2 px-3 font-semibold">{a.toFixed(2)}</td>
                      <td className="py-2 px-3"><CategoryBadge category={categoryFor(a)} /></td>
                      <td className="py-2 px-3"><StatusBadge status={c.status} /></td>
                      <td className="py-2 px-3">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/candidates/$id" params={{ id: c.id }}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No candidates found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
