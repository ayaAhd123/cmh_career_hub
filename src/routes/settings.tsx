import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — NexusHR" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const reset = useStore((s) => s.resetSeed);
  const restore = useStore((s) => s.restoreCandidate);
  const hardDelete = useStore((s) => s.hardDeleteCandidate);
  const archived = useStore((s) => s.candidates.filter((c) => c.archived));
  const promotions = useStore((s) => s.promotions);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Company</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Name:</span> CMH — Cloud Marketing Hub</p>
          <p><span className="text-muted-foreground">Product:</span> NexusHR v1.0</p>
          <p><span className="text-muted-foreground">Default duration:</span> 5 weeks · 25 working days (locked)</p>
          <p><span className="text-muted-foreground">Passing threshold:</span> 10 / 20</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Archive Management ({archived.length} archived)</CardTitle></CardHeader>
        <CardContent>
          {archived.length === 0 ? (
            <p className="text-sm text-muted-foreground">No archived candidates.</p>
          ) : (
            <div className="space-y-2">
              {archived.map((c) => {
                const promo = promotions.find((p) => p.id === c.promotionId);
                return (
                  <div key={c.id} className="flex justify-between items-center border rounded-md p-3">
                    <div>
                      <p className="font-medium">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{c.email} · {promo?.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { restore(c.id); toast.success("Restored"); }}>
                        Restore
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => {
                        if (confirm("Permanently delete?")) {
                          hardDelete(c.id);
                          toast.success("Deleted");
                        }
                      }}>Delete</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data</CardTitle></CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Reset all data? This cannot be undone.")) {
                reset();
                toast.success("Reset. Refresh to reseed sample data.");
              }
            }}
          >
            Reset all data
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            All data is stored locally in your browser (localStorage).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
