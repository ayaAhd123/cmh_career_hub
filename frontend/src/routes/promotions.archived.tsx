import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useStore } from "@/lib/store";
import type { TimeRange } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/badges";
import { formatDate, overallAverage, passRate, promotionProgress, promotionStatus, isWithinCustomRange } from "@/lib/calc";
import { ArrowRight, Search, Inbox, SlidersHorizontal, Calendar, Check, X, PencilLine, ArrowLeft, MoreVertical, ArchiveRestore, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  isSameYear, isSameQuarter, isSameMonth, isToday, isYesterday,
  isThisWeek, isThisMonth, isThisYear, subWeeks, subMonths, subYears, isSameWeek
} from "date-fns";
import { AddPromotionDialog } from "@/components/add-promotion-dialog";
import { PromotionCardSkeletonGrid, EmptyStateMessage } from "@/components/loading-states";

export const Route = createFileRoute("/promotions/archived")({
  head: () => ({
    meta: [
      { title: "Archived Promotions — CareerHub" },
      { name: "description", content: "All archived training promotions" },
    ],
  }),
  component: ArchivedPromotions,
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

function InlineEdit({ initialValue, onSave }: { initialValue: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initialValue);

  if (editing) {
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <Input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="h-7 text-sm py-1 px-2 w-[180px] font-semibold"
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onSave(val); setEditing(false); }
            if (e.key === 'Escape') { setVal(initialValue); setEditing(false); }
          }}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 text-success shrink-0" onClick={() => { onSave(val); setEditing(false); }}>
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

function ArchivedPromotions() {
  const candidates = useStore((s) => s.candidates);
  const archivedPromotions = useStore((s) => s.archivedPromotions);
  const archivedPromotionsLoaded = useStore((s) => s.archivedPromotionsLoaded);
  const archivedPromotionsLoading = useStore((s) => s.archivedPromotionsLoading);
  const loadArchivedPromotions = useStore((s) => s.loadArchivedPromotions);
  const updatePromotion = useStore((s) => s.updatePromotion);
  const restorePromotion = useStore((s) => s.restorePromotion);
  const permanentDeletePromotion = useStore((s) => s.permanentDeletePromotion);

  useEffect(() => {
    if (!archivedPromotionsLoaded) void loadArchivedPromotions();
  }, [archivedPromotionsLoaded, loadArchivedPromotions]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
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
  };

  const handleStartChange = (val: string) => {
    if (val && customEnd && val > customEnd) {
      toast.error("La date de début doit être avant la date de fin");
      return;
    }
    setCustomStart(val);
    setTimeRange("custom");
  };

  const handleEndChange = (val: string) => {
    if (val && customStart && customStart > val) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }
    setCustomEnd(val);
    setTimeRange("custom");
  };

  // Filtered and sorted promotions
  const filteredPromotions = useMemo(() => {
    let sorted = [...archivedPromotions].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );
    const today = new Date();

    return sorted.filter((p) => {
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

      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(searchLower) || p.id.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== "All") {
        const status = promotionStatus(p);
        if (status !== statusFilter) return false;
      }

      return true;
    });
  }, [archivedPromotions, searchQuery, statusFilter, timeRange, customStart, customEnd]);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/promotions" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Promotions
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Archived Promotions</h1>
            <p className="text-muted-foreground mt-1">
              View and manage historically archived training promotions.
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full lg:max-w-md shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search promotions by name or ID..."
            className="pl-9 pr-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto lg:justify-end">
          {(timeRange !== 'all' || statusFilter !== 'All' || searchQuery !== '') && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground hover:text-foreground shrink-0">
              Clear
            </Button>
          )}

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px] bg-background">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Time" />
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-background">
              <SlidersHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid List */}
      {archivedPromotionsLoading && !archivedPromotionsLoaded ? (
        <PromotionCardSkeletonGrid count={6} />
      ) : filteredPromotions.length === 0 ? (
        <EmptyStateMessage
          title="No archived promotions"
          description={
            searchQuery || statusFilter !== "All"
              ? "Try adjusting your search or filters."
              : "When you archive a promotion, it will appear here."
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredPromotions.map((p) => {
            const promoCands = candidates.filter((c) => c.promotionId === p.id && !c.archived);
            const progress = promotionProgress(p);
            const avg = promoCands.length > 0
              ? promoCands.reduce((a, c) => a + overallAverage(c), 0) / promoCands.length
              : 0;
            const pr = passRate(promoCands);

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
                          toast.success("Promotion name saved");
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
                            onClick={() => setRestoreId(p.id)}
                          >
                            <ArchiveRestore className="mr-2 h-4 w-4" /> Restore Promotion
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
                      <span className="font-bold text-foreground text-xl">{promoCands.length}</span>
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
      )}

      <AlertDialog open={!!restoreId} onOpenChange={(open) => !open && setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              The promotion and its candidates will return to the active promotions list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={async () => {
                if (!restoreId) return;
                try {
                  await restorePromotion(restoreId);
                  setRestoreId(null);
                  toast.success("Promotion restored with its candidates");
                } catch (e) {
                  toast.error((e as Error).message || "Failed to restore");
                }
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the promotion from the database. Use this only when you are sure you will never need to restore it. Candidate records linked to this promotion may also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90" 
              onClick={async () => {
                if (!deleteId) return;
                try {
                  await permanentDeletePromotion(deleteId);
                  setDeleteId(null);
                  toast.success("Promotion permanently deleted");
                } catch (e) {
                  toast.error((e as Error).message || "Failed to delete");
                }
              }}
            >
              Delete Promotion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
