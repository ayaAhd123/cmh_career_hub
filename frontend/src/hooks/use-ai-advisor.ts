import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useStore } from "@/lib/store";
import { fetchCandidates, type CandidateListItem } from "@/lib/candidate-api";
import type { EducationLevel, Category } from "@/lib/types";
import { sendAiChat } from "@/lib/ai-api";

type AiAdvisorOptions = {
  /** When false, skips loading candidate data until needed. */
  enabled?: boolean;
};

function slimCandidatesForAi(candidates: CandidateListItem[]) {
  return candidates.slice(0, 80).map((c) => ({
    name: `${c.firstName} ${c.lastName}`,
    status: c.status,
    avgScore: c.avgScore,
    category: c.category,
    promotion: c.promotionName,
    education: c.educationLevel,
  }));
}

function slimPromotionsForAi(
  promotions: { id: string; name: string; status?: string; candidateCount?: number }[],
) {
  return promotions.slice(0, 50).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    candidates: p.candidateCount,
  }));
}

export function useAIAdvisor({ enabled = true }: AiAdvisorOptions = {}) {
  const promotions = useStore((s) => s.promotions);
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [contextReady, setContextReady] = useState(false);
  const contextLoadingRef = useRef(false);

  const [messages, setMessages] = useState<{ role: "ai" | "user"; content: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadContext = useCallback(async () => {
    if (contextReady || contextLoadingRef.current) return;
    contextLoadingRef.current = true;
    try {
      const res = await fetchCandidates({ sort: "avg_desc" });
      setCandidates(res.data);
      setContextReady(true);
    } catch {
      setCandidates([]);
      setContextReady(true);
    } finally {
      contextLoadingRef.current = false;
    }
  }, [contextReady]);

  useEffect(() => {
    if (enabled) void loadContext();
  }, [enabled, loadContext]);

  const analytics = useMemo(() => {
    const active = candidates.filter((c) => c.status === "Active" && !c.archived);
    const graduated = candidates.filter(
      (c) => !c.archived && (c.status === "Graduated" || (c.avgScore >= 2.5 && c.status !== "Active")),
    );
    const terminated = candidates.filter((c) => c.status === "Terminated" && !c.archived);
    const dismissed = candidates.filter((c) => c.status === "Dismissed" && !c.archived);
    const total = candidates.filter((c) => !c.archived);

    const educationDistribution = {} as Record<EducationLevel, number>;
    const categoryDistribution = {} as Record<Category, number>;

    total.forEach((c) => {
      const edu = c.educationLevel as EducationLevel;
      educationDistribution[edu] = (educationDistribution[edu] || 0) + 1;
      categoryDistribution[c.category] = (categoryDistribution[c.category] || 0) + 1;
    });

    const successRate =
      total.length > 0 ? ((graduated.length / total.length) * 100).toFixed(1) : 0;
    const terminationRate =
      total.length > 0 ? ((terminated.length / total.length) * 100).toFixed(1) : 0;

    return {
      total: total.length,
      active: active.length,
      graduated: graduated.length,
      terminated: terminated.length,
      dismissed: dismissed.length,
      educationDistribution,
      categoryDistribution,
      successRate,
      terminationRate,
    };
  }, [candidates]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const generateAIResponse = async (query: string): Promise<string> => {
    if (!contextReady) await loadContext();

    try {
      return await sendAiChat(query, {
        analytics,
        promotions: slimPromotionsForAi(promotions),
        candidates: slimCandidatesForAi(candidates),
      });
    } catch (error) {
      console.error("AI Generation Error:", error);
      return error instanceof Error
        ? error.message
        : "Sorry, I am currently unable to process your request. Please try again later.";
    }
  };

  const handleSendMessage = async (msg?: string) => {
    const text = msg || inputValue;
    if (!text.trim() || isTyping) return;

    const userMessage = text.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsTyping(true);

    const aiResponse = await generateAIResponse(userMessage);
    setMessages((prev) => [...prev, { role: "ai", content: aiResponse }]);
    setIsTyping(false);
  };

  return {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    handleSendMessage,
    messagesEndRef,
    contextReady,
  };
}
