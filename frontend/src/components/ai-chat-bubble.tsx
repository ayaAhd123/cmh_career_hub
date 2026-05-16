import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, MessageCircle, Send, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAIAdvisor } from "@/hooks/use-ai-advisor";

export function AiChatBubble() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();
  
  const {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    handleSendMessage,
    messagesEndRef,
  } = useAIAdvisor();

  if (path === "/login" || path === "/ai-advisor") return null;

  return (
    <>
      {open && (
        <Card className="fixed bottom-24 right-6 z-50 w-80 md:w-96 shadow-2xl border-primary/30 animate-in slide-in-from-bottom-4 flex flex-col h-[500px]">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-lg shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">AI Advisor</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => nav({ to: "/ai-advisor" })} title="Open full page">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-4 text-sm">
                <p className="mb-3">👋 Hi! How can I help you today?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "Top education levels?",
                    "Skills for success?",
                    "Active candidates?"
                  ].map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7 px-2"
                      onClick={() => handleSendMessage(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg whitespace-pre-wrap text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-muted text-muted-foreground border border-border flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-3 border-t shrink-0 flex gap-2">
            <Input
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="text-sm h-9"
            />
            <Button onClick={() => handleSendMessage()} size="sm" className="h-9 px-3" disabled={isTyping}>
              <Send className="h-4 w-4" />
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
