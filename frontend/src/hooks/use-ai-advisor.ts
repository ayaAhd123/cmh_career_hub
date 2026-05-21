import { useState, useRef, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { categoryFor, overallAverage } from "@/lib/calc";
import type { EducationLevel, Category } from "@/lib/types";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export function useAIAdvisor() {
  const candidates = useStore((s) => s.candidates);
  const promotions = useStore((s) => s.promotions);
  
  const [messages, setMessages] = useState<{ role: "ai" | "user"; content: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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
      educationDistribution[c.educationLevel as EducationLevel] = (educationDistribution[c.educationLevel as EducationLevel] || 0) + 1;
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

  const generateAIResponse = async (query: string): Promise<string> => {
    try {
      if (!genAI) {
        console.error("AI key missing: set VITE_GOOGLE_API_KEY in frontend/.env");
        return "AI is not configured. Please set VITE_GOOGLE_API_KEY in your frontend .env file.";
      }

      const prompt = `You are an AI HR Advisor for CareerHub.
Here is the current analytics data of our candidates:
${JSON.stringify(analytics, null, 2)}

Here is the list of promotions:
${JSON.stringify(promotions, null, 2)}

Here is the list of candidates:
${JSON.stringify(candidates, null, 2)}

The user is asking: "${query}"

Provide a helpful, concise, and data-driven response based strictly on the provided data. Use markdown formatting.`;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("AI Generation Error:", error);
      return "Sorry, I am currently unable to process your request. Please check your API key or try again later.";
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
