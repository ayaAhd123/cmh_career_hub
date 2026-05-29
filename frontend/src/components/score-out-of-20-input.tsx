import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ScoreOutOf20InputProps = {
  value: number;
  hasGrade?: boolean;
  onCommit: (value: number | null) => void;
  className?: string;
};

/** Text input for /20 scores — empty when unset, no forced 0 while typing. */
export function ScoreOutOf20Input({
  value,
  hasGrade = false,
  onCommit,
  className,
}: ScoreOutOf20InputProps) {
  const toDraft = (v: number, graded: boolean) =>
    graded || v > 0 ? String(v) : "";

  const [draft, setDraft] = useState(() => toDraft(value, hasGrade));

  useEffect(() => {
    setDraft(toDraft(value, hasGrade));
  }, [value, hasGrade]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder="—"
      className={cn("w-24 tabular-nums", className)}
      value={draft}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
      }}
      onBlur={() => {
        const trimmed = draft.trim();
        if (trimmed === "" || trimmed === ".") {
          setDraft("");
          onCommit(null);
          return;
        }
        const num = parseFloat(trimmed);
        if (Number.isNaN(num)) {
          setDraft("");
          onCommit(null);
          return;
        }
        const clamped = Math.min(20, Math.max(0, Math.round(num * 10) / 10));
        setDraft(String(clamped));
        onCommit(clamped);
      }}
    />
  );
}
