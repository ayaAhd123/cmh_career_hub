import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AiChatBubble() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();

  if (path === "/login" || path === "/ai-advisor") return null;

  return (
    <>
      {open && (
        <Card className="fixed bottom-24 right-6 z-50 w-80 shadow-2xl border-primary/30 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">AI Advisor</span>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 text-sm space-y-3">
            <div className="bg-muted rounded-lg p-3">
              👋 Hi! I can help analyze your training data, find performance patterns and suggest hiring profiles.
            </div>
            <p className="text-xs text-muted-foreground">
              Open the full AI Advisor for in-depth conversation.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false);
                nav({ to: "/ai-advisor" });
              }}
            >
              <Send className="h-4 w-4 mr-2" /> Open AI Advisor
            </Button>
          </div>
        </Card>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
        aria-label="AI Advisor"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
