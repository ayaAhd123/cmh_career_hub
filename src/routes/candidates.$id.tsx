import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import {
  categoryFor, formatDate, overallAverage, skillsAvg, testsAvg,
} from "@/lib/calc";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { exportCandidatePDF, exportCandidateExcel, exportCandidateHTML } from "@/lib/exports";
import { toast } from "sonner";

export const Route = createFileRoute("/candidates/$id")({
  head: ({ params }) => ({ meta: [{ title: `Candidate ${params.id} — CarrerHub` }] }),
  component: CandidateDetail,
});

function CandidateDetail() {
  const { id } = Route.useParams();
  const candidate = useStore((s) => s.candidates.find((c) => c.id === id));
  const promotion = useStore((s) =>
    candidate ? s.promotions.find((p) => p.id === candidate.promotionId) : undefined,
  );
  const setSkills = useStore((s) => s.setSkills);
  const addTest = useStore((s) => s.addTest);
  const updateTest = useStore((s) => s.updateTest);
  const removeTest = useStore((s) => s.removeTest);
  const updateModule = useStore((s) => s.updateModule);
  const changeStatus = useStore((s) => s.changeStatus);
  const archive = useStore((s) => s.archiveCandidate);
  const nav = useNavigate();

  const [newTest, setNewTest] = useState({ name: "", score: 0, date: new Date().toISOString().slice(0, 10) });

  if (!candidate) return <p>Not found</p>;
  const avg = overallAverage(candidate);

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
            <h1 className="text-2xl font-bold">{candidate.firstName} {candidate.lastName}</h1>
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
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="p-6 grid gap-3 sm:grid-cols-2 text-sm">
              <Field label="Email" value={candidate.email} />
              <Field label="Phone" value={candidate.phone} />
              <Field label="Recruitment Date" value={formatDate(candidate.recruitmentDate)} />
              <Field label="Education" value={candidate.educationLevel} />
              <Field label="Diploma" value={candidate.diplomaName} />
              <Field label="Diploma Average" value={`${candidate.diplomaAverage}/20`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardContent className="p-6 space-y-5">
              {(
                [
                  ["communication", "Communication"],
                  ["technical", "Technical Skills"],
                  ["teamwork", "Teamwork"],
                  ["problemSolving", "Problem Solving"],
                  ["adaptability", "Adaptability"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{label}</Label>
                    <span className="font-semibold">{candidate.skills[key].toFixed(1)} / 5</span>
                  </div>
                  <Slider
                    value={[candidate.skills[key]]}
                    min={0}
                    max={5}
                    step={0.5}
                    onValueChange={(v) => setSkills(candidate.id, { ...candidate.skills, [key]: v[0] })}
                  />
                </div>
              ))}
              <div className="pt-4 border-t flex justify-between">
                <span className="font-medium">Skills Average</span>
                <span className="text-xl font-bold text-primary">{skillsAvg(candidate.skills).toFixed(2)} / 5</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests">
          <Card>
            <CardHeader><CardTitle>Tests (/20)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b">
                  <th className="py-2">Name</th><th className="py-2">Date</th><th className="py-2">Score</th><th></th>
                </tr></thead>
                <tbody>
                  {candidate.tests.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="py-2">{t.name}</td>
                      <td className="py-2 text-muted-foreground">{formatDate(t.date)}</td>
                      <td className="py-2">
                        <Input
                          type="number"
                          value={t.score}
                          min={0}
                          max={20}
                          step={0.1}
                          className="w-20"
                          onChange={(e) => updateTest(candidate.id, t.id, { score: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="py-2">
                        <Button size="icon" variant="ghost" onClick={() => removeTest(candidate.id, t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between font-medium pt-2">
                <span>Tests Average</span>
                <span className="text-primary">{testsAvg(candidate.tests).toFixed(2)} / 20</span>
              </div>

              <div className="flex items-end gap-2 pt-3 border-t">
                <div className="flex-1">
                  <Label>Test Name</Label>
                  <Input value={newTest.name} onChange={(e) => setNewTest({ ...newTest, name: e.target.value })} />
                </div>
                <div>
                  <Label>Score /20</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    className="w-24"
                    value={newTest.score}
                    onChange={(e) => setNewTest({ ...newTest, score: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={newTest.date} onChange={(e) => setNewTest({ ...newTest, date: e.target.value })} />
                </div>
                <Button
                  onClick={() => {
                    if (!newTest.name) return toast.error("Name required");
                    addTest(candidate.id, newTest);
                    setNewTest({ name: "", score: 0, date: new Date().toISOString().slice(0, 10) });
                  }}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader><CardTitle>Module Performance (25 days)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                      <th className="py-2 px-2">Day</th>
                      <th className="py-2 px-2">Date</th>
                      <th className="py-2 px-2">Module</th>
                      <th className="py-2 px-2">Score</th>
                      <th className="py-2 px-2">Part.</th>
                      <th className="py-2 px-2">Disc.</th>
                      <th className="py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidate.modules.map((m) => (
                      <tr
                        key={m.day}
                        className={`border-b ${m.status === "Completed" ? "bg-success/5" : m.status === "Holiday" ? "bg-warning/5" : ""}`}
                      >
                        <td className="py-2 px-2 font-mono">{m.day}</td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{formatDate(m.date)}</td>
                        <td className="py-2 px-2">{m.title}</td>
                        <td className="py-2 px-2">
                          <Input
                            type="number" min={0} max={20} step={0.1}
                            className="w-20"
                            value={m.score ?? ""}
                            onChange={(e) =>
                              updateModule(candidate.id, m.day, { score: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input type="number" min={0} max={5} step={0.5} className="w-16"
                            value={m.participation ?? ""}
                            onChange={(e) => updateModule(candidate.id, m.day, { participation: parseFloat(e.target.value) || 0 })} />
                        </td>
                        <td className="py-2 px-2">
                          <Input type="number" min={0} max={5} step={0.5} className="w-16"
                            value={m.discipline ?? ""}
                            onChange={(e) => updateModule(candidate.id, m.day, { discipline: parseFloat(e.target.value) || 0 })} />
                        </td>
                        <td className="py-2 px-2">
                          <Select
                            value={m.status}
                            onValueChange={(v) => updateModule(candidate.id, m.day, { status: v as never })}
                          >
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Not Started">Not Started</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="Holiday">Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
