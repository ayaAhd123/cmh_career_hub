import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcEndDate, formatDate } from "@/lib/calc";
import { toast } from "sonner";

export function AddPromotionDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const add = useStore((s) => s.addPromotion);
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setLoading(true);
    try {
      const p = await add({ name: name.trim(), startDate });
      // Ensure state update propagates
      await new Promise((resolve) => setTimeout(resolve, 100));
      toast.success(`Promotion ${p.id} created`);
      setOpen(false);
      setName("");
      nav({ to: "/promotions/$id", params: { id: p.id } });
    } catch (e) {
      toast.error((e as Error).message || "Failed to create promotion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Promotion
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Create Promotion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Sales Bootcamp Q1" />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              Auto end date: {formatDate(calcEndDate(startDate))} (5 weeks · 25 working days)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
