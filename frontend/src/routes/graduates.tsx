import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryBadge } from "@/components/badges";
import { EditCandidateDialog } from "@/components/edit-candidate-dialog";
import {
  type CandidateListItem,
  candidateDetailToCandidate,
  deleteCandidateApi,
  fetchCandidateApi,
  fetchCandidates,
  updateCandidateApi,
  exportCandidatesApi,
  downloadBlob,
} from "@/lib/candidate-api";
import { exportCandidatesExcel } from "@/lib/candidate-export";
import type { ExportLocale } from "@/lib/export-i18n";
import { Award, Download, Filter, Search, X, ChevronDown, Pencil, Trash2, FileText, FileCode, Sheet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { TableRowSkeleton, EmptyStateMessage, ErrorStateMessage } from "@/components/loading-states";
import type { Candidate, CandidateStatus, EducationLevel, Gender, Category } from "@/lib/types";
import { toast } from "sonner";
import { formatGenderDisplay } from "@/lib/export-i18n";

const STATUS_OPTIONS: CandidateStatus[] = ["Active", "Graduated", "Dismissed", "Terminated"];
const GENDER_OPTIONS: Gender[] = ["Homme", "Femme"];
const EDU_OPTIONS: EducationLevel[] = ["Bac+2", "Bac+3", "Bac+5", "Bac+8"];
const CATEGORY_OPTIONS: Category[] = ["Excellent", "Good", "Passable", "Critical"];

export const Route = createFileRoute("/graduates")({
  head: () => ({ meta: [{ title: "Graduates — CareerHub" }] }),
  component: Graduates,
});

function Graduates() {
  const promotions = useStore((s) => s.promotions);
  const loadPromotions = useStore((s) => s.loadPromotions);

  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [genderFilter, setGenderFilter] = useState<string>("All");
  const [educationFilter, setEducationFilter] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<CandidateListItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [exportLang, setExportLang] = useState<ExportLocale>("en");

  const apiFilters = useMemo(
    () => ({
      scope: "graduates" as const,
      q: searchTerm.trim() || undefined,
      status: statusFilter,
      gender: genderFilter,
      education_level: educationFilter,
      category: selectedCategory,
      sort: "avg_desc",
    }),
    [searchTerm, statusFilter, genderFilter, educationFilter, selectedCategory],
  );

  const loadGraduates = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetchCandidates(apiFilters);
      setCandidates(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load graduates";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [apiFilters]);

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions]);

  useEffect(() => {
    void loadGraduates();
  }, [loadGraduates]);

  const hasFilters =
    searchTerm ||
    statusFilter !== "All" ||
    genderFilter !== "All" ||
    educationFilter !== "All" ||
    selectedCategory !== "All";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setGenderFilter("All");
    setEducationFilter("All");
    setSelectedCategory("All");
  };

  const handleExport = async (format: "xlsx" | "json" | "html") => {
    try {
      if (format === "xlsx") {
        if (candidates.length === 0) return;
        exportCandidatesExcel(candidates, exportLang);
        return;
      }

      const blob = await exportCandidatesApi(format, apiFilters, exportLang);
      downloadBlob(blob, `graduates.${format}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export graduates");
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteCandidateApi(deleteCandidate.id);
      toast.success("Candidate deleted");
      setDeleteCandidate(null);
      setDeleteConfirmText("");
      await loadGraduates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete candidate");
    }
  };

  const openEdit = async (item: CandidateListItem) => {
    try {
      const detail = await fetchCandidateApi(item.id);
      setEditingCandidate(candidateDetailToCandidate(detail));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load candidate");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="text-success" /> Graduates
          </h1>
          <p className="text-muted-foreground mt-1">
            Candidates marked as graduated or who have passed training (avg ≥ 2.5/5).
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
            <DropdownMenuLabel>Export {candidates.length} graduates</DropdownMenuLabel>
            <div className="px-2 pb-2 text-xs text-muted-foreground">
              Grouped by promotion in export. Includes current filters.
            </div>
            <div className="px-2 pb-2">
              <div className="text-xs text-muted-foreground mb-1.5">Language</div>
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
            id="graduates-search"
            placeholder="Search name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 bg-background"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
              onClick={() => setSearchTerm("")}
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
            <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
              <DropdownMenuRadioItem value="All">All Statuses</DropdownMenuRadioItem>
              {STATUS_OPTIONS.map((status) => (
                <DropdownMenuRadioItem key={status} value={status}>{status}</DropdownMenuRadioItem>
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
            <DropdownMenuRadioGroup value={genderFilter} onValueChange={setGenderFilter}>
              <DropdownMenuRadioItem value="All">All Genders</DropdownMenuRadioItem>
              {GENDER_OPTIONS.map((gender) => (
                <DropdownMenuRadioItem key={gender} value={gender}>
                  {formatGenderDisplay(gender)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background">
              {educationFilter === "All" ? "Education" : educationFilter}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={educationFilter} onValueChange={setEducationFilter}>
              <DropdownMenuRadioItem value="All">All Levels</DropdownMenuRadioItem>
              {EDU_OPTIONS.map((education) => (
                <DropdownMenuRadioItem key={education} value={education}>{education}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background">
              {selectedCategory === "All" ? "Category" : selectedCategory}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
              <DropdownMenuRadioItem value="All">All Categories</DropdownMenuRadioItem>
              {CATEGORY_OPTIONS.map((category) => (
                <DropdownMenuRadioItem key={category} value={category}>{category}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5 mr-1.5" /> Clear
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? "Loading…" : `${candidates.length} graduate${candidates.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <TableRowSkeleton rows={8} cols={6} />
          ) : loadError ? (
            <ErrorStateMessage description={loadError} onRetry={() => void loadGraduates()} />
          ) : candidates.length === 0 ? (
            <EmptyStateMessage
              title="No graduates yet"
              description="Mark a candidate as Graduated on their profile, or ensure they have a passing average (≥ 2.5/5)."
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Promotion</th>
                  <th className="py-2 px-3">Education</th>
                  <th className="py-2 px-3">Final Score</th>
                  <th className="py-2 px-3">Category</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 font-medium">{c.firstName} {c.lastName}</td>
                    <td className="py-2 px-3 text-xs">
                      {c.promotionId ? (
                        <Link
                          to="/promotions/$id"
                          params={{ id: c.promotionId }}
                          className="text-primary hover:underline"
                        >
                          {c.promotionName || c.promotionId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 px-3">{c.educationLevel}</td>
                    <td className="py-2 px-3 font-semibold tabular-nums">{c.avgScore.toFixed(2)}/5</td>
                    <td className="py-2 px-3"><CategoryBadge category={c.category} /></td>
                    <td className="py-2 px-3 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit candidate"
                        onClick={() => void openEdit(c)}
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
                        <Link to="/candidates/$id" params={{ id: c.id }}>View</Link>
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
        onSave={async (id, data) => {
          await updateCandidateApi(id, data);
          await loadGraduates();
        }}
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
              Type DELETE below to confirm.
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
