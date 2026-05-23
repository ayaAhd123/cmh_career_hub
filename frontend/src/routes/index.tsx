import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Users, TrendingUp, AlertTriangle, ArrowRight, Inbox, Activity, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { useStore } from "@/lib/store";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/badges";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/calc";
import { fetchDashboardStats } from "@/lib/dashboard-api";
import { toast } from "sonner";
import { AddPromotionDialog } from "@/components/add-promotion-dialog";
import { ReminderContextBanner } from "@/components/reminder-context-banner";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, Label as RechartsLabel
} from "recharts";
import type { DashboardStats, TimeRange } from "@/lib/types";

const GENDER_COLORS: Record<string, string> = {
  Male: "#6366f1", // Indigo
  Female: "#ec4899", // Pink
  Homme: "#6366f1", // Indigo
  Femme: "#ec4899", // Pink
  Other: "#f59e0b", // Amber
};

const AGE_COLORS = ["url(#ageGradient1)", "url(#ageGradient2)", "url(#ageGradient3)", "url(#ageGradient4)"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — CareerHub" },
      { name: "description", content: "Overview of all training promotions and candidates." },
    ],
  }),
  component: DashboardPage,
});

function EmptyState({ title, description, icon: Icon = Inbox }: { title: string; description: string; icon?: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-500">
      <div className="bg-muted/50 h-14 w-14 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground/70" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[250px] mt-1">{description}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-sm p-3 text-sm">
        {label && <p className="font-semibold mb-1.5 text-foreground">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mt-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.fill || "#000" }} />
            <span className="text-muted-foreground flex items-center gap-1.5">
              {!label && <span className="font-medium text-foreground">{entry.name}:</span>} 
              {entry.value} {entry.dataKey === "avg" ? "Avg Score" : "candidates"}
            </span>
          </div>
        ))}
        {payload[0].payload && payload[0].payload.avg !== undefined && !payload.find((p: any) => p.dataKey === 'avg') && (
          <div className="mt-2 pt-2 border-t flex justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Avg Score:</span>
            <span className="font-bold text-foreground">{payload[0].payload.avg} / 5</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

function DashboardPage() {
  const timeRange = useStore((s) => s.globalTimeRange);
  const customStart = useStore((s) => s.globalCustomStart);
  const customEnd = useStore((s) => s.globalCustomEnd);
  const setTimeRange = useStore((s) => s.setGlobalTimeRange);
  const setCustomStart = useStore((s) => s.setGlobalCustomStart);
  const setCustomEnd = useStore((s) => s.setGlobalCustomEnd);
  const clearFilters = useStore((s) => s.clearGlobalFilters);
  const [chartMode, setChartMode] = useState<"volume" | "performance">("volume");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const data = await fetchDashboardStats(timeRange, customStart, customEnd);
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load dashboard stats", err);
          toast.error("Failed to load dashboard statistics");
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [timeRange, customStart, customEnd]);

  const kpis = stats?.kpis ?? {
    totalPromos: 0,
    activeCands: 0,
    passRate: 0,
    globalAvg: "0.0",
    turnover: 0,
  };
  const eduData = stats?.demographics.education ?? [];
  const genderData = stats?.demographics.gender ?? [];
  const ageData = stats?.demographics.age ?? [];
  const activeCohorts = stats?.activePromotions ?? [];
  const hasCandidateData = eduData.some((d) => d.count > 0) || genderData.length > 0;

  const handleStartChange = (val: string) => {
    if (val && customEnd && new Date(val) > new Date(customEnd)) {
      toast.error("Start date must be before the end date");
      return;
    }
    setCustomStart(val);
  };

  const handleEndChange = (val: string) => {
    if (val && customStart && new Date(customStart) > new Date(val)) {
      toast.error("End date must be after the start date");
      return;
    }
    setCustomEnd(val);
  };

  return (
    <div className="space-y-6">
      <ReminderContextBanner />
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of all training cohorts and candidates.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {timeRange !== 'all' && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground shrink-0">
              Clear
            </Button>
          )}

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="current_week">Current Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="current_year">Current Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {timeRange === 'custom' && (
            <div className="flex items-center gap-2">
              <Input type="date" className="w-auto h-10" value={customStart} onChange={e => handleStartChange(e.target.value)} />
              <span className="text-muted-foreground font-medium">-</span>
              <Input type="date" className="w-auto h-10" value={customEnd} onChange={e => handleEndChange(e.target.value)} />
            </div>
          )}


          <AddPromotionDialog />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total Promotions" value={statsLoading ? "…" : kpis.totalPromos} icon={GraduationCap} />
        <KpiCard label="Active Candidates" value={statsLoading ? "…" : kpis.activeCands} icon={Users} tone="success" />
        <KpiCard label="Global Pass Rate" value={statsLoading ? "…" : `${kpis.passRate}%`} icon={TrendingUp} tone="success" hint="Avg. score ≥ 2.5/5" />
        <KpiCard label="Global Avg. Score" value={statsLoading ? "…" : `${kpis.globalAvg}`} icon={Activity} tone="primary" hint="Out of 5" />
        <KpiCard label="Global Turnover" value={statsLoading ? "…" : `${kpis.turnover}%`} icon={AlertTriangle} tone="warning" hint="Dismissed or dropped" />
      </div>

      {/* Analytics Header & Toggle */}
      <div className="flex items-center justify-between mt-8 mb-2 flex-wrap gap-4">
        <h2 className="text-xl font-bold tracking-tight">Demographic Analytics</h2>
        <div className="flex bg-muted/50 p-1 rounded-md border text-sm">
          <button 
            onClick={() => setChartMode('volume')}
            className={`px-3 py-1.5 font-medium rounded-sm transition-all ${chartMode === 'volume' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Volume (Count)
          </button>
          <button 
            onClick={() => setChartMode('performance')}
            className={`px-3 py-1.5 font-medium rounded-sm transition-all ${chartMode === 'performance' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Performance (Avg Score)
          </button>
        </div>
      </div>

      {/* Analytics charts */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        {/* Education Level */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Education Level</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <EmptyState title="Loading" description="Fetching dashboard statistics..." icon={BarChart3} />
            ) : !hasCandidateData ? (
              <EmptyState title="No Data" description="Not enough candidate data." icon={BarChart3} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={eduData} barCategoryGap="30%">
                  <defs>
                    <linearGradient id="eduGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="level" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={chartMode === "performance" ? [0, 5] : ["auto", "auto"]} allowDecimals={chartMode === "performance"} tick={{ fontSize: 12 }} width={28} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                  <Bar dataKey={chartMode === "volume" ? "count" : "avg"} name={chartMode === "volume" ? "Candidates" : "Avg Score"} radius={[6, 6, 0, 0]}>
                    {eduData.map((entry, index) => {
                      if (chartMode === "volume") return <Cell key={`cell-${index}`} fill="url(#eduGradient)" />;
                      const isMax = entry.avg === Math.max(...eduData.map(d => d.avg));
                      return <Cell key={`cell-${index}`} fill={isMax ? "#f59e0b" : "url(#eduGradient)"} opacity={isMax ? 1 : 0.6} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gender Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            {statsLoading ? (
              <EmptyState title="Loading" description="Fetching dashboard statistics..." icon={PieChartIcon} />
            ) : genderData.length === 0 ? (
              <EmptyState title="No Data" description="Not enough candidate data." icon={PieChartIcon} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey={chartMode === "volume" ? "value" : "avg"}
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {genderData.map((entry, index) => {
                      const color = GENDER_COLORS[entry.name] ?? "#94a3b8";
                      if (chartMode === "volume") {
                        return <Cell key={entry.name} fill={color} />;
                      } else {
                        const isMax = entry.avg === Math.max(...genderData.map(d => d.avg));
                        return <Cell key={`cell-${index}`} fill={color} opacity={isMax ? 1 : 0.4} />;
                      }
                    })}
                    <RechartsLabel
                      value={chartMode === "volume" ? genderData.reduce((a, b) => a + b.value, 0) : (Math.round((genderData.reduce((a, b) => a + b.avg, 0) / genderData.length) * 10) / 10).toFixed(1)}
                      position="center"
                      className="fill-foreground text-2xl font-bold"
                    />
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>


        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <EmptyState title="Loading" description="Fetching dashboard statistics..." icon={BarChart3} />
            ) : !hasCandidateData ? (
              <EmptyState title="No Data" description="Not enough candidate data." icon={BarChart3} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ageData} barCategoryGap="30%">
                  <defs>
                    {AGE_COLORS.map((_, i) => (
                      <linearGradient id={`ageGradient${i + 1}`} x1="0" y1="0" x2="0" y2="1" key={i}>
                        <stop offset="5%" stopColor={["#818cf8", "#a78bfa", "#c4b5fd", "#ddd6fe"][i]} stopOpacity={1} />
                        <stop offset="95%" stopColor={["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"][i]} stopOpacity={0.8} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis domain={chartMode === "performance" ? [0, 5] : ["auto", "auto"]} allowDecimals={chartMode === "performance"} tick={{ fontSize: 12 }} width={28} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                  <Bar dataKey={chartMode === "volume" ? "count" : "avg"} name={chartMode === "volume" ? "Candidates" : "Avg Score"} radius={[6, 6, 0, 0]}>
                    {ageData.map((entry, index) => {
                      const color = `url(#ageGradient${index + 1})`;
                      if (chartMode === "volume") return <Cell key={`cell-${index}`} fill={color} />;
                      const isMax = entry.avg === Math.max(...ageData.map(d => d.avg));
                      return <Cell key={`cell-${index}`} fill={color} opacity={isMax ? 1 : 0.4} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Promotions Section */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/40 mb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Active Promotions</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-primary">
              <Link to="/promotions">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="py-12">
              <EmptyState
                title="Loading"
                description="Fetching active promotions..."
              />
            </div>
          ) : activeCohorts.length === 0 ? (
            <div className="py-12">
              <EmptyState 
                title="No Active Promotions Found" 
                description="There are no active promotions in the selected time range." 
              />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeCohorts.map((p) => (
                    <Card key={p.id} className="hover:shadow-md transition-all hover:border-primary/20 group">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-muted-foreground">{p.id}</p>
                            <h3 className="font-semibold truncate text-lg">{p.name}</h3>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 p-2 rounded-md">
                          <span>{formatDate(p.startDate)}</span>
                          <ArrowRight className="h-3 w-3 mx-1 opacity-50" />
                          <span>{formatDate(p.endDate)}</span>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground font-medium">
                              Progress
                            </span>
                            <span className="font-semibold">{p.progress.pct}%</span>
                          </div>
                          <Progress 
                            value={p.progress.pct} 
                            className="h-2"
                            indicatorClassName={p.progress.pct === 100 ? "bg-success" : "bg-primary"}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1 text-right">
                            {p.progress.workingDone} / {p.progress.totalWorking} working days
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-sm pt-2 border-t border-border/40">
                          <div className="flex flex-col items-center p-2 rounded-md hover:bg-muted/50 transition-colors">
                            <span className="font-bold text-foreground text-lg">{p.candidateCount}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cands</span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded-md hover:bg-muted/50 transition-colors">
                            <span className={`font-bold text-lg ${p.passRate >= 70 ? 'text-success' : p.passRate >= 50 ? 'text-warning-foreground' : 'text-destructive'}`}>
                              {p.passRate}%
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pass</span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded-md hover:bg-muted/50 transition-colors">
                            <span className="font-bold text-foreground text-lg">{p.avgScore}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg</span>
                          </div>
                        </div>

                        <Button asChild variant="secondary" className="w-full opacity-90 group-hover:opacity-100 transition-opacity">
                          <Link to="/promotions/$id" params={{ id: p.id }}>
                            View Details <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
