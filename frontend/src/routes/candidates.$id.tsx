import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import {
  categoryFor, disciplineAvg, formatDate, overallAverage, skillsAvg, testsAvg, workAvg,
} from "@/lib/calc";
import { ArrowLeft, Download, Mars, Trash2, Venus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { exportCandidatePDF, exportCandidateExcel, exportCandidateHTML } from "@/lib/exports";
import { toast } from "sonner";
import type { DisciplineSkills, WorkSkills } from "@/lib/types";

export const Route = createFileRoute("/candidates/$id")({
  head: ({ params }) => ({ meta: [{ title: `Candidate ${params.id} — CareerHub` }] }),
  component: CandidateDetail,
});

const DISCIPLINE_FIELDS: { key: keyof DisciplineSkills; label: string }[] = [
  { key: "discipline", label: "Discipline et ponctualité" },
  { key: "motivation", label: "Motivation" },
  { key: "communication", label: "Communication" },
  { key: "listening", label: "Sens de l'écoute" },
];

const WORK_FIELDS: { key: keyof WorkSkills; label: string }[] = [
  { key: "initiative", label: "Sens de l'initiative" },
  { key: "analysis", label: "Capacité d'analyse" },
  { key: "organization", label: "Organisation" },
  { key: "intellectual", label: "Aptitudes intellectuelles" },
  { key: "pace", label: "Rythme d'avancement" },
  { key: "speed", label: "Rapidité d'exécution des tâches" },
];

function CandidateDetail() {
  const { id } = Route.useParams();
  const candidate = useStore((s) => s.candidates.find((c) => c.id === id));
  const promotion = useStore((s) =>
    candidate ? s.promotions.find((p) => p.id === candidate.promotionId) : undefined,
  );
  const setSkills = useStore((s) => s.setSkills);
  const updateModuleScore = useStore((s) => s.updateModuleScore);
  const changeStatus = useStore((s) => s.changeStatus);
  const archive = useStore((s) => s.archiveCandidate);
  const nav = useNavigate();

  if (!candidate) return <p>Not found</p>;
  const avg = overallAverage(candidate);

  const setDisc = (key: keyof DisciplineSkills, val: number) =>
    setSkills(candidate.id, {
      ...candidate.skills,
      discipline: { ...candidate.skills.discipline, [key]: val },
    });
  const setWork = (key: keyof WorkSkills, val: number) =>
    setSkills(candidate.id, {
      ...candidate.skills,
      work: { ...candidate.skills.work, [key]: val },
    });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/promotions/$id" params={{ id: candidate.promotionId }}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to promotion
        </Link>
      </Button>

      <Card>
        <CardContent className="p-6 flex items-center gap-6 flex-wrap">
          <div className="h-24 w-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold overflow-hidden">
            {candidate.photo ? (
              <img src={candidate.photo} alt={`${candidate.firstName}`} className="h-full w-full object-cover" />
            ) : (
              `${candidate.firstName[0]}${candidate.lastName[0]}`
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {candidate.firstName} {candidate.lastName}
              <span className="text-muted-foreground text-lg font-normal flex items-center gap-1.5 ml-1">
                • {candidate.age} ans
                {candidate.gender === "Homme" ? (
                  <Mars className="h-5 w-5 text-blue-500" />
                ) : (
                  <Venus className="h-5 w-5 text-pink-500" />
                )}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">{candidate.email}</p>
            {promotion && (
              <p className="text-xs text-muted-foreground mt-1">
                {promotion.id} — {promotion.name}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <CategoryBadge category={categoryFor(avg)} />
              <StatusBadge status={candidate.status} />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase text-muted-foreground">Overall</p>
            <p className="text-4xl font-bold text-primary">{avg.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">/ 20</p>
          </div>
          <div className="flex flex-col gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm"><Download className="mr-1 h-4 w-4" /> Report</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportCandidatePDF(candidate, promotion)}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCandidateExcel(candidate, promotion)}>Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCandidateHTML(candidate, promotion)}>HTML</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Select
              value={candidate.status}
              onValueChange={(v) => {
                changeStatus(candidate.id, v as never);
                toast.success(`Status: ${v}`);
              }}
            >
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Graduated">Graduated</SelectItem>
                <SelectItem value="Dismissed">Dismissed</SelectItem>
                <SelectItem value="Terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm("Archive this candidate? (soft delete)")) {
                  archive(candidate.id);
                  toast.success("Archived");
                  nav({ to: "/promotions/$id", params: { id: candidate.promotionId } });
                }
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Archive
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="p-6 grid gap-3 sm:grid-cols-2 text-sm">
              <Field label="Email" value={candidate.email} />
              <Field label="Phone" value={candidate.phone} />
              <Field label="Age" value={`${candidate.age} ans`} />
              <Field 
                label="Gender" 
                value={
                  <div className="flex items-center gap-2">
                    {candidate.gender}
                    {candidate.gender === "Homme" ? (
                      <Mars className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Venus className="h-4 w-4 text-pink-500" />
                    )}
                  </div>
                } 
              />
              <Field label="Recruitment Date" value={formatDate(candidate.recruitmentDate)} />
              <Field label="Education" value={candidate.educationLevel} />
              <Field label="Diploma" value={candidate.diplomaName} />
              <Field label="Diploma Average" value={`${candidate.diplomaAverage}/20`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Discipline (/5 each)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {DISCIPLINE_FIELDS.map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">{label}</Label>
                      <span className="font-semibold text-sm">
                        {candidate.skills.discipline[key].toFixed(1)} / 5
                      </span>
                    </div>
                    <Slider
                      value={[candidate.skills.discipline[key]]}
                      min={0}
                      max={5}
                      step={0.5}
                      onValueChange={(v) => setDisc(key, v[0])}
                    />
                  </div>
                ))}
                <div className="pt-3 border-t flex justify-between">
                  <span className="font-medium">Discipline Avg</span>
                  <span className="text-lg font-bold text-primary">
                    {disciplineAvg(candidate.skills.discipline).toFixed(2)} / 5
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Work Skills (/5 each)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {WORK_FIELDS.map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">{label}</Label>
                      <span className="font-semibold text-sm">
                        {candidate.skills.work[key].toFixed(1)} / 5
                      </span>
                    </div>
                    <Slider
                      value={[candidate.skills.work[key]]}
                      min={0}
                      max={5}
                      step={0.5}
                      onValueChange={(v) => setWork(key, v[0])}
                    />
                  </div>
                ))}
                <div className="pt-3 border-t flex justify-between">
                  <span className="font-medium">Work Skills Avg</span>
                  <span className="text-lg font-bold text-primary">
                    {workAvg(candidate.skills.work).toFixed(2)} / 5
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardContent className="p-4 flex justify-between items-center">
                <span className="font-medium">Skills Average (overall)</span>
                <span className="text-2xl font-bold text-primary">
                  {skillsAvg(candidate.skills).toFixed(2)} / 5
                </span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Modules (each /20)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Tests = Modules. 5 standard modules per promotion.
              </p>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                    <th className="py-2 px-2 w-10">#</th>
                    <th className="py-2 px-2">Module</th>
                    <th className="py-2 px-2 w-32">Score / 20</th>
                  </tr>
                </thead>
                <tbody>
                  {candidate.modules.map((m) => (
                    <tr key={m.id} className="border-b">
                      <td className="py-2 px-2 font-mono">{m.id}</td>
                      <td className="py-2 px-2 font-medium">{m.name}</td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          step={0.1}
                          className="w-24"
                          value={m.score}
                          onChange={(e) =>
                            updateModuleScore(
                              candidate.id,
                              m.id,
                              Math.min(20, Math.max(0, parseFloat(e.target.value) || 0)),
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between font-medium pt-4 border-t mt-3">
                <span>Modules Average</span>
                <span className="text-primary text-lg font-bold">
                  {testsAvg(candidate.modules).toFixed(2)} / 20
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-6">
              <ol className="relative border-l-2 border-border space-y-4 ml-2">
                {candidate.history.map((h, i) => (
                  <li key={i} className="ml-4">
                    <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary mt-1.5" />
                    <p className="text-sm">{h.event}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.date).toLocaleString()}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
