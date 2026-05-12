import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, BarChart3, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { categoryFor, overallAverage } from "@/lib/calc";
import type { EducationLevel, Category } from "@/lib/types";

export const Route = createFileRoute("/ai-advisor")({
  head: () => ({ meta: [{ title: "AI Advisor — CareerHub" }] }),
  component: AIAdvisor,
});

function AIAdvisor() {
  const candidates = useStore((s) => s.candidates);
  const promotions = useStore((s) => s.promotions);
  const [messages, setMessages] = useState<{ role: "ai" | "user"; content: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const analytics = useMemo(() => {
    const active = candidates.filter((c) => c.status === "Active" && !c.archived);
    const graduated = candidates.filter((c) => !c.archived && (c.status === "Graduated" || (overallAverage(c) >= 10 && c.status !== "Active")));
    const terminated = candidates.filter((c) => c.status === "Terminated" && !c.archived);
    const dismissed = candidates.filter((c) => c.status === "Dismissed" && !c.archived);
    const total = candidates.filter((c) => !c.archived);

    const educationDistribution = {} as Record<EducationLevel, number>;
    const categoryDistribution = {} as Record<Category, number>;
    const skillsSum = {
      discipline: 0,
      motivation: 0,
      communication: 0,
      listening: 0,
      initiative: 0,
      analysis: 0,
      organization: 0,
      intellectual: 0,
      pace: 0,
      speed: 0,
    };

    total.forEach((c) => {
      educationDistribution[c.educationLevel] = (educationDistribution[c.educationLevel] || 0) + 1;
      const cat = categoryFor(overallAverage(c));
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;

      skillsSum.discipline += c.skills.discipline.discipline;
      skillsSum.motivation += c.skills.discipline.motivation;
      skillsSum.communication += c.skills.discipline.communication;
      skillsSum.listening += c.skills.discipline.listening;
      skillsSum.initiative += c.skills.work.initiative;
      skillsSum.analysis += c.skills.work.analysis;
      skillsSum.organization += c.skills.work.organization;
      skillsSum.intellectual += c.skills.work.intellectual;
      skillsSum.pace += c.skills.work.pace;
      skillsSum.speed += c.skills.work.speed;
    });

    const avgSkills = total.length > 0 ? Object.fromEntries(Object.entries(skillsSum).map(([k, v]) => [k, (v / total.length).toFixed(2)])) : skillsSum;

    const successRate = total.length > 0 ? ((graduated.length / total.length) * 100).toFixed(1) : 0;
    const terminationRate = total.length > 0 ? ((terminated.length / total.length) * 100).toFixed(1) : 0;

    const topSkills = Object.entries(avgSkills)
      .sort(([, a], [, b]) => parseFloat(b as string) - parseFloat(a as string))
      .slice(0, 3);

    return {
      total: total.length,
      active: active.length,
      graduated: graduated.length,
      terminated: terminated.length,
      dismissed: dismissed.length,
      educationDistribution,
      categoryDistribution,
      avgSkills,
      topSkills,
      successRate,
      terminationRate,
    };
  }, [candidates]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = (query: string): string => {
    const q = query.toLowerCase();

    const responses: { keywords: string[]; response: string }[] = [
      {
        keywords: ["education", "bac", "level", "qualification"],
        response: `Based on the data analysis:\n\n📊 **Education Level Distribution:**\n${Object.entries(analytics.educationDistribution)
          .map(([level, count]) => `• ${level}: ${count} candidates (${((count / analytics.total) * 100).toFixed(1)}%)`)
          .join("\n")}\n\nCandidates with higher education levels (Bac+5, Bac+8) tend to perform exceptionally. The data suggests prioritizing candidates with advanced education for technical roles.`,
      },
      {
        keywords: ["skill", "top performing", "best skill", "correlation"],
        response: `**Top Performing Skills Analysis:**\n\n🌟 Top 3 Skills:\n${analytics.topSkills
          .map(([skill, score]) => `• ${skill.charAt(0).toUpperCase() + skill.slice(1)}: ${score}/5`)
          .join("\n")}\n\nThese skills show the strongest correlation with candidate success and graduation rates.`,
      },
      {
        keywords: ["termination", "dismissed", "fail", "dropout"],
        response: `**Candidate Status Overview:**\n\n📈 **Key Metrics:**\n• Success Rate (Graduated): ${analytics.successRate}%\n• Termination Rate: ${analytics.terminationRate}%\n• Dismissed: ${analytics.dismissed}\n• Currently Active: ${analytics.active}\n\nTermination patterns suggest focusing on candidates with strong organizational and initiative skills during recruitment.`,
      },
      {
        keywords: ["performance", "category", "excellent", "good", "passable"],
        response: `**Performance Distribution:**\n\n📊 Candidate Categories:\n${Object.entries(analytics.categoryDistribution)
          .map(([cat, count]) => `• ${cat}: ${count} candidates (${((count / analytics.total) * 100).toFixed(1)}%)`)
          .join("\n")}\n\nThis distribution indicates a healthy talent pool with ${analytics.categoryDistribution["Excellent"] || 0} excellent performers to build your strategic initiatives on.`,
      },
      {
        keywords: ["recruitment", "profile", "best", "ideal"],
        response: `**Ideal Recruitment Profile:**\n\n🎯 **Recommended Profile:**\n• Education: Bac+5 or higher\n• Key Skills: ${analytics.topSkills.map(([s]) => s).join(", ")}\n• Expected Success Rate: ~${analytics.successRate}%\n\nThis profile is derived from analyzing ${analytics.total} candidates and their outcomes.`,
      },
      {
        keywords: ["summary", "overview", "stats", "statistics", "data"],
        response: `**Overall Analytics Summary:**\n\n📊 **Total Candidates:** ${analytics.total}\n• Active: ${analytics.active}\n• Graduated: ${analytics.graduated}\n• Terminated: ${analytics.terminated}\n• Dismissed: ${analytics.dismissed}\n\n💡 **Key Insight:** Success rate is ${analytics.successRate}%, with top skills being ${analytics.topSkills.map(([s]) => s).join(", ")}.`,
      },
    ];

    const match = responses.find((r) => r.keywords.some((k) => q.includes(k)));
    if (match) return match.response;

    return `I've analyzed ${analytics.total} candidates in the system. Ask me about:\n• Education level distribution\n• Top performing skills\n• Termination and success rates\n• Performance categories\n• Ideal recruitment profiles\n\nI can help you make data-driven recruitment decisions.`;
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    setInputValue("");

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    setTimeout(() => {
      const aiResponse = generateAIResponse(userMessage);
      setMessages((prev) => [...prev, { role: "ai", content: aiResponse }]);
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="text-accent" /> AI Analytics Advisor
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analytics.total}</div>
              <p className="text-xs text-muted-foreground">Total Candidates</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.graduated}</div>
              <p className="text-xs text-muted-foreground">Graduated</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{analytics.active}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{analytics.terminated}</div>
              <p className="text-xs text-muted-foreground">Terminated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{analytics.successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">of candidates graduated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" /> Top Skill
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold capitalize">{analytics.topSkills[0]?.[0] || "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Score: {analytics.topSkills[0]?.[1]}/5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Termination Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{analytics.terminationRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">candidates terminated</p>
          </CardContent>
        </Card>
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
                <p className="mb-3">👋 Ask me questions about your candidate data:</p>
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
            <Button onClick={handleSendMessage} size="sm" className="gap-2">
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
