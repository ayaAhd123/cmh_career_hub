import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/badges";
import { formatDate, overallAverage, passRate, promotionProgress, promotionStatus } from "@/lib/calc";
import { ArrowRight, Search, Inbox, SlidersHorizontal, Calendar, Check, X, PencilLine, ChevronLeft, ChevronRight, ArrowDownUp, ChevronDown, MoreVertical, Archive, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
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

function PromotionsList() {
  const promotions = useStore((s) => s.promotions);
  const candidates = useStore((s) => s.candidates);
  const updatePromotion = useStore((s) => s.updatePromotion);
  const deletePromotion = useStore((s) => s.deletePromotion);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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
            if (customStart && d < new Date(customStart)) return false;
            if (customEnd && d > new Date(customEnd)) return false;
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

    return filtered.map(p => {
       const promoCands = candidates.filter((c) => c.promotionId === p.id && !c.archived);
       const pr = passRate(promoCands);
       const avg = promoCands.length > 0 ? promoCands.reduce((a, c) => a + overallAverage(c), 0) / promoCands.length : 0;
       return { ...p, passRate: pr, avgScore: avg, candsCount: promoCands.length, cands: promoCands };
    }).sort((a, b) => {
       if (sortBy === 'newest') return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
       if (sortBy === 'oldest') return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
       if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
       if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
       if (sortBy === 'pass_rate_desc') return b.passRate - a.passRate;
       return 0;
    });
  }, [promotions, candidates, searchQuery, statusFilter, timeRange, customStart, customEnd, sortBy]);

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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearFilters} 
            className={`text-muted-foreground hover:text-foreground shrink-0 transition-opacity ${
              (timeRange !== 'all' || statusFilter !== 'All' || searchQuery !== '') ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
              <DropdownMenuRadioGroup value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
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
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Custom Range</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-80 p-4" alignOffset={-130}>
                  <div className="flex flex-col gap-4">
                    <h4 className="font-medium leading-none">Custom Date Range</h4>
                    <p className="text-sm text-muted-foreground">Select the dates to apply the filter.</p>
                    <div className="grid gap-2">
                      <Label className="text-sm font-medium">Start Date</Label>
                      <Input type="date" value={customStart} onChange={e => { handleStartChange(e.target.value); setTimeRange('custom'); }} />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm font-medium">End Date</Label>
                      <Input type="date" value={customEnd} onChange={e => { handleEndChange(e.target.value); setTimeRange('custom'); }} />
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
      {filteredPromotions.length === 0 ? (
        <EmptyState
          title="No promotions found"
          description={searchQuery || statusFilter !== "All" ? "Try adjusting your search or filters to find what you're looking for." : "You haven't created any promotions yet."}
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
                          onSave={(newName) => {
                            if (newName.trim() && newName !== p.name) {
                              updatePromotion(p.id, { name: newName.trim() });
                            }
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the promotion and 
              remove all candidates and historical data associated with it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90" 
              onClick={() => {
                if (deleteId) {
                  deletePromotion(deleteId);
                  setDeleteId(null);
                  toast.success("Promotion permanently deleted");
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
