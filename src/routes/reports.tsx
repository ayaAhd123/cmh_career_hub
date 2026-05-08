import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Download } from "lucide-react";
import {
  exportCandidatePDF, exportCandidateExcel, exportCandidateHTML,
  exportPromotionPDF, exportPromotionExcel, exportPromotionCSV, exportPromotionHTML,
} from "@/lib/exports";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports & Exports — NexusHR" }] }),
  component: Reports,
});

function Reports() {
  const allCandidates = useStore((s) => s.candidates);
  const promotions = useStore((s) => s.promotions);
  const candidates = useMemo(() => allCandidates.filter((c) => !c.archived), [allCandidates]);
  const [candId, setCandId] = useState<string>("");
  const [candFmt, setCandFmt] = useState<"pdf" | "xlsx" | "html">("pdf");
  const [promoId, setPromoId] = useState<string>("");
  const [promoFmt, setPromoFmt] = useState<"pdf" | "xlsx" | "csv" | "html">("pdf");

  const genCand = () => {
    const c = candidates.find((x) => x.id === candId);
    if (!c) return;
    const p = promotions.find((p) => p.id === c.promotionId);
    if (candFmt === "pdf") exportCandidatePDF(c, p);
    if (candFmt === "xlsx") exportCandidateExcel(c, p);
    if (candFmt === "html") exportCandidateHTML(c, p);
  };
  const genPromo = () => {
    const p = promotions.find((x) => x.id === promoId);
    if (!p) return;
    const cands = candidates.filter((c) => c.promotionId === p.id);
    if (promoFmt === "pdf") exportPromotionPDF(p, cands);
    if (promoFmt === "xlsx") exportPromotionExcel(p, cands);
    if (promoFmt === "csv") exportPromotionCSV(p, cands);
    if (promoFmt === "html") exportPromotionHTML(p, cands);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2"><FileText /> Reports & Exports</h1>

      <Card>
        <CardHeader><CardTitle>Individual Candidate Report</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-64">
            <Select value={candId} onValueChange={setCandId}>
              <SelectTrigger><SelectValue placeholder="Select candidate" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} — {c.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={candFmt} onValueChange={(v) => setCandFmt(v as never)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={genCand} disabled={!candId}>
            <Download className="mr-1 h-4 w-4" /> Generate
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Promotion Report</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-64">
            <Select value={promoId} onValueChange={setPromoId}>
              <SelectTrigger><SelectValue placeholder="Select promotion" /></SelectTrigger>
              <SelectContent>
                {promotions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.id} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={promoFmt} onValueChange={(v) => setPromoFmt(v as never)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={genPromo} disabled={!promoId}>
            <Download className="mr-1 h-4 w-4" /> Generate
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
