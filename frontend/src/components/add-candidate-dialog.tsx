import { useRef, useState } from "react";
import { createCandidateApi } from "@/lib/candidate-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { formatGenderDisplay } from "@/lib/export-i18n";

const phoneRe = /^\+?[\d\s().-]{8,20}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/** Resize/compress photos so POST body stays within API limits. */
const preparePhotoForUpload = async (file: File): Promise<string> => {
  const original = await readFileAsDataUrl(file);
  if (original.length <= 400_000) return original;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxSide = 800;
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        const scale = maxSide / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(original);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Could not process image"));
    img.src = original;
  });
};

export function AddCandidateDialog({
  promotionId,
  onSuccess,
}: {
  promotionId: string;
  onSuccess?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    recruitmentDate: string;
    educationLevel: any;
    gender: any;
    age: number | string;
    diplomaName: string;
    diplomaAverage: number | string;
    photo: string;
    photoFile: File | null;
    photoPreview: string;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    recruitmentDate: "",
    educationLevel: "",
    gender: "",
    age: "",
    diplomaName: "",
    diplomaAverage: "",
    photo: "",
    photoFile: null,
    photoPreview: "",
  });

  const submit = async () => {
    if (!form.firstName || !form.lastName) return toast.error("Name required");
    if (!emailRe.test(form.email)) return toast.error("Invalid email");
    if (!phoneRe.test(form.phone)) return toast.error("Invalid phone");
    if (!form.recruitmentDate) return toast.error("Recruitment date required");
    if (new Date(form.recruitmentDate) > new Date())
      return toast.error("Recruitment date cannot be in the future");
    if (form.age === "" || Number(form.age) < 18 || Number(form.age) > 65)
      return toast.error("Age must be between 18 and 65");
    if (!form.gender) return toast.error("Gender required");
    if (!form.educationLevel) return toast.error("Education level required");
    if (!form.diplomaName) return toast.error("Diploma name required");
    if (form.diplomaAverage === "" || Number(form.diplomaAverage) < 0 || Number(form.diplomaAverage) > 20)
      return toast.error("Diploma average must be 0-20");

    let photoValue: string | undefined;
    if (form.photoFile) {
      try {
        photoValue = await preparePhotoForUpload(form.photoFile);
      } catch {
        return toast.error("Could not process the photo. Try a smaller image.");
      }
    } else if (form.photo) {
      photoValue = form.photo;
    }

    setSubmitting(true);
    try {
      await createCandidateApi({
        promotionId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        recruitmentDate: form.recruitmentDate,
        age: Number(form.age),
        gender: form.gender,
        educationLevel: form.educationLevel,
        diplomaName: form.diplomaName.trim(),
        diplomaAverage: Number(form.diplomaAverage),
        photo: photoValue,
      });
      toast.success("Candidate added");
      setOpen(false);
      await onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add candidate");
      return;
    } finally {
      setSubmitting(false);
    }
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      recruitmentDate: "",
      educationLevel: "",
      gender: "",
      age: "",
      diplomaName: "",
      diplomaAverage: "",
      photo: "",
      photoFile: null,
      photoPreview: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Candidate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
        <div className="grid gap-4 sm:grid-cols-2 py-2 max-h-[65vh] overflow-y-auto pr-2">
          <div>
            <Label>First Name *</Label>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="First name" />
          </div>
          <div>
            <Label>Last Name *</Label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
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
            <Input type="number" min={18} max={65} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value === "" ? "" : parseInt(e.target.value) || "" })} placeholder="22" />
          </div>
          <div>
            <Label>Gender *</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as Gender })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Homme">{formatGenderDisplay("Homme")}</SelectItem>
                <SelectItem value="Femme">{formatGenderDisplay("Femme")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Education Level *</Label>
            <Select value={form.educationLevel} onValueChange={(v) => setForm({ ...form, educationLevel: v as EducationLevel })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {(["Bac+2", "Bac+3", "Bac+5", "Bac+8"] as const).map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Diploma Name *</Label>
            <Input value={form.diplomaName} onChange={(e) => setForm({ ...form, diplomaName: e.target.value })} placeholder="Degree title" />
          </div>
          <div className="sm:col-span-2">
            <Label>Diploma Average (/20) *</Label>
            <Input type="number" min={0} max={20} step={0.1} value={form.diplomaAverage} onChange={(e) => setForm({ ...form, diplomaAverage: e.target.value === "" ? "" : parseFloat(e.target.value) || "" })} placeholder="12" />
          </div>
          <div className="sm:col-span-2">
            <Label>Photo (optional)</Label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setForm({
                  ...form,
                  photoFile: file,
                  photoPreview: file ? URL.createObjectURL(file) : "",
                });
              }}
            />
            <div className="mt-1 flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                Choose file
              </Button>
              <span className="truncate text-sm text-muted-foreground">
                {form.photoFile?.name ?? "No file chosen"}
              </span>
            </div>
            {form.photoPreview ? (
              <img
                src={form.photoPreview}
                alt="Photo preview"
                className="mt-3 h-24 w-24 rounded-full object-cover"
              />
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
