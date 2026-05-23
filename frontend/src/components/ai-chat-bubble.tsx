import { useNavigate, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LazyAiChatPanel = lazy(() =>
  import("@/components/ai-chat-bubble-panel").then((m) => ({ default: m.AiChatBubblePanel })),
);

export function AiChatBubble() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });

  if (path === "/login" || path === "/ai-advisor") return null;

  return (
    <>
      {open && (
        <Suspense
          fallback={
            <div className="fixed bottom-24 right-4 z-50 flex h-[min(520px,calc(100vh-7rem))] w-[min(100vw-2rem,400px)] items-center justify-center rounded-2xl border bg-card shadow-2xl md:right-6">
              <span className="text-sm text-muted-foreground">Loading advisor…</span>
            </div>
          }
        >
          <LazyAiChatPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-violet-600 via-primary to-indigo-600 text-white",
          "shadow-xl shadow-primary/30 transition-all duration-300",
          "hover:scale-105 hover:shadow-2xl hover:shadow-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          open && "scale-95",
          "md:right-6",
        )}
        aria-label={open ? "Close AI Advisor" : "Open AI Advisor"}
        aria-expanded={open}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-primary shadow-sm">
              <Sparkles className="h-2.5 w-2.5" />
            </span>
          </>
        )}
      </button>
    </>
  );
}
