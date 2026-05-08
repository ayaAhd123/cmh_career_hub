import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/badges";
import { categoryFor, formatDate, overallAverage } from "@/lib/calc";
import { Award, Download } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/graduates")({
  head: () => ({ meta: [{ title: "Graduates — CarrerHub" }] }),
  component: Graduates,
});

function Graduates() {
  const allCandidates = useStore((s) => s.candidates);
  const promotions = useStore((s) => s.promotions);
  const candidates = useMemo(
    () => allCandidates.filter((c) => !c.archived && (c.status === "Graduated" || (overallAverage(c) >= 10 && c.status !== "Active"))),
    [allCandidates],
  );

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
      <Card>
        <CardHeader><CardTitle>{candidates.length} graduates</CardTitle></CardHeader>
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
              {candidates.map((c) => {
                const a = overallAverage(c);
                const promo = promotions.find((p) => p.id === c.promotionId);
                return (
                  <tr key={c.id} className="border-b">
                    <td className="py-2 px-3 font-medium">{c.firstName} {c.lastName}</td>
                    <td className="py-2 px-3 text-xs">{promo?.name}</td>
                    <td className="py-2 px-3">{c.educationLevel}</td>
                    <td className="py-2 px-3 font-semibold">{a.toFixed(2)}/20</td>
                    <td className="py-2 px-3"><CategoryBadge category={categoryFor(a)} /></td>
                    <td className="py-2 px-3">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/candidates/$id" params={{ id: c.id }}>View</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {candidates.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No graduates yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
