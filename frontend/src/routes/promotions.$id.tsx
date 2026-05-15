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
  ArrowRight,
  Search,
  X,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Label as RechartsLabel
} from "recharts";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddCandidateDialog } from "@/components/add-candidate-dialog";
import {
  exportPromotionPDF, exportPromotionExcel, exportPromotionCSV, exportPromotionHTML,
} from "@/lib/exports";

export const Route = createFileRoute("/promotions/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — CareerHub` },
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

const CHART_COLORS = [
  "hsl(220 70% 50%)",
  "hsl(160 60% 45%)",
  "hsl(30 90% 55%)",
  "hsl(280 65% 60%)",
  "hsl(340 75% 55%)",
  "hsl(190 80% 45%)",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-sm p-3 text-sm">
        {label && <p className="font-semibold mb-1.5 text-foreground">{label}</p>}
        {payload.map((entry: any, index: number) => {
          const isAvg = entry.dataKey === "avg";
          const valLabel = isAvg ? "avg score / 5" : "candidates";
          return (
            <div key={index} className="flex items-center gap-2 mt-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.fill || "#000" }} />
              <span className="text-muted-foreground flex items-center gap-1.5">
                {!label && <span className="font-medium text-foreground">{entry.name}:</span>} 
                {entry.value} {valLabel}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
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
      { name: "0-1", min: 0, max: 1 },
      { name: "1-2", min: 1, max: 2 },
      { name: "2-3", min: 2, max: 3 },
      { name: "3-4", min: 3, max: 4 },
      { name: "4-5", min: 4, max: 5.01 },
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
  }).sort((a, b) => overallAverage(b) - overallAverage(a));

  const genderDist = useMemo(() => {
    const counts: Record<string, number> = { Homme: 0, Femme: 0 };
    const totals: Record<string, number> = { Homme: 0, Femme: 0 };
    candidates.forEach((c) => {
      counts[c.gender] = (counts[c.gender] || 0) + 1;
      totals[c.gender] = (totals[c.gender] || 0) + overallAverage(c);
    });
    return Object.keys(counts).map(k => ({
      name: k,
      value: counts[k as keyof typeof counts],
      avg: counts[k as keyof typeof counts] ? Number((totals[k as keyof typeof totals] / counts[k as keyof typeof counts]).toFixed(2)) : 0
    })).filter(d => counts[d.name as keyof typeof counts] > 0);
  }, [candidates]);

  const educationDist = useMemo(() => {
    const counts: Record<string, number> = {};
    const totals: Record<string, number> = {};
    candidates.forEach((c) => {
      counts[c.educationLevel] = (counts[c.educationLevel] || 0) + 1;
      totals[c.educationLevel] = (totals[c.educationLevel] || 0) + overallAverage(c);
    });
    return Object.keys(counts).map(k => ({
      name: k,
      value: counts[k],
      avg: counts[k] ? Number((totals[k] / counts[k]).toFixed(2)) : 0
    }));
  }, [candidates]);

  const ageDist = useMemo(() => {
    const counts: Record<string, number> = { "19-25": 0, "26-30": 0, "31-40": 0, "41+": 0 };
    const totals: Record<string, number> = { "19-25": 0, "26-30": 0, "31-40": 0, "41+": 0 };
    candidates.forEach((c) => {
      let bucket = "41+";
      if (c.age >= 19 && c.age <= 25) bucket = "19-25";
      else if (c.age >= 26 && c.age <= 30) bucket = "26-30";
      else if (c.age >= 31 && c.age <= 40) bucket = "31-40";
      
      counts[bucket]++;
      totals[bucket] += overallAverage(c);
    });
    return Object.keys(counts).map(k => ({
      name: k,
      value: counts[k],
      avg: counts[k] ? Number((totals[k] / counts[k]).toFixed(2)) : 0
    })).filter(d => counts[d.name] > 0);
  }, [candidates]);

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
        <KpiCard label="Average Score" value={avgScore.toFixed(2)} icon={Star} hint="/ 5" />
        <KpiCard label="At Risk" value={atRisk} icon={AlertTriangle} tone="warning" />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Top 3 Performers</CardTitle></CardHeader>
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
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{a.toFixed(2)}/5</p>
                    </div>
                    <CategoryBadge category={categoryFor(a)} />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="candidates">Candidates List</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Performance by Category</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryDist} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3} stroke="none">
                        {categoryDist.map((d) => (
                          <Cell key={d.name} fill={COLORS[d.name]} />
                        ))}
                        <RechartsLabel
                          value={categoryDist.reduce((a, b) => a + b.value, 0)}
                          position="center"
                          className="fill-foreground text-2xl font-bold"
                        />
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Score Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDist}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(220 70% 65%)" stopOpacity={1} />
                          <stop offset="95%" stopColor="hsl(220 70% 45%)" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={28} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                      <Bar dataKey="count" fill="url(#scoreGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Avg Score by Gender</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genderDist}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} width={28} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                      <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                        {genderDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Education Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={educationDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                        {educationDist.map((d, i) => (
                          <Cell key={d.name} fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Age Group Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ageDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                        {ageDist.map((d, i) => (
                          <Cell key={d.name} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="candidates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>Candidates ({filtered.length})</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 pr-8 bg-muted/40"
                    />
                    {search && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setSearch("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Select value={filterCat} onValueChange={setFilterCat}>
                    <SelectTrigger className="w-[160px] bg-muted/40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Passable">Passable</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px] bg-muted/40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Graduated">Graduated</SelectItem>
                      <SelectItem value="Dismissed">Dismissed</SelectItem>
                      <SelectItem value="Terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <th className="py-2 px-3">Avg /5</th>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
