import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/ai-advisor")({
  head: () => ({ meta: [{ title: "AI Advisor — NexusHR" }] }),
  component: AIAdvisor,
});

function AIAdvisor() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="text-accent" /> AI Recruitment Advisor
        </h1>
        <Badge variant="secondary">Coming Soon</Badge>
      </div>
      <Card>
        <CardContent className="p-10 text-center space-y-4">
          <Sparkles className="h-12 w-12 mx-auto text-primary" />
          <h2 className="text-xl font-semibold">Smart hiring insights powered by AI</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Analyze historical promotion data to surface patterns: which education
            levels perform best, top-correlated skills, optimal recruitment profiles.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto pt-4 text-left">
            {[
              "Should I prioritize Bac+5 over Bac+2 for technical roles?",
              "Which skill correlates most with success?",
              "What is the typical termination pattern?",
              "Profile of high-performing candidates",
            ].map((q) => (
              <div key={q} className="border rounded-lg p-4 bg-muted/30 text-sm">
                {q}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
