import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle, Send, Sparkles, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAIAdvisor } from "@/hooks/use-ai-advisor";

function AiChatBubblePanel({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    handleSendMessage,
    messagesEndRef,
  } = useAIAdvisor({ enabled: true });

  return (
    <Card className="flex h-[min(420px,calc(100dvh-7.5rem))] w-[min(calc(100vw-2rem),24rem)] flex-col overflow-hidden border-primary/30 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200 sm:w-96">
      <div className="flex shrink-0 items-center justify-between border-b bg-gradient-to-r from-primary/10 to-accent/10 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold">AI Advisor</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Open full page"
            onClick={() => {
              onClose();
              void nav({ to: "/ai-advisor" });
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            <p className="mb-3">Hi! How can I help you today?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Top education levels?", "Skills for success?", "Active candidates?"].map((q) => (
                <Button
                  key={q}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => void handleSendMessage(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-muted text-muted-foreground"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex max-w-[85%] items-center gap-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t p-2.5">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            className="h-9 text-sm"
          />
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 px-3"
            disabled={isTyping || !inputValue.trim()}
            onClick={() => void handleSendMessage()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function AiChatBubble() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });

  if (path === "/login" || path === "/ai-advisor") return null;

  return (
    <>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close AI advisor"
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-20 right-4 z-50 sm:bottom-24 sm:right-6">
            <AiChatBubblePanel onClose={() => setOpen(false)} />
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
        aria-label={open ? "Close AI Advisor" : "Open AI Advisor"}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
