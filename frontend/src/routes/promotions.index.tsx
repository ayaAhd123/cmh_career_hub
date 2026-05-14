import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/badges";
import { formatDate, overallAverage, passRate, promotionProgress, promotionStatus } from "@/lib/calc";
import { ArrowRight, Search, Inbox, SlidersHorizontal, Calendar, Check, X, PencilLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { isSameYear, isSameQuarter, isSameMonth } from "date-fns";
import { AddPromotionDialog } from "@/components/add-promotion-dialog";

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
  const candidates = useStore((s) => s.candidates);
  const promotions = useStore((s) => s.promotions);
  const updatePromotion = useStore((s) => s.updatePromotion);

  type TimeRange = "all" | "year" | "quarter" | "month";

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [showArchived, setShowArchived] = useState(false);

  // Filtered and sorted promotions
  const filteredPromotions = useMemo(() => {
    let sorted = [...promotions].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const today = new Date();
    
    return sorted.filter((p) => {
      // Archive filter
      if (p.archived && !showArchived) return false;

      // Time Range Filter
      if (timeRange !== "all") {
        const d = new Date(p.startDate);
        if (timeRange === "year" && !isSameYear(d, today)) return false;
        if (timeRange === "quarter" && !isSameQuarter(d, today)) return false;
        if (timeRange === "month" && !isSameMonth(d, today)) return false;
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
  }, [promotions, searchQuery, statusFilter, showArchived, timeRange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotions Directory</h1>
          <p className="text-muted-foreground mt-1">
            Manage, search, and filter all your training promotions.
          </p>
        </div>
        <AddPromotionDialog />
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full sm:max-w-md">
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
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px] bg-background">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

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

          <div className="flex items-center space-x-2 border-l pl-4">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="text-sm font-medium cursor-pointer">
              Show Archived
            </Label>
          </div>
        </div>
      </div>

      {/* Grid List */}
      {filteredPromotions.length === 0 ? (
        <EmptyState 
          title="No promotions found" 
          description={searchQuery || statusFilter !== "All" || showArchived ? "Try adjusting your search or filters to find what you're looking for." : "You haven't created any promotions yet."} 
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
                    <div className="min-w-0">
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
                    <StatusBadge status={p.archived ? "Archived" : promotionStatus(p)} />
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
    </div>
  );
}
