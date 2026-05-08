import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import { categoryFor, overallAverage } from "@/lib/calc";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/candidates/")({
  head: () => ({ meta: [{ title: "All Candidates — NexusHR" }] }),
  component: AllCandidates,
});

function AllCandidates() {
  const allCandidates = useStore((s) => s.candidates);
  const promotions = useStore((s) => s.promotions);
  const candidates = useMemo(() => allCandidates.filter((c) => !c.archived), [allCandidates]);
  const [q, setQ] = useState("");
  const filtered = candidates.filter(
    (c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q.toLowerCase()) ||
      c.email.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All Candidates</h1>
      <Card>
        <CardHeader>
          <div className="flex justify-between gap-3 flex-wrap">
            <CardTitle>{filtered.length} candidates</CardTitle>
            <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2 px-3">Name</th><th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Promotion</th><th className="py-2 px-3">Avg</th>
              <th className="py-2 px-3">Category</th><th className="py-2 px-3">Status</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map((c) => {
                const a = overallAverage(c);
                const promo = promotions.find((p) => p.id === c.promotionId);
                return (
                  <tr key={c.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{c.firstName} {c.lastName}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{c.email}</td>
                    <td className="py-2 px-3 text-xs">{promo?.name ?? "—"}</td>
                    <td className="py-2 px-3 font-semibold">{a.toFixed(2)}</td>
                    <td className="py-2 px-3"><CategoryBadge category={categoryFor(a)} /></td>
                    <td className="py-2 px-3"><StatusBadge status={c.status} /></td>
                    <td className="py-2 px-3">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/candidates/$id" params={{ id: c.id }}><ArrowRight className="h-4 w-4" /></Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
