import { useNavigate } from "@tanstack/react-router";
import { Maximize2, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAIAdvisor } from "@/hooks/use-ai-advisor";

export function AiChatBubblePanel({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    handleSendMessage,
    messagesEndRef,
  } = useAIAdvisor({ enabled: true });

  const canSend = inputValue.trim().length > 0 && !isTyping;

  return (
    <Card className="flex h-[min(520px,calc(100vh-7rem))] flex-col overflow-hidden border-primary/30 shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b bg-gradient-to-r from-violet-700 via-primary to-indigo-600 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">CareerHub AI</span>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white hover:bg-white/15"
            onClick={() => {
              onClose();
              void nav({ to: "/ai-advisor" });
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white hover:bg-white/15"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/20">
        {messages.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ask about candidates, skills, or promotions.
          </p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md border bg-card text-foreground"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-bl-md border bg-card px-3 py-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-primary/70"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t p-2.5">
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            placeholder="Ask a question…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) void handleSendMessage();
              }
            }}
            className="min-h-[40px] max-h-24 resize-none text-sm"
          />
          <Button
            type="button"
            size="icon"
            disabled={!canSend}
            className="h-10 w-10 shrink-0 rounded-xl"
            onClick={() => void handleSendMessage()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
