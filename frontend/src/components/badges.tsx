import { categoryColor } from "@/lib/calc";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        categoryColor(category),
        className,
      )}
    >
      {category}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  Active: "bg-info text-info-foreground",
  Graduated: "bg-success text-success-foreground",
  Dismissed: "bg-warning text-warning-foreground",
  Terminated: "bg-destructive text-destructive-foreground",
  Archived: "bg-muted text-muted-foreground",
  Completed: "bg-success text-success-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}
