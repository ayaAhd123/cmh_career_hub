import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { EducationLevel, Gender } from "@/lib/types";

const phoneRe = /^\+?[\d\s().-]{8,20}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "+212 ",
  recruitmentDate: new Date().toISOString().slice(0, 10),
  educationLevel: "" as EducationLevel | "",
  gender: "Homme" as Gender,
  age: 22,
  diplomaName: "",
  diplomaAverage: 12,
  photo: "",
};

export function AddCandidateDialog({ promotionId }: { promotionId: string }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const add = useStore((s) => s.addCandidate);

  const [form, setForm] = useState(initialForm);

  const isDirty = useMemo(
    () =>
      Object.keys(initialForm).some((key) =>
        (form as Record<string, unknown>)[key] !== (initialForm as Record<string, unknown>)[key],
      ),
    [form],
  );

  const resetForm = () => setForm(initialForm);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetForm();
      setOpen(true);
      return;
    }

    if (isDirty) {
      setConfirmOpen(true);
      return;
    }

    setOpen(false);
  };

  const handleCancel = () => {
    if (isDirty) {
      setConfirmOpen(true);
      return;
    }

    setOpen(false);
    resetForm();
  };

  const submit = () => {
    if (!form.firstName || !form.lastName) return toast.error("Name required");
    if (!form.educationLevel) return toast.error("Education level required");
    if (!emailRe.test(form.email)) return toast.error("Invalid email");
    if (!phoneRe.test(form.phone)) return toast.error("Invalid phone");
    if (new Date(form.recruitmentDate) > new Date())
      return toast.error("Recruitment date cannot be in the future");
    if (form.diplomaAverage < 0 || form.diplomaAverage > 20)
      return toast.error("Diploma average must be 0-20");

    const res = add({ ...form, promotionId });
    if (!res.ok) return toast.error(res.error ?? "Failed");
    toast.success("Candidate added");
    setOpen(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Candidate
        </Button>
      </DialogTrigger>
      <DialogContent hideCloseButton className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2 py-2">
          <div>
            <Label>First Name *</Label>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <Label>Last Name *</Label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone *</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+212 6XX XXX XXX" />
          </div>
          <div>
            <Label>Recruitment Date *</Label>
            <Input type="date" value={form.recruitmentDate} onChange={(e) => setForm({ ...form, recruitmentDate: e.target.value })} />
          </div>
          <div>
            <Label>Age *</Label>
            <Input type="number" min={18} max={65} value={form.age} onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Gender *</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as Gender })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Homme">Homme</SelectItem>
                <SelectItem value="Femme">Femme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Education Level *</Label>
            <Select value={form.educationLevel} onValueChange={(v) => setForm({ ...form, educationLevel: v as EducationLevel })}>
              <SelectTrigger><SelectValue placeholder="Select education level" /></SelectTrigger>
              <SelectContent>
                {(["Bac+2", "Bac+3", "Bac+5", "Bac+8"] as const).map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Diploma Name *</Label>
            <Input value={form.diplomaName} onChange={(e) => setForm({ ...form, diplomaName: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Diploma Average (/20) *</Label>
            <Input type="number" min={0} max={20} step={0.1} value={form.diplomaAverage} onChange={(e) => setForm({ ...form, diplomaAverage: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Photo (optional)</Label>
            <Input
              type="file"
              accept="image/*"
              key={form.photo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    setForm({ ...form, photo: reader.result });
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            {form.photo ? (
              <div className="mt-2 max-h-56 overflow-auto rounded border border-slate-200 p-2">
                <img
                  src={form.photo}
                  alt="Selected candidate photo"
                  className="h-48 w-full max-w-xs rounded object-cover"
                />
              </div>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button onClick={submit}>Add</Button>
        </DialogFooter>
      </DialogContent>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have entered information for this candidate. If you cancel now, your data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                setOpen(false);
                resetForm();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
