import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Download } from "lucide-react";
import {
  exportCandidatePDF, exportCandidateExcel, exportCandidateHTML,
  exportPromotionPDF, exportPromotionExcel, exportPromotionHTML,
} from "@/lib/exports";
import type { ExportLocale } from "@/lib/export-labels";
import { SearchSelect } from "@/components/search-select";
import { Label } from "@/components/ui/label";
import {
  candidateDetailToCandidate,
  fetchCandidateApi,
  fetchCandidates,
  type CandidateListItem,
} from "@/lib/candidate-api";
import { fetchPromotionExportCandidates } from "@/lib/promotion-api";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports & Exports — CareerHub" }] }),
  component: Reports,
});

function Reports() {
  const promotions = useStore((s) => s.promotions);

  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [candId, setCandId] = useState<string>("");
  const [candFmt, setCandFmt] = useState<"pdf" | "xlsx" | "html">("pdf");
  const [candLang, setCandLang] = useState<ExportLocale>("fr");
  const [promoId, setPromoId] = useState<string>("");
  const [promoFmt, setPromoFmt] = useState<"pdf" | "xlsx" | "html">("pdf");
  const [promoLang, setPromoLang] = useState<ExportLocale>("fr");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoadingCandidates(true);
      try {
        const { data } = await fetchCandidates({ sort: "name_asc" });
        setCandidates(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load candidates");
      } finally {
        setLoadingCandidates(false);
      }
    })();
  }, []);

  const candOpts = useMemo(
    () =>
      candidates.map((c) => ({
        value: c.id,
        label: `${c.firstName} ${c.lastName}`,
        sublabel: c.email,
      })),
    [candidates],
  );
  const promoOpts = useMemo(
    () => promotions.map((p) => ({ value: p.id, label: `${p.id} — ${p.name}`, sublabel: p.name })),
    [promotions],
  );

  const genCand = async () => {
    if (!candId) return;
    setExporting(true);
    try {
      const detail = await fetchCandidateApi(candId);
      const c = candidateDetailToCandidate(detail);
      const p = promotions.find((promo) => promo.id === c.promotionId);
      const opts = { locale: candLang };
      if (candFmt === "pdf") exportCandidatePDF(c, p, opts);
      if (candFmt === "xlsx") exportCandidateExcel(c, p, opts);
      if (candFmt === "html") exportCandidateHTML(c, p, opts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const genPromo = async () => {
    if (!promoId) return;
    setExporting(true);
    try {
      const p = promotions.find((x) => x.id === promoId);
      if (!p) return;
      const cands = await fetchPromotionExportCandidates(promoId);
      const opts = { locale: promoLang };
      if (promoFmt === "pdf") exportPromotionPDF(p, cands, opts);
      if (promoFmt === "xlsx") exportPromotionExcel(p, cands, opts);
      if (promoFmt === "html") exportPromotionHTML(p, cands, opts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2"><FileText /> Reports & Exports</h1>

      <Card>
        <CardHeader><CardTitle>Individual Candidate Report</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-64">
            <SearchSelect
              value={candId}
              onChange={setCandId}
              options={candOpts}
              placeholder={loadingCandidates ? "Loading candidates…" : "Search & select candidate..."}
              emptyText="No candidate found."
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Format</Label>
            <Select value={candFmt} onValueChange={(v) => setCandFmt(v as never)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Report language</Label>
            <Select value={candLang} onValueChange={(v) => setCandLang(v as ExportLocale)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void genCand()} disabled={!candId || exporting} className="self-end">
            <Download className="mr-1 h-4 w-4" /> {exporting ? "Generating…" : "Generate"}
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Module and skill names always remain in French; only report labels change with the selected language.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Promotion Report</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-64">
            <SearchSelect
              value={promoId}
              onChange={setPromoId}
              options={promoOpts}
              placeholder="Search & select promotion..."
              emptyText="No promotion found."
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Format</Label>
            <Select value={promoFmt} onValueChange={(v) => setPromoFmt(v as never)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Report language</Label>
            <Select value={promoLang} onValueChange={(v) => setPromoLang(v as ExportLocale)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void genPromo()} disabled={!promoId || exporting} className="self-end">
            <Download className="mr-1 h-4 w-4" /> {exporting ? "Generating…" : "Generate"}
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Module and skill names always remain in French; only report labels change with the selected language.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
