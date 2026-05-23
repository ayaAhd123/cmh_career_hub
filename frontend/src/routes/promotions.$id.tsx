import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import { KpiCard } from "@/components/kpi-card";
import {
  formatDate,
  promotionStatus,
} from "@/lib/calc";
import {
  fetchCandidates,
  createCandidateApi,
  deleteCandidateApi,
  updateCandidateApi,
  type CandidateListItem,
  type CreateCandidatePayload,
} from "@/lib/candidate-api";
import { useAuth } from "@/lib/auth";
import type { EducationLevel, Gender } from "@/lib/types";
import { fetchPromotionStats, fetchPromotionExportCandidates, type PromotionStats } from "@/lib/promotion-api";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Star,
  AlertTriangle,
  Download,
  Upload,
  ArrowRight,
  Search,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx-js-style";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Label as RechartsLabel
} from "recharts";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AddCandidateDialog } from "@/components/add-candidate-dialog";
import { EditCandidateDialog } from "@/components/edit-candidate-dialog";
import { ReminderContextBanner } from "@/components/reminder-context-banner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KpiSkeletonGrid, TableRowSkeleton } from "@/components/loading-states";
import {
  exportPromotionPDF, exportPromotionExcel, exportPromotionHTML,
} from "@/lib/exports";
import type { ExportLocale } from "@/lib/export-i18n";

export const Route = createFileRoute("/promotions/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — CareerHub` },
      { name: "description", content: `Detailed dashboard for promotion ${params.id}` },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      search.tab === "overview" || search.tab === "candidates" || search.tab === "demographics"
        ? search.tab
        : undefined,
  }),
  component: PromotionDetail,
});

const COLORS: Record<string, string> = {
  Excellent: "hsl(165 55% 38%)",
  Good: "hsl(155 45% 72%)",
  Passable: "hsl(40 90% 55%)",
  Critical: "hsl(15 75% 55%)",
};

const GENDER_COLORS: Record<string, string> = {
  Homme: "hsl(220 70% 50%)",
  Femme: "hsl(340 75% 55%)",
  "Not provided": "hsl(0 0% 60%)",
};

const CHART_COLORS = [
  "hsl(220 70% 50%)",
  "hsl(160 60% 45%)",
  "hsl(30 90% 55%)",
  "hsl(280 65% 60%)",
  "hsl(340 75% 55%)",
  "hsl(190 80% 45%)",
];

const IMPORT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IMPORT_PHONE_RE = /^\+?[\d\s().-]{8,20}$/;
const IMPORT_EDU_LEVELS = new Set<string>(["Bac", "Bac+2", "Bac+3", "Bac+4", "Bac+5", "Bac+8"]);

function findExcelVal(normRow: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const found = Object.keys(normRow).find((nk) => nk === k || nk.includes(k));
    if (found && normRow[found] !== undefined && normRow[found] !== "") {
      return normRow[found];
    }
  }
  return null;
}

function parseImportDate(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00`);
    return !Number.isNaN(d.getTime()) && d <= new Date() ? s : null;
  }
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10);
    const year = parseInt(dmy[3], 10);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day && d <= new Date()) {
      return d.toISOString().slice(0, 10);
    }
  }
  const d = new Date(s);
  return !Number.isNaN(d.getTime()) && d <= new Date() ? d.toISOString().slice(0, 10) : null;
}

function parseImportEducation(raw: unknown): EducationLevel | null {
  if (raw == null || raw === "") return null;
  const eduStr = String(raw).trim().toLowerCase();
  if (eduStr.includes("8")) return "Bac+8";
  if (eduStr.includes("5")) return "Bac+5";
  if (eduStr.includes("4")) return "Bac+4";
  if (eduStr.includes("3")) return "Bac+3";
  if (eduStr.includes("2")) return "Bac+2";
  if (eduStr === "bac") return "Bac";
  const normalized = String(raw).trim();
  return IMPORT_EDU_LEVELS.has(normalized) ? (normalized as EducationLevel) : null;
}

function parseImportGender(raw: unknown): Gender | null {
  if (raw == null || raw === "") return null;
  const gStr = String(raw).trim().toLowerCase();
  if (gStr.startsWith("f")) return "Femme";
  if (gStr.startsWith("h") || gStr.startsWith("m")) return "Homme";
  return null;
}

function parseExcelCandidateRow(
  row: Record<string, unknown>,
  promotionId: string,
): CreateCandidatePayload | null {
  const normRow: Record<string, unknown> = {};
  Object.keys(row).forEach((k) => {
    normRow[k.toLowerCase().trim()] = row[k];
  });

  const rawFirstName = findExcelVal(normRow, "firstname", "first name", "prénom", "prenom", "name", "nom");
  const rawLastName = findExcelVal(normRow, "lastname", "last name", "family");

  let firstName = rawFirstName ? String(rawFirstName).trim() : "";
  let lastName = rawLastName ? String(rawLastName).trim() : "";

  if (rawFirstName && !rawLastName && firstName.includes(" ")) {
    const parts = firstName.split(" ");
    firstName = parts[0];
    lastName = parts.slice(1).join(" ");
  }

  if (!firstName || !lastName) return null;

  const email = String(findExcelVal(normRow, "email", "e-mail", "mail", "courriel") ?? "").trim();
  const phone = String(findExcelVal(normRow, "phone", "téléphone", "telephone", "tel", "mobile", "gsm") ?? "").trim();
  const recruitmentDate = parseImportDate(
    findExcelVal(normRow, "recruitment date", "recruitmentdate", "date de recrutement", "date recrutement", "date"),
  );
  const rawAge = findExcelVal(normRow, "age", "âge");
  const age = rawAge ? parseInt(String(rawAge), 10) : NaN;
  const gender = parseImportGender(findExcelVal(normRow, "gender", "sexe", "genre"));
  const educationLevel = parseImportEducation(
    findExcelVal(normRow, "education level", "education", "niveau d'étude", "niveau d'etude", "niveau", "etudes"),
  );
  const diplomaName = String(
    findExcelVal(normRow, "diploma name", "diploma", "diplôme", "diplome", "specialite", "spécialité", "filiere", "filière") ?? "",
  ).trim();
  const rawAvg = findExcelVal(normRow, "diploma average", "diploma avg", "moyenne diplome", "moyenne diplôme", "moyenne", "score", "note");
  const diplomaAverage = rawAvg ? parseFloat(String(rawAvg).replace(",", ".")) : NaN;

  if (!IMPORT_EMAIL_RE.test(email)) return null;
  if (!IMPORT_PHONE_RE.test(phone)) return null;
  if (!recruitmentDate) return null;
  if (!Number.isFinite(age) || age < 18 || age > 65) return null;
  if (!gender) return null;
  if (!educationLevel) return null;
  if (!diplomaName) return null;
  if (!Number.isFinite(diplomaAverage) || diplomaAverage < 0 || diplomaAverage > 20) return null;

  return {
    promotionId,
    firstName,
    lastName,
    email,
    phone,
    recruitmentDate,
    age,
    gender,
    educationLevel,
    diplomaName,
    diplomaAverage,
  };
}

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
  const { tab: tabFromSearch } = Route.useSearch();
  const promotion =
    useStore((s) => s.promotions.find((p) => p.id === id)) ??
    useStore((s) => s.archivedPromotions.find((p) => p.id === id));
  const loadPromotions = useStore((s) => s.loadPromotions);
  const loadArchivedPromotions = useStore((s) => s.loadArchivedPromotions);

  useEffect(() => {
    if (!promotion) {
      void Promise.all([loadPromotions(), loadArchivedPromotions()]);
    }
  }, [id, promotion, loadPromotions, loadArchivedPromotions]);

  const archive = useStore((s) => s.archivePromotion);
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState(tabFromSearch ?? "candidates");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [confirmOne, setConfirmOne] = useState(false);
  const [confirmTwo, setConfirmTwo] = useState(false);
  const [stats, setStats] = useState<PromotionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [deleteCandidate, setDeleteCandidate] = useState<CandidateListItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportLang, setExportLang] = useState<ExportLocale>("en");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editingCandidate = candidates.find((c) => c.id === editingCandidateId) ?? null;

  const hasFilters =
    search !== "" || filterCat !== "all" || filterStatus !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterCat("all");
    setFilterStatus("all");
  };

  const apiFilters = useMemo(
    () => ({
      promotion_id: id,
      q: search.trim() || undefined,
      category: filterCat === "all" ? undefined : filterCat,
      status: filterStatus === "all" ? undefined : filterStatus,
      sort: "avg_desc",
    }),
    [id, search, filterCat, filterStatus],
  );

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await fetchPromotionStats(id);
      setStats(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load promotion statistics");
    } finally {
      setStatsLoading(false);
    }
  }, [id]);

  const loadCandidates = useCallback(async () => {
    setCandidatesLoading(true);
    try {
      const response = await fetchCandidates(apiFilters);
      setCandidates(response.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load candidates");
    } finally {
      setCandidatesLoading(false);
    }
  }, [apiFilters]);

  const refreshData = useCallback(async () => {
    await Promise.all([loadStats(), loadCandidates()]);
  }, [loadStats, loadCandidates]);

  const handlePromotionExport = useCallback(async (format: "pdf" | "excel" | "html") => {
    if (!promotion) return;

    setExporting(true);
    try {
      const exportCandidates = await fetchPromotionExportCandidates(id);

      if (format === "pdf") exportPromotionPDF(promotion, exportCandidates, { locale: exportLang });
      else if (format === "excel") exportPromotionExcel(promotion, exportCandidates, { locale: exportLang });
      else exportPromotionHTML(promotion, exportCandidates, { locale: exportLang });

      toast.success("Export generated");
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Failed to export promotion");
    } finally {
      setExporting(false);
    }
  }, [id, promotion, exportLang]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCandidates();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadCandidates, search]);

  useEffect(() => {
    if (tabFromSearch) setActiveTab(tabFromSearch);
  }, [tabFromSearch]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !promotion) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (!useAuth.getState().token) {
          toast.error("Session expired. Please sign in again.");
          return;
        }

        const data = event.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { raw: false });

        if (rows.length === 0) {
          toast.error("The selected Excel file is empty");
          return;
        }

        let added = 0;
        let duplicates = 0;
        let skipped = 0;

        for (const row of rows) {
          const payload = parseExcelCandidateRow(row, promotion.id);
          if (!payload) {
            skipped++;
            continue;
          }

          try {
            await createCandidateApi(payload);
            added++;
          } catch (err) {
            const message = err instanceof Error ? err.message : "";
            if (message.toLowerCase().includes("unauthenticated")) {
              toast.error("Session expired. Please sign in again.");
              return;
            }
            if (message.toLowerCase().includes("email")) {
              duplicates++;
            } else {
              skipped++;
            }
          }
        }

        if (added > 0) {
          await refreshData();
          const parts = [`Successfully imported ${added} candidates!`];
          if (duplicates > 0) parts.push(`${duplicates} duplicates skipped`);
          if (skipped > 0) parts.push(`${skipped} invalid rows skipped`);
          toast.success(parts.join(" · "));
        } else if (duplicates > 0) {
          toast.warning(`No new candidates added. ${duplicates} duplicate emails found.`);
        } else {
          toast.error(
            skipped > 0
              ? "No valid rows found. Check required columns: name, email, phone, date, age, gender, education, diploma."
              : "Failed to import candidates. Please check the file format.",
          );
        }
      } catch (err) {
        console.error(err);
        toast.error("Error parsing Excel file. Make sure it's a valid .xlsx or .csv file.");
      } finally {
        if (e.target) e.target.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  const progress = stats?.progress ?? { workingDone: 0, totalWorking: 25, pct: 0 };
  const categoryDist = stats?.categoryDistribution ?? [];
  const scoreDist = stats?.scoreDistribution ?? [];
  const top3 = stats?.topPerformers ?? [];
  const genderDist = stats?.demographics.gender ?? [];
  const educationDist = stats?.demographics.education ?? [];
  const ageDist = stats?.demographics.age ?? [];
  const kpis = stats?.kpis ?? { totalCandidates: 0, passRate: 0, avgScore: 0, atRisk: 0 };

  const handleUpdate = async (candidateId: string, data: Parameters<typeof updateCandidateApi>[1]) => {
    await updateCandidateApi(candidateId, data);
    await refreshData();
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteCandidateApi(deleteCandidate.id);
      toast.success("Candidate deleted");
      setDeleteCandidate(null);
      setDeleteConfirmText("");
      await refreshData();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to delete candidate");
    }
  };

  if (!promotion) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Promotion not found</h2>
        <p className="text-sm text-muted-foreground mt-2">Loading or this promotion does not exist.</p>
        <Button asChild className="mt-4">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Dashboard</Link>
        </Button>
      </div>

      <ReminderContextBanner />

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
                  <Button variant="outline" size="sm" disabled={exporting}>
                    <Download className="mr-1 h-4 w-4" /> {exporting ? "Exporting…" : "Export"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Export promotion</DropdownMenuLabel>
                  <div className="px-2 pb-2">
                    <div className="text-xs text-muted-foreground mb-1.5">Language / Langue</div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={exportLang === "en" ? "default" : "outline"}
                        className="h-7 flex-1 px-2"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => setExportLang("en")}
                      >
                        EN
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={exportLang === "fr" ? "default" : "outline"}
                        className="h-7 flex-1 px-2"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => setExportLang("fr")}
                      >
                        FR
                      </Button>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={exporting} onClick={() => void handlePromotionExport("pdf")}>PDF</DropdownMenuItem>
                  <DropdownMenuItem disabled={exporting} onClick={() => void handlePromotionExport("excel")}>Excel</DropdownMenuItem>
                  <DropdownMenuItem disabled={exporting} onClick={() => void handlePromotionExport("html")}>HTML</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={archiveDialogOpen} onOpenChange={(open) => {
                setArchiveDialogOpen(open);
                if (!open) {
                  setConfirmOne(false);
                  setConfirmTwo(false);
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Archive
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Archive Promotion</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to archive this promotion? This action requires double confirmation.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox id="confirmOne" checked={confirmOne} onCheckedChange={(c) => setConfirmOne(!!c)} />
                      <Label htmlFor="confirmOne" className="leading-tight">
                        I confirm that this promotion should be archived.
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox id="confirmTwo" checked={confirmTwo} onCheckedChange={(c) => setConfirmTwo(!!c)} />
                      <Label htmlFor="confirmTwo" className="leading-tight">
                        I understand that candidates will be hidden from the main view.
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      disabled={!confirmOne || !confirmTwo}
                      onClick={async () => {
                        try {
                          await archive(promotion.id);
                          setArchiveDialogOpen(false);
                          toast.success("Promotion archived");
                          nav({ to: "/promotions" });
                        } catch (e) {
                          toast.error((e as Error).message || "Failed to archive");
                        }
                      }}
                    >
                      Confirm Archive
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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

      {statsLoading ? (
        <KpiSkeletonGrid count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Candidates" value={kpis.totalCandidates} icon={Users} />
          <KpiCard label="Pass Rate" value={`${kpis.passRate}%`} icon={TrendingUp} tone="success" />
          <KpiCard label="Average Score" value={kpis.avgScore.toFixed(2)} icon={Star} hint="/ 5" />
          <KpiCard label="At Risk" value={kpis.atRisk} icon={AlertTriangle} tone="warning" />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Top 3 Performers</CardTitle></CardHeader>
        <CardContent>
          {statsLoading ? (
            <p className="text-sm text-muted-foreground">Loading performers…</p>
          ) : top3.length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidates yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {top3.map((c, idx) => (
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
                      <p className="text-xs text-muted-foreground">{c.avgScore.toFixed(2)}/5</p>
                    </div>
                    <CategoryBadge category={c.category} />
                  </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="candidates">Candidates List</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
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
                          <Cell key={`cell-${index}`} fill={GENDER_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} />
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
                <CardTitle>Candidates ({candidatesLoading ? "…" : candidates.length})</CardTitle>
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
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Clear
                    </Button>
                  )}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button variant="outline" className="bg-muted/40" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> Import Excel
                  </Button>
                  <AddCandidateDialog promotionId={promotion.id} onSuccess={refreshData} />
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
                    {candidatesLoading ? (
                      <tr>
                        <td colSpan={7} className="py-4">
                          <TableRowSkeleton rows={5} cols={6} />
                        </td>
                      </tr>
                    ) : candidates.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b hover:bg-muted/30 cursor-pointer"
                          onDoubleClick={() => setEditingCandidateId(c.id)}
                          title="Double click to edit candidate"
                        >
                          <td className="py-2 px-3 font-medium flex items-center gap-1.5">
                            {c.firstName} {c.lastName}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground text-xs">{c.email}</td>
                          <td className="py-2 px-3 text-xs">{c.educationLevel}</td>
                          <td className="py-2 px-3 font-semibold">{c.avgScore.toFixed(2)}</td>
                          <td className="py-2 px-3"><CategoryBadge category={c.category} /></td>
                          <td className="py-2 px-3"><StatusBadge status={c.status} /></td>
                          <td className="py-2 px-3 flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Edit candidate"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingCandidateId(c.id);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete candidate"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleteCandidate(c);
                                setDeleteConfirmText("");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button asChild size="sm" variant="ghost">
                              <Link to="/candidates/$id" params={{ id: c.id }}>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                    ))}
                    {!candidatesLoading && candidates.length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No candidates found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <EditCandidateDialog
              candidate={editingCandidate}
              open={!!editingCandidate}
              onOpenChange={(open) => {
                if (!open) setEditingCandidateId(null);
              }}
              onSave={handleUpdate}
            />
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={!!deleteCandidate}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCandidate(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteCandidate?.firstName} {deleteCandidate?.lastName}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="promo-delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="promo-delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={() => void handleDelete()}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
