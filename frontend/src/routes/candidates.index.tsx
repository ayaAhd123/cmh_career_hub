import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import { EditCandidateDialog } from "@/components/edit-candidate-dialog";
import {
  ArrowRight, Search, X, Download, ChevronDown, Filter,
  FileText, FileCode, Sheet, Pencil, Trash2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
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
import type {
  CandidateStatus,
  EducationLevel,
  Gender,
  Category,
} from "@/lib/types";
import {
  type CandidateListItem,
  fetchCandidates,
  updateCandidateApi,
  deleteCandidateApi,
  exportCandidatesApi,
  downloadBlob,
} from "@/lib/candidate-api";
import { exportCandidatesExcel } from "@/lib/candidate-export";
import { formatGenderDisplay, type ExportLocale } from "@/lib/export-i18n";
import { ReminderContextBanner } from "@/components/reminder-context-banner";
import { toast } from "sonner";

export const Route = createFileRoute("/candidates/")({
  head: () => ({ meta: [{ title: "All Candidates — CareerHub" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    promotion_id: typeof search.promotion_id === "string" ? search.promotion_id : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: AllCandidates,
});

const STATUS_OPTIONS: CandidateStatus[] = ["Active", "Graduated", "Dismissed", "Terminated"];
const GENDER_OPTIONS: Gender[] = ["Homme", "Femme"];
const CATEGORY_OPTIONS: Category[] = ["Excellent", "Good", "Passable", "Critical"];
const EDU_OPTIONS: EducationLevel[] = ["Bac+2", "Bac+3", "Bac+5", "Bac+8"];
const SORT_OPTIONS = [
  { value: "avg_desc", label: "Best Average" },
  { value: "avg_asc", label: "Worst Average" },
  { value: "name_asc", label: "Name A→Z" },
  { value: "name_desc", label: "Name Z→A" },
  { value: "date_desc", label: "Newest" },
  { value: "date_asc", label: "Oldest" },
];

function AllCandidates() {
  const search = Route.useSearch();
  const promotions = useStore((s) => s.promotions);
  const loadPromotions = useStore((s) => s.loadPromotions);

  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | CandidateStatus>(() =>
    search.status && STATUS_OPTIONS.includes(search.status as CandidateStatus)
      ? (search.status as CandidateStatus)
      : "All",
  );
  const [genderFilter, setGenderFilter] = useState<"All" | Gender>("All");
  const [eduFilter, setEduFilter] = useState<"All" | EducationLevel>("All");
  const [categoryFilter, setCategoryFilter] = useState<"All" | Category>(() =>
    search.category && CATEGORY_OPTIONS.includes(search.category as Category)
      ? (search.category as Category)
      : "All",
  );
  const [promoFilter, setPromoFilter] = useState<"All" | string>(() => search.promotion_id ?? "All");
  const [sortBy, setSortBy] = useState("avg_desc");

  const activePromotions = useMemo(() => promotions.filter((p) => !p.archived), [promotions]);
  const [editingCandidate, setEditingCandidate] = useState<CandidateListItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<CandidateListItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [exportLang, setExportLang] = useState<ExportLocale>("en");

  const apiFilters = useMemo(
    () => ({
      q: q.trim() || undefined,
      status: statusFilter,
      gender: genderFilter,
      education_level: eduFilter,
      category: categoryFilter,
      promotion_id: promoFilter,
      sort: sortBy,
    }),
    [q, statusFilter, genderFilter, eduFilter, categoryFilter, promoFilter, sortBy],
  );

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchCandidates(apiFilters);
      setCandidates(response.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }, [apiFilters]);

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions]);

  useEffect(() => {
    if (search.promotion_id) setPromoFilter(search.promotion_id);
    if (search.category && CATEGORY_OPTIONS.includes(search.category as Category)) {
      setCategoryFilter(search.category as Category);
    }
    if (search.status && STATUS_OPTIONS.includes(search.status as CandidateStatus)) {
      setStatusFilter(search.status as CandidateStatus);
    }
  }, [search.promotion_id, search.category, search.status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCandidates();
    }, q ? 300 : 0);

    return () => clearTimeout(timer);
  }, [loadCandidates, q]);

  const hasFilters = q || statusFilter !== "All" || genderFilter !== "All" || eduFilter !== "All" || categoryFilter !== "All" || promoFilter !== "All";

  const clearFilters = () => {
    setQ("");
    setStatusFilter("All");
    setGenderFilter("All");
    setEduFilter("All");
    setCategoryFilter("All");
    setPromoFilter("All");
    setSortBy("avg_desc");
  };

  const handleExport = async (format: "xlsx" | "json" | "html") => {
    try {
      if (format === "xlsx") {
        if (candidates.length === 0) return;
        exportCandidatesExcel(candidates, exportLang);
        return;
      }

      const blob = await exportCandidatesApi(format, apiFilters, exportLang);
      downloadBlob(blob, `candidates.${format}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export candidates");
    }
  };

  const handleUpdate = async (id: string, data: Parameters<typeof updateCandidateApi>[1]) => {
    await updateCandidateApi(id, data);
    await loadCandidates();
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteCandidateApi(deleteCandidate.id);
      toast.success("Candidate deleted");
      setDeleteCandidate(null);
      setDeleteConfirmText("");
      await loadCandidates();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to delete candidate");
    }
  };

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sort";

  return (
    <div className="space-y-6">
      <ReminderContextBanner />
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Candidates</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Loading…" : `${candidates.length} candidate${candidates.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" disabled={loading || candidates.length === 0}>
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Export {candidates.length} candidates</DropdownMenuLabel>
            <div className="px-2 pb-2 text-xs text-muted-foreground">
              Grouped by promotion in export. Includes all statuses unless filtered.
            </div>
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
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => void handleExport("xlsx")}>
              <Sheet className="h-4 w-4 text-emerald-600" />
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => void handleExport("json")}>
              <FileCode className="h-4 w-4 text-blue-600" />
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => void handleExport("html")}>
              <FileText className="h-4 w-4 text-rose-600" />
              Export as HTML
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="candidates-search"
            placeholder="Search name, email, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 pr-8 bg-background"
          />
          {q && (
            <Button
              variant="ghost" size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
              onClick={() => setQ("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background">
              <Filter className="h-3.5 w-3.5" />
              {statusFilter === "All" ? "Status" : statusFilter}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as CandidateStatus | "All")}>
              <DropdownMenuRadioItem value="All">All Statuses</DropdownMenuRadioItem>
              {STATUS_OPTIONS.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>{s}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background">
              {genderFilter === "All" ? "Gender" : formatGenderDisplay(genderFilter)}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={genderFilter} onValueChange={(v) => setGenderFilter(v as Gender | "All")}>
              <DropdownMenuRadioItem value="All">All Genders</DropdownMenuRadioItem>
              {GENDER_OPTIONS.map((g) => (
                <DropdownMenuRadioItem key={g} value={g}>{formatGenderDisplay(g)}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background">
              {eduFilter === "All" ? "Education" : eduFilter}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={eduFilter} onValueChange={(v) => setEduFilter(v as EducationLevel | "All")}>
              <DropdownMenuRadioItem value="All">All Levels</DropdownMenuRadioItem>
              {EDU_OPTIONS.map((e) => (
                <DropdownMenuRadioItem key={e} value={e}>{e}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background">
              {categoryFilter === "All" ? "Category" : categoryFilter}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as Category | "All")}>
              <DropdownMenuRadioItem value="All">All Categories</DropdownMenuRadioItem>
              {CATEGORY_OPTIONS.map((c) => (
                <DropdownMenuRadioItem key={c} value={c}>{c}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background max-w-[180px]">
              <span className="truncate">
                {promoFilter === "All"
                  ? "Promotion"
                  : promoFilter === "none"
                    ? "Unassigned"
                    : (promotions.find((p) => p.id === promoFilter)?.name ?? promoFilter)}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-60 overflow-y-auto">
            <DropdownMenuRadioGroup value={promoFilter} onValueChange={setPromoFilter}>
              <DropdownMenuRadioItem value="All">All Promotions</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="none">Unassigned</DropdownMenuRadioItem>
              {activePromotions.map((p) => (
                <DropdownMenuRadioItem key={p.id} value={p.id}>{p.name}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background">
              {sortLabel}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuRadioItem key={o.value} value={o.value}>{o.label}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">
            {loading ? "Loading…" : `${candidates.length} candidate${candidates.length !== 1 ? "s" : ""}`}
            {hasFilters && !loading && <span className="text-muted-foreground font-normal text-sm ml-1">(filtered)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <p className="font-medium">Loading candidates…</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <p className="font-medium">No candidates found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
              {hasFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Gender</th>
                  <th className="py-2.5 px-3">Education</th>
                  <th className="py-2.5 px-3">Promotion</th>
                  <th className="py-2.5 px-3">Avg</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{c.email}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground">{formatGenderDisplay(String(c.gender))}</td>
                    <td className="py-2.5 px-3 text-xs">{c.educationLevel}</td>
                    <td className="py-2.5 px-3 text-xs">
                      {c.promotionId ? (
                        <Link
                          to="/promotions/$id"
                          params={{ id: c.promotionId }}
                          className="text-blue-600 transition-colors hover:text-orange-500 hover:bg-transparent"
                        >
                          {c.promotionName || c.promotionId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold tabular-nums">{c.avgScore.toFixed(2)}</td>
                    <td className="py-2.5 px-3"><CategoryBadge category={c.category} /></td>
                    <td className="py-2.5 px-3"><StatusBadge status={c.status} /></td>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit candidate"
                        onClick={() => setEditingCandidate(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete candidate"
                        onClick={() => {
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
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <EditCandidateDialog
        candidate={editingCandidate}
        open={!!editingCandidate}
        onOpenChange={(open) => {
          if (!open) setEditingCandidate(null);
        }}
        onSave={handleUpdate}
      />

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
              Type DELETE below to confirm. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder="DELETE"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={() => void handleDelete()}
            >
              Delete candidate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
