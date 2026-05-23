import { useState, useRef, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { fetchCandidates, type CandidateListItem } from "@/lib/candidate-api";
import type { EducationLevel, Category } from "@/lib/types";
import { sendAiChat } from "@/lib/ai-api";

export function useAIAdvisor() {
  const promotions = useStore((s) => s.promotions);
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);

  const [messages, setMessages] = useState<{ role: "ai" | "user"; content: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchCandidates({ sort: "avg_desc" })
      .then((res) => setCandidates(res.data))
      .catch(() => setCandidates([]));
  }, []);

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

    const avgSkills: Record<string, string> = {};
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
      avgSkills,
      topSkills: [] as [string, string][],
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

  const generateAIResponse = async (query: string): Promise<string> => {
    try {
      return await sendAiChat(query, {
        analytics,
        promotions,
        candidates,
      });
    } catch (error) {
      console.error("AI Generation Error:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Sorry, I am currently unable to process your request. Please try again later.";
      return msg;
    }
  };

  const handleSendMessage = async (msg?: string) => {
    const text = msg || inputValue;
    if (!text.trim()) return;

    const userMessage = text;
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
  };
}
