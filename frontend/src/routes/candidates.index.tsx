import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import { EditCandidateDialog } from "@/components/edit-candidate-dialog";
import { categoryFor, overallAverage } from "@/lib/calc";
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
  Candidate,
  CandidateStatus,
  EducationLevel,
  Gender,
  Category,
} from "@/lib/types";

export const Route = createFileRoute("/candidates/")({
  head: () => ({ meta: [{ title: "All Candidates — CareerHub" }] }),
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
  const allCandidates = useStore((s) => s.candidates);
  const promotions = useStore((s) => s.promotions);
  const hardDeleteCandidate = useStore((s) => s.hardDeleteCandidate);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | CandidateStatus>("All");
  const [genderFilter, setGenderFilter] = useState<"All" | Gender>("All");
  const [eduFilter, setEduFilter] = useState<"All" | EducationLevel>("All");
  const [categoryFilter, setCategoryFilter] = useState<"All" | Category>("All");
  const [promoFilter, setPromoFilter] = useState<"All" | string>("All");
  const [sortBy, setSortBy] = useState("avg_desc");

  const activePromotions = useMemo(() => promotions.filter((p) => !p.archived), [promotions]);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Candidate | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const filtered = useMemo(() => {
    let list = allCandidates.filter((c) => !c.archived);

    if (q.trim()) {
      const lower = q.toLowerCase();
      list = list.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(lower) ||
          c.email.toLowerCase().includes(lower) ||
          c.phone?.toLowerCase().includes(lower)
      );
    }
    if (statusFilter !== "All") list = list.filter((c) => c.status === statusFilter);
    if (genderFilter !== "All") list = list.filter((c) => c.gender === genderFilter);
    if (eduFilter !== "All") list = list.filter((c) => c.educationLevel === eduFilter);
    if (categoryFilter !== "All") list = list.filter((c) => categoryFor(overallAverage(c)) === categoryFilter);
    if (promoFilter !== "All") list = list.filter((c) => c.promotionId === promoFilter);

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "avg_asc": return overallAverage(a) - overallAverage(b);
        case "name_asc": return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case "name_desc": return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
        case "date_asc": return new Date(a.recruitmentDate).getTime() - new Date(b.recruitmentDate).getTime();
        case "date_desc": return new Date(b.recruitmentDate).getTime() - new Date(a.recruitmentDate).getTime();
        default: return overallAverage(b) - overallAverage(a);
      }
    });

    return list;
  }, [allCandidates, q, statusFilter, genderFilter, eduFilter, categoryFilter, promoFilter, sortBy]);

  const hasFilters = q || statusFilter !== "All" || genderFilter !== "All" || eduFilter !== "All" || categoryFilter !== "All" || promoFilter !== "All";

  const clearFilters = () => {
    setQ(""); setStatusFilter("All"); setGenderFilter("All");
    setEduFilter("All"); setCategoryFilter("All"); setPromoFilter("All"); setSortBy("avg_desc");
  };

  // ── Export helpers ────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Gender", "Age", "Education", "Promotion", "Status", "Avg Score", "Category", "Recruitment Date"];
    const rows = filtered.map((c) => {
      const avg = overallAverage(c);
      const promo = promotions.find((p) => p.id === c.promotionId)?.name ?? "";
      return [
        c.firstName, c.lastName, c.email, c.phone, c.gender, c.age,
        c.educationLevel, promo, c.status, avg.toFixed(2), categoryFor(avg), c.recruitmentDate
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    triggerDownload(new Blob([csv], { type: "text/csv" }), "candidates.csv");
  };

  const exportJSON = () => {
    const data = filtered.map((c) => {
      const avg = overallAverage(c);
      const promo = promotions.find((p) => p.id === c.promotionId)?.name ?? "";
      return { ...c, promotionName: promo, avgScore: avg, category: categoryFor(avg) };
    });
    triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "candidates.json");
  };

  const exportHTML = () => {
    const rows = filtered.map((c) => {
      const avg = overallAverage(c);
      const promo = promotions.find((p) => p.id === c.promotionId)?.name ?? "—";
      return `<tr>
        <td>${c.firstName} ${c.lastName}</td>
        <td>${c.email}</td>
        <td>${c.phone ?? ""}</td>
        <td>${c.gender}</td>
        <td>${c.age ?? ""}</td>
        <td>${c.educationLevel}</td>
        <td>${promo}</td>
        <td>${c.status}</td>
        <td>${avg.toFixed(2)}</td>
        <td>${categoryFor(avg)}</td>
        <td>${c.recruitmentDate}</td>
      </tr>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>All Candidates — CareerHub</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 22px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:last-child td { border-bottom: none; }
  </style>
</head>
<body>
  <h1>All Candidates (${filtered.length})</h1>
  <p style="color:#6b7280;font-size:12px;margin-bottom:12px;">Exported on ${new Date().toLocaleDateString()}</p>
  <table>
    <thead><tr>
      <th>Name</th><th>Email</th><th>Phone</th><th>Gender</th><th>Age</th>
      <th>Education</th><th>Promotion</th><th>Status</th><th>Avg</th><th>Category</th><th>Date</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
    triggerDownload(new Blob([html], { type: "text/html" }), "candidates.html");
  };

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sort";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Candidates</h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length} candidate{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Export {filtered.length} candidates</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={exportCSV}>
              <Sheet className="h-4 w-4 text-emerald-600" />
              Export as CSV (Excel)
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={exportJSON}>
              <FileCode className="h-4 w-4 text-blue-600" />
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={exportHTML}>
              <FileText className="h-4 w-4 text-rose-600" />
              Export as HTML
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
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

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background">
              <Filter className="h-3.5 w-3.5" />
              {statusFilter === "All" ? "Status" : statusFilter}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <DropdownMenuRadioItem value="All">All Statuses</DropdownMenuRadioItem>
              {STATUS_OPTIONS.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>{s}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Gender filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background">
              {genderFilter === "All" ? "Gender" : genderFilter}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={genderFilter} onValueChange={(v) => setGenderFilter(v as any)}>
              <DropdownMenuRadioItem value="All">All Genders</DropdownMenuRadioItem>
              {GENDER_OPTIONS.map((g) => (
                <DropdownMenuRadioItem key={g} value={g}>{g}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Education filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background">
              {eduFilter === "All" ? "Education" : eduFilter}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={eduFilter} onValueChange={(v) => setEduFilter(v as any)}>
              <DropdownMenuRadioItem value="All">All Levels</DropdownMenuRadioItem>
              {EDU_OPTIONS.map((e) => (
                <DropdownMenuRadioItem key={e} value={e}>{e}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background">
              {categoryFilter === "All" ? "Category" : categoryFilter}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
              <DropdownMenuRadioItem value="All">All Categories</DropdownMenuRadioItem>
              {CATEGORY_OPTIONS.map((c) => (
                <DropdownMenuRadioItem key={c} value={c}>{c}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Promotion filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-background max-w-[180px]">
              <span className="truncate">
                {promoFilter === "All" ? "Promotion" : (promotions.find((p) => p.id === promoFilter)?.name ?? "Promotion")}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-60 overflow-y-auto">
            <DropdownMenuRadioGroup value={promoFilter} onValueChange={(v) => setPromoFilter(v)}>
              <DropdownMenuRadioItem value="All">All Promotions</DropdownMenuRadioItem>
              {activePromotions.map((p) => (
                <DropdownMenuRadioItem key={p.id} value={p.id}>{p.name}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
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

        {/* Clear */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">
            {filtered.length} candidate{filtered.length !== 1 ? "s" : ""}
            {hasFilters && <span className="text-muted-foreground font-normal text-sm ml-1">(filtered)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-4">
          {filtered.length === 0 ? (
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
                {filtered.map((c) => {
                  const a = overallAverage(c);
                  const promo = promotions.find((p) => p.id === c.promotionId);
                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">{c.email}</td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">{c.gender}</td>
                      <td className="py-2.5 px-3 text-xs">{c.educationLevel}</td>
                      <td className="py-2.5 px-3 text-xs">
                        {promo ? (
                          <Link
                            to="/promotions/$id"
                            params={{ id: promo.id }}
                            className="text-blue-600 transition-colors hover:text-orange-500 hover:bg-transparent"
                          >
                            {promo.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold tabular-nums">{a.toFixed(2)}</td>
                      <td className="py-2.5 px-3"><CategoryBadge category={categoryFor(a)} /></td>
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
                  );
                })}
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
              onClick={() => {
                if (!deleteCandidate) return;
                hardDeleteCandidate(deleteCandidate.id);
                setDeleteCandidate(null);
                setDeleteConfirmText("");
              }}
            >
              Delete candidate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
