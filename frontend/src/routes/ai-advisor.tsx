import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send } from "lucide-react";
import { useAIAdvisor } from "@/hooks/use-ai-advisor";

export const Route = createFileRoute("/ai-advisor")({
  head: () => ({ meta: [{ title: "AI Advisor — CareerHub" }] }),
  component: AIAdvisor,
});

function AIAdvisor() {
  const {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    handleSendMessage,
    messagesEndRef,
  } = useAIAdvisor({ enabled: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="text-accent" /> AI Analytics Advisor
        </h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          "What education levels are most common among graduated candidates?",
          "Which skills correlate most with success?",
          "What is the average termination rate?",
          "Show me a summary of current active candidates."
        ].map((q, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setInputValue(q);
            }}
          >
            {q}
          </Button>
        ))}
      </div>
      <Card className="flex flex-col h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Ask the AI Advisor
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">
                <p className="mb-3 font-bold">Ask me questions about your candidate data:</p>
                <div className="space-y-2 text-left max-w-xs mx-auto">
                  <p className="text-xs">• What education levels are best?</p>
                  <p className="text-xs">• Which skills correlate with success?</p>
                  <p className="text-xs">• What's the termination pattern?</p>
                  <p className="text-xs">• Show me performance breakdown</p>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg whitespace-pre-wrap text-sm ${
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
                <div className="max-w-xs px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground border border-border flex gap-1 items-center">
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Ask a question about your candidates..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="text-sm"
            />
            <Button onClick={() => handleSendMessage()} size="sm" className="gap-2" disabled={isTyping}>
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
