import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { showApiError } from "@/lib/api-error";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/badges";
import { formatDate, promotionProgress, promotionStatus, isWithinCustomRange } from "@/lib/calc";
import { ArrowRight, Search, Inbox, SlidersHorizontal, Calendar, Check, X, PencilLine, ChevronLeft, ChevronRight, ArrowDownUp, ChevronDown, MoreVertical, Archive, Trash2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  isSameYear, isSameQuarter, isSameMonth, isToday, isYesterday,
  isThisWeek, isThisMonth, isThisYear, subWeeks, subMonths, subYears, isSameWeek
} from "date-fns";
import { AddPromotionDialog } from "@/components/add-promotion-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/promotions/")({
  head: () => ({
    meta: [
      { title: "Promotions — CareerHub" },
      { name: "description", content: "All training promotions" },
    ],
  }),
  component: PromotionsList,
});

function EmptyState({ title, description, icon: Icon = Inbox }: { title: string; description: string; icon?: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
      <div className="bg-muted/50 h-16 w-16 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/70" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground max-w-[300px] mt-1">{description}</p>
    </div>
  );
}

function InlineEdit({
  initialValue,
  onSave,
}: {
  initialValue: string;
  onSave: (v: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setVal(initialValue);
  }, [initialValue, editing]);

  const commit = async () => {
    setSaving(true);
    try {
      await onSave(val);
      setEditing(false);
    } catch (err) {
      setVal(initialValue);
      showApiError(err, "Failed to save name");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <Input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="h-7 text-sm py-1 px-2 w-[180px] font-semibold"
          disabled={saving}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit();
            if (e.key === "Escape") { setVal(initialValue); setEditing(false); }
          }}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 text-success shrink-0" disabled={saving} onClick={() => void commit()}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => { setVal(initialValue); setEditing(false); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 cursor-pointer group/name rounded px-1 -ml-1 hover:bg-muted/50 transition-colors"
      onDoubleClick={() => setEditing(true)}
      title="Double-click to edit name"
    >
      <h3 className="font-semibold truncate text-lg tracking-tight select-none">{initialValue}</h3>
      <PencilLine className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity" />
    </div>
  );
}

function PromotionsList() {
  const promotions = useStore((s) => s.promotions);
  const promotionsLoading = useStore((s) => s.promotionsLoading);
  const loadPromotions = useStore((s) => s.loadPromotions);
  const updatePromotion = useStore((s) => s.updatePromotion);
  const archivePromotion = useStore((s) => s.archivePromotion);
  const deletePromotion = useStore((s) => s.deletePromotion);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    void loadPromotions({ search: debouncedSearch }).catch((err) =>
      showApiError(err, "Failed to load promotions"),
    );
  }, [debouncedSearch, loadPromotions]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"archive" | "delete" | null>(null);
  const [customSubOpen, setCustomSubOpen] = useState(false);
  const customSubCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeRange = useStore((s) => s.globalTimeRange);
  const customStart = useStore((s) => s.globalCustomStart);
  const customEnd = useStore((s) => s.globalCustomEnd);
  const setTimeRange = useStore((s) => s.setGlobalTimeRange);
  const setCustomStart = useStore((s) => s.setGlobalCustomStart);
  const setCustomEnd = useStore((s) => s.setGlobalCustomEnd);
  const clearFilters = useStore((s) => s.clearGlobalFilters);

  const handleClearFilters = () => {
    clearFilters();
    setStatusFilter("All");
    setSearchQuery("");
    setSortBy("newest");
    setCurrentPage(1);
  };

  const submitArchivePromotion = async () => {
    if (!archiveId || actionLoading === "archive") return;
    setActionLoading("archive");
    try {
      await archivePromotion(archiveId);
      setArchiveId(null);
      toast.success("Promotion archived");
    } catch (err) {
      showApiError(err, "Failed to archive promotion");
    } finally {
      setActionLoading(null);
    }
  };

  const submitDeletePromotion = async () => {
    if (!deleteId || actionLoading === "delete") return;
    setActionLoading("delete");
    try {
      await deletePromotion(deleteId);
      setDeleteId(null);
      toast.success("Promotion deleted — you can restore it from Archived");
    } catch (err) {
      showApiError(err, "Failed to delete promotion");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartChange = (val: string) => {
    if (val && customEnd && val > customEnd) {
      toast.error("Start date must be before end date");
      return;
    }
    setCustomStart(val);
    setTimeRange("custom");
  };

  const handleEndChange = (val: string) => {
    if (val && customStart && customStart > val) {
      toast.error("End date must be after start date");
      return;
    }
    setCustomEnd(val);
    setTimeRange("custom");
  };

  const openCustomSub = () => {
    if (customSubCloseTimer.current) {
      clearTimeout(customSubCloseTimer.current);
      customSubCloseTimer.current = null;
    }
    setCustomSubOpen(true);
    setTimeRange("custom");
  };

  const scheduleCloseCustomSub = () => {
    customSubCloseTimer.current = setTimeout(() => setCustomSubOpen(false), 200);
  };

  const timeRangeLabels: Record<string, string> = {
    all: "All Time", today: "Today", yesterday: "Yesterday",
    current_week: "Current Week", last_week: "Last Week",
    current_month: "Current Month", last_month: "Last Month",
    current_year: "Current Year", last_year: "Last Year",
    custom: "Custom Range"
  };

  // Filtered and sorted promotions
  const filteredPromotions = useMemo(() => {
    const today = new Date();

    let filtered = promotions.filter((p) => {
      // Exclude archived promotions from main list
      if (p.archived) return false;

      // Time Range Filter
      if (timeRange !== "all") {
        const d = new Date(p.startDate);
        switch (timeRange) {
          case "today": if (!isToday(d)) return false; break;
          case "yesterday": if (!isYesterday(d)) return false; break;
          case "current_week": if (!isThisWeek(d, { weekStartsOn: 1 })) return false; break;
          case "last_week": if (!isSameWeek(d, subWeeks(today, 1), { weekStartsOn: 1 })) return false; break;
          case "current_month": if (!isThisMonth(d)) return false; break;
          case "last_month": if (!isSameMonth(d, subMonths(today, 1))) return false; break;
          case "current_year": if (!isThisYear(d)) return false; break;
          case "last_year": if (!isSameYear(d, subYears(today, 1))) return false; break;
          case "custom": {
            if (!customStart && !customEnd) break;
            if (!isWithinCustomRange(p.startDate, customStart, customEnd)) return false;
            break;
          }
        }
      }

      // Status filter
      if (statusFilter !== "All") {
        const status = promotionStatus(p);
        if (status !== statusFilter) return false;
      }

      return true;
    });

    return filtered.map((p) => ({
       ...p,
       passRate: p.passRate ?? 0,
       avgScore: p.avgScore ?? 0,
       candsCount: p.candidateCount ?? 0,
    })).sort((a, b) => {
       if (sortBy === 'newest') return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
       if (sortBy === 'oldest') return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
       if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
       if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
       if (sortBy === 'pass_rate_desc') return b.passRate - a.passRate;
       return 0;
    });
  }, [promotions, statusFilter, timeRange, customStart, customEnd, sortBy]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filteredPromotions]);

  const itemsPerPage = 9;
  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);
  const paginatedPromotions = filteredPromotions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotions Directory</h1>
          <p className="text-muted-foreground mt-1">
            Manage, search, and filter all your training promotions.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild className="h-10">
            <Link to="/promotions/archived">
              <Inbox className="mr-2 h-4 w-4" /> View Archived
            </Link>
          </Button>
          <AddPromotionDialog />
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full lg:max-w-md shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Name or code PROMO-2026-001…"
            className="pl-9 pr-10 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-busy={promotionsLoading}
          />
          {promotionsLoading ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : searchQuery ? (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto lg:justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearFilters} 
            className={`text-muted-foreground hover:text-foreground shrink-0 transition-opacity ${
              (timeRange !== "all" || statusFilter !== "All" || searchQuery !== "" || customStart !== "" || customEnd !== "") ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            Clear
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[160px] justify-between font-normal bg-background">
                <div className="flex items-center truncate">
                  <Calendar className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{timeRangeLabels[timeRange]}</span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[160px]">
              <DropdownMenuRadioGroup
                value={timeRange === "custom" ? "" : timeRange}
                onValueChange={(v) => {
                  setTimeRange(v as typeof timeRange);
                  setCustomSubOpen(false);
                }}
              >
                <DropdownMenuRadioItem className="cursor-pointer" value="all">All Time</DropdownMenuRadioItem>
                <DropdownMenuRadioItem className="cursor-pointer" value="today">Today</DropdownMenuRadioItem>
                <DropdownMenuRadioItem className="cursor-pointer" value="yesterday">Yesterday</DropdownMenuRadioItem>
                <DropdownMenuRadioItem className="cursor-pointer" value="current_week">Current Week</DropdownMenuRadioItem>
                <DropdownMenuRadioItem className="cursor-pointer" value="last_week">Last Week</DropdownMenuRadioItem>
                <DropdownMenuRadioItem className="cursor-pointer" value="current_month">Current Month</DropdownMenuRadioItem>
                <DropdownMenuRadioItem className="cursor-pointer" value="last_month">Last Month</DropdownMenuRadioItem>
                <DropdownMenuRadioItem className="cursor-pointer" value="current_year">Current Year</DropdownMenuRadioItem>
                <DropdownMenuRadioItem className="cursor-pointer" value="last_year">Last Year</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuSub open={customSubOpen} onOpenChange={setCustomSubOpen}>
                <DropdownMenuSubTrigger
                  className={cn("cursor-pointer", timeRange === "custom" && "bg-accent")}
                  onPointerEnter={openCustomSub}
                  onPointerLeave={scheduleCloseCustomSub}
                  onClick={openCustomSub}
                >
                  Custom Range
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className="w-72 p-3"
                  sideOffset={4}
                  onPointerEnter={openCustomSub}
                  onPointerLeave={scheduleCloseCustomSub}
                  onPointerDown={(e) => e.preventDefault()}
                >
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-1.5">
                      <Label htmlFor="custom-start" className="text-xs text-muted-foreground">Start date</Label>
                      <Input
                        id="custom-start"
                        type="date"
                        className="h-9 bg-background"
                        value={customStart}
                        onChange={(e) => handleStartChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="custom-end" className="text-xs text-muted-foreground">End date</Label>
                      <Input
                        id="custom-end"
                        type="date"
                        className="h-9 bg-background"
                        value={customEnd}
                        onChange={(e) => handleEndChange(e.target.value)}
                      />
                    </div>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-background">
              <SlidersHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem className="cursor-pointer" value="All">All Statuses</SelectItem>
              <SelectItem className="cursor-pointer" value="Active">Active</SelectItem>
              <SelectItem className="cursor-pointer" value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] bg-background">
              <ArrowDownUp className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem className="cursor-pointer" value="newest">Newest First</SelectItem>
              <SelectItem className="cursor-pointer" value="oldest">Oldest First</SelectItem>
              <SelectItem className="cursor-pointer" value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem className="cursor-pointer" value="name_desc">Name (Z-A)</SelectItem>
              <SelectItem className="cursor-pointer" value="pass_rate_desc">Top Performance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid List */}
      {promotionsLoading && promotions.length === 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-2 w-full" />
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPromotions.length === 0 ? (
        <EmptyState
          title="No promotions found"
          description={
            debouncedSearch || statusFilter !== "All" || timeRange !== "all"
              ? "Try adjusting your search or filters."
              : "Create your first promotion using the button above."
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {paginatedPromotions.map((p) => {
              const progress = promotionProgress(p);
              const pr = p.passRate;
              const avg = p.avgScore;
              const candsCount = p.candsCount;

              return (
                <Card key={p.id} className={`hover:shadow-md transition-all group ${p.archived ? 'opacity-70 grayscale-[0.5]' : 'hover:border-primary/30'}`}>
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-muted-foreground">{p.id}</p>
                        <InlineEdit
                          initialValue={p.name}
                          onSave={async (newName) => {
                            if (!newName.trim() || newName.trim() === p.name) return;
                            await updatePromotion(p.id, { name: newName.trim() });
                            toast.success("Name saved");
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={p.archived ? "Archived" : promotionStatus(p)} />
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setArchiveId(p.id)}
                            >
                              <Archive className="mr-2 h-4 w-4" /> Archive Promotion
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setDeleteId(p.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Promotion
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/40 p-2.5 rounded-md border">
                      <span className="font-medium">{formatDate(p.startDate)}</span>
                      <ArrowRight className="h-4 w-4 mx-2 opacity-40" />
                      <span className="font-medium">{formatDate(p.endDate)}</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground font-medium">Timeline Progress</span>
                        <span className="font-bold">{progress.pct}%</span>
                      </div>
                      <Progress
                        value={progress.pct}
                        className="h-2.5 bg-muted/50"
                        indicatorClassName={progress.pct === 100 ? "bg-success" : "bg-primary"}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5 text-right font-medium">
                        {progress.workingDone} / {progress.totalWorking} working days
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center pt-3 border-t">
                      <div className="flex flex-col items-center p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <span className="font-bold text-foreground text-xl">{candsCount}</span>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Cands</span>
                      </div>
                      <div className="flex flex-col items-center p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <span className={`font-bold text-xl ${pr >= 70 ? 'text-success' : pr >= 50 ? 'text-warning-foreground' : 'text-destructive'}`}>
                          {pr}%
                        </span>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Pass</span>
                      </div>
                      <div className="flex flex-col items-center p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <span className="font-bold text-foreground text-xl">{avg.toFixed(1)}</span>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Avg</span>
                      </div>
                    </div>

                    <Button asChild variant={p.archived ? "outline" : "secondary"} className="w-full font-medium">
                      <Link to="/promotions/$id" params={{ id: p.id }}>
                        View Promotion Analytics <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4 mt-8">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredPromotions.length)}</span> of <span className="font-medium text-foreground">{filteredPromotions.length}</span> promotions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Archive Confirmation */}
      <AlertDialog open={!!archiveId} onOpenChange={(open) => !open && setArchiveId(null)}>
        <AlertDialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitArchivePromotion();
            }}
          >
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              The promotion will move to the archived list. Candidate data is kept in the database and will reappear when you restore the promotion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" className="cursor-pointer" disabled={actionLoading === "archive"}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              className="cursor-pointer"
              disabled={actionLoading === "archive"}
            >
              {actionLoading === "archive" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Archiving…
                </>
              ) : (
                "Archive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete (soft) Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitDeletePromotion();
            }}
          >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              The promotion will be removed from the active list and saved in archived promotions. Candidate data is not removed — use Restore to bring the promotion and its candidates back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" className="cursor-pointer" disabled={actionLoading === "delete"}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading === "delete"}
            >
              {actionLoading === "delete" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
