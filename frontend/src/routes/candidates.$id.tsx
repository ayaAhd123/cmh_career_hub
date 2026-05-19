<<<<<<< HEAD
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import {
  categoryFor, disciplineAvg, formatDate, overallAverage, skillsAvg, testsAvg, workAvg,
} from "@/lib/calc";
import { ArrowLeft, Download, Mars, Trash2, Venus, Pencil, Check, X, Save } from "lucide-react";
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
  const updateCandidate = useStore((s) => s.updateCandidate);
  const nav = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    age: "" as number | string,
    gender: "",
    recruitmentDate: "",
    educationLevel: "",
    diplomaName: "",
    diplomaAverage: "" as number | string,
    photo: "",
  });

  const startEditing = () => {
    if (!candidate) return;
    setEditForm({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone === "Not provided" ? "" : candidate.phone,
      age: candidate.age === "Not provided" ? "" : candidate.age,
      gender: candidate.gender === "Not provided" ? "" : candidate.gender,
      recruitmentDate: candidate.recruitmentDate === "Not provided" ? "" : candidate.recruitmentDate,
      educationLevel: candidate.educationLevel === "Not provided" ? "" : candidate.educationLevel,
      diplomaName: candidate.diplomaName === "Not provided" ? "" : candidate.diplomaName,
      diplomaAverage: candidate.diplomaAverage === "Not provided" ? "" : candidate.diplomaAverage,
      photo: candidate.photo || "",
    });
    setIsEditing(true);
  };

  const saveChanges = () => {
    if (!candidate) return;
    if (!editForm.firstName || !editForm.lastName) {
      toast.error("First name and last name are required");
      return;
    }

    updateCandidate(candidate.id, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email || "Not provided",
      phone: editForm.phone || "Not provided",
      age: editForm.age === "" ? "Not provided" : Number(editForm.age),
      gender: editForm.gender || "Not provided",
      recruitmentDate: editForm.recruitmentDate || "Not provided",
      educationLevel: editForm.educationLevel || "Not provided",
      diplomaName: editForm.diplomaName || "Not provided",
      diplomaAverage: editForm.diplomaAverage === "" ? "Not provided" : Number(editForm.diplomaAverage),
      photo: editForm.photo,
    });

    toast.success("Personal info updated successfully");
    setIsEditing(false);
  };

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
            <p className="text-xs text-muted-foreground">/ 5</p>
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
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Candidate</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground py-4">
                  Are you sure you want to delete {candidate.firstName} {candidate.lastName}? This action will archive the candidate (soft delete).
                </p>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      archive(candidate.id);
                      toast.success("Candidate deleted successfully");
                      setDeleteOpen(false);
                      nav({ to: "/promotions/$id", params: { id: candidate.promotionId } });
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Personal Information</CardTitle>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 pt-2">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>First Name *</Label>
                      <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                    </div>
                    <div>
                      <Label>Last Name *</Label>
                      <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                    </div>
                    <div>
                      <Label>Age</Label>
                      <Input type="number" min={18} max={65} value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value === "" ? "" : parseInt(e.target.value) || "" })} />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Homme">Homme</SelectItem>
                          <SelectItem value="Femme">Femme</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Education Level</Label>
                      <Select value={editForm.educationLevel} onValueChange={(v) => setEditForm({ ...editForm, educationLevel: v })}>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                        <SelectContent>
                          {(["Bac+2", "Bac+3", "Bac+5", "Bac+8"] as const).map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Recruitment Date</Label>
                      <Input type="date" value={editForm.recruitmentDate} onChange={(e) => setEditForm({ ...editForm, recruitmentDate: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Diploma Name</Label>
                      <Input value={editForm.diplomaName} onChange={(e) => setEditForm({ ...editForm, diplomaName: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Diploma Average (/20)</Label>
                      <Input type="number" min={0} max={20} step={0.1} value={editForm.diplomaAverage} onChange={(e) => setEditForm({ ...editForm, diplomaAverage: e.target.value === "" ? "" : parseFloat(e.target.value) || "" })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Photo URL</Label>
                      <Input value={editForm.photo} onChange={(e) => setEditForm({ ...editForm, photo: e.target.value })} placeholder="https://..." />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>
                      <X className="mr-1 h-4 w-4" /> Cancel
                    </Button>
                    <Button onClick={saveChanges}>
                      <Save className="mr-1 h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <Field label="Email" value={candidate.email} />
                  <Field label="Phone" value={candidate.phone} />
                  <Field label="Age" value={(!candidate.age || candidate.age === "Not provided") ? "Not provided" : `${candidate.age} years old`} />
                  <Field 
                    label="Gender" 
                    value={
                      <div className="flex items-center gap-2">
                        {candidate.gender}
                        {candidate.gender === "Homme" ? (
                          <Mars className="h-4 w-4 text-blue-500" />
                        ) : candidate.gender === "Femme" ? (
                          <Venus className="h-4 w-4 text-pink-500" />
                        ) : null}
                      </div>
                    } 
                  />
                  <Field label="Recruitment Date" value={(!candidate.recruitmentDate || candidate.recruitmentDate === "Not provided") ? "Not provided" : formatDate(candidate.recruitmentDate)} />
                  <Field label="Education" value={candidate.educationLevel} />
                  <Field label="Diploma" value={candidate.diplomaName} />
                  <Field label="Diploma Average" value={(!candidate.diplomaAverage || candidate.diplomaAverage === "Not provided") ? "Not provided" : `${candidate.diplomaAverage}/20`} />
                </div>
              )}
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
=======
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import {
  categoryFor, disciplineAvg, formatDate, overallAverage, skillsAvg, testsAvg, workAvg,
} from "@/lib/calc";
import { ArrowLeft, Download, Mars, Trash2, Venus, Pencil, Check, X, Save } from "lucide-react";
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
  const updateCandidate = useStore((s) => s.updateCandidate);
  const nav = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      nav({ to: "/promotions/$id", params: { id: candidate?.promotionId ?? "" } });
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    age: "" as number | string,
    gender: "",
    recruitmentDate: "",
    educationLevel: "",
    diplomaName: "",
    diplomaAverage: "" as number | string,
    photo: "",
    photoFile: null as File | null,
    photoPreview: "",
  });

  const startEditing = () => {
    if (!candidate) return;
    setEditForm({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone === "Not provided" ? "" : candidate.phone,
      age: candidate.age === "Not provided" ? "" : candidate.age,
      gender: candidate.gender === "Not provided" ? "" : candidate.gender,
      recruitmentDate: candidate.recruitmentDate === "Not provided" ? "" : candidate.recruitmentDate,
      educationLevel: candidate.educationLevel === "Not provided" ? "" : candidate.educationLevel,
      diplomaName: candidate.diplomaName === "Not provided" ? "" : candidate.diplomaName,
      diplomaAverage: candidate.diplomaAverage === "Not provided" ? "" : candidate.diplomaAverage,
      photo: candidate.photo || "",
      photoFile: null,
      photoPreview: candidate.photo || "",
    });
    setIsEditing(true);
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const saveChanges = async () => {
    if (!candidate) return;
    if (!editForm.firstName || !editForm.lastName) {
      toast.error("First name and last name are required");
      return;
    }

    const photoValue = editForm.photoFile
      ? await readFileAsDataUrl(editForm.photoFile)
      : editForm.photo;

    updateCandidate(candidate.id, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email || "Not provided",
      phone: editForm.phone || "Not provided",
      age: editForm.age === "" ? "Not provided" : Number(editForm.age),
      gender: editForm.gender || "Not provided",
      recruitmentDate: editForm.recruitmentDate || "Not provided",
      educationLevel: editForm.educationLevel || "Not provided",
      diplomaName: editForm.diplomaName || "Not provided",
      diplomaAverage:
        editForm.diplomaAverage === "" ? "Not provided" : Number(editForm.diplomaAverage),
      photo: photoValue,
    });

    toast.success("Personal info updated successfully");
    setIsEditing(false);
  };

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
      <Button variant="ghost" size="sm" onClick={handleBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
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
            <p className="text-xs text-muted-foreground">/ 5</p>
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
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive candidate?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will archive the candidate and remove them from the active promotion view.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      archive(candidate.id);
                      toast.success("Archived");
                      nav({ to: "/promotions/$id", params: { id: candidate.promotionId } });
                      setShowDeleteDialog(false);
                    }}
                  >
                    Archive candidate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Personal Information</CardTitle>
              {!isEditing && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Pencil className="mr-1 h-4 w-4" /> Edit
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6 pt-2">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>First Name *</Label>
                      <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                    </div>
                    <div>
                      <Label>Last Name *</Label>
                      <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                    </div>
                    <div>
                      <Label>Age</Label>
                      <Input type="number" min={18} max={65} value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value === "" ? "" : parseInt(e.target.value) || "" })} />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Homme">Homme</SelectItem>
                          <SelectItem value="Femme">Femme</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Education Level</Label>
                      <Select value={editForm.educationLevel} onValueChange={(v) => setEditForm({ ...editForm, educationLevel: v })}>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                        <SelectContent>
                          {(["Bac+2", "Bac+3", "Bac+5", "Bac+8"] as const).map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Recruitment Date</Label>
                      <Input type="date" value={editForm.recruitmentDate} onChange={(e) => setEditForm({ ...editForm, recruitmentDate: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Diploma Name</Label>
                      <Input value={editForm.diplomaName} onChange={(e) => setEditForm({ ...editForm, diplomaName: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Diploma Average (/20)</Label>
                      <Input type="number" min={0} max={20} step={0.1} value={editForm.diplomaAverage} onChange={(e) => setEditForm({ ...editForm, diplomaAverage: e.target.value === "" ? "" : parseFloat(e.target.value) || "" })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Photo</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setEditForm({
                            ...editForm,
                            photoFile: file,
                            photoPreview: file ? URL.createObjectURL(file) : editForm.photoPreview,
                          });
                        }}
                      />
                      {editForm.photoPreview ? (
                        <img
                          src={editForm.photoPreview}
                          alt="Photo preview"
                          className="mt-3 h-24 w-24 rounded-full object-cover"
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>
                      <X className="mr-1 h-4 w-4" /> Cancel
                    </Button>
                    <Button onClick={saveChanges}>
                      <Save className="mr-1 h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <Field label="Email" value={candidate.email} />
                  <Field label="Phone" value={candidate.phone} />
                  <Field label="Age" value={(!candidate.age || candidate.age === "Not provided") ? "Not provided" : `${candidate.age} years old`} />
                  <Field 
                    label="Gender" 
                    value={
                      <div className="flex items-center gap-2">
                        {candidate.gender}
                        {candidate.gender === "Homme" ? (
                          <Mars className="h-4 w-4 text-blue-500" />
                        ) : candidate.gender === "Femme" ? (
                          <Venus className="h-4 w-4 text-pink-500" />
                        ) : null}
                      </div>
                    } 
                  />
                  <Field label="Recruitment Date" value={(!candidate.recruitmentDate || candidate.recruitmentDate === "Not provided") ? "Not provided" : formatDate(candidate.recruitmentDate)} />
                  <Field label="Education" value={candidate.educationLevel} />
                  <Field label="Diploma" value={candidate.diplomaName} />
                  <Field label="Diploma Average" value={(!candidate.diplomaAverage || candidate.diplomaAverage === "Not provided") ? "Not provided" : `${candidate.diplomaAverage}/20`} />
                </div>
              )}
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
>>>>>>> f5378b5081c7b85fe4f26ccb7182c94321541ef9
