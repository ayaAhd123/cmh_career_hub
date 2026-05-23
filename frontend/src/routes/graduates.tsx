import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryBadge } from "@/components/badges";
import { EditCandidateDialog } from "@/components/edit-candidate-dialog";
import { categoryFor, formatDate, overallAverage } from "@/lib/calc";
import { Award, Download, Filter, Search, X, ChevronDown, Pencil, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
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
import type { Candidate, CandidateStatus, EducationLevel, Gender, Category } from "@/lib/types";
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
  const allCandidates = useStore((s) => s.candidates);
  const promotions = useStore((s) => s.promotions);
  const hardDeleteCandidate = useStore((s) => s.hardDeleteCandidate);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [genderFilter, setGenderFilter] = useState<string>("All");
  const [educationFilter, setEducationFilter] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Candidate | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const candidates = useMemo(
    () => allCandidates.filter((c) => !c.archived && (c.status === "Graduated" || (overallAverage(c) >= 10 && c.status !== "Active"))),
    [allCandidates],
  );

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase());
      const category = categoryFor(overallAverage(c));
      const matchesCategory = selectedCategory === "All" || category === selectedCategory;
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      const matchesGender = genderFilter === "All" || c.gender === genderFilter;
      const matchesEducation = educationFilter === "All" || c.educationLevel === educationFilter;
      return matchesSearch && matchesCategory && matchesStatus && matchesGender && matchesEducation;
    });
  }, [candidates, searchTerm, selectedCategory, statusFilter, genderFilter, educationFilter]);

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

  const exportXls = () => {
    const rows = candidates.map((c) => {
      const promo = promotions.find((p) => p.id === c.promotionId);
      return {
        Name: `${c.firstName} ${c.lastName}`,
        Email: c.email,
        Phone: c.phone,
        Promotion: promo?.name ?? "",
        Education: c.educationLevel,
        Diploma: c.diplomaName,
        "Final Score": overallAverage(c).toFixed(2),
        Category: categoryFor(overallAverage(c)),
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Graduates");
    XLSX.writeFile(wb, "graduates.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="text-success" /> Graduates
          </h1>
          <p className="text-muted-foreground mt-1">
            Candidates who successfully completed their training.
          </p>
        </div>
        <Button onClick={exportXls}>
          <Download className="mr-1 h-4 w-4" /> Export Excel
        </Button>
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
        <CardHeader><CardTitle>{filteredCandidates.length} of {candidates.length} graduates</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Promotion</th>
              <th className="py-2 px-3">Education</th>
              <th className="py-2 px-3">Final Score</th>
              <th className="py-2 px-3">Category</th>
              <th></th>
            </tr></thead>
            <tbody>
              {filteredCandidates.map((c) => {
                const a = overallAverage(c);
                const promo = promotions.find((p) => p.id === c.promotionId);
                return (
                  <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 font-medium">{c.firstName} {c.lastName}</td>
                    <td className="py-2 px-3 text-xs">{promo?.name}</td>
                    <td className="py-2 px-3">{c.educationLevel}</td>
                    <td className="py-2 px-3 font-semibold">{a.toFixed(2)}/20</td>
                    <td className="py-2 px-3"><CategoryBadge category={categoryFor(a)} /></td>
                    <td className="py-2 px-3 flex items-center gap-2">
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
                        <Link to="/candidates/$id" params={{ id: c.id }}>View</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredCandidates.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No graduates found.</td></tr>
              )}
            </tbody>
          </table>
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
