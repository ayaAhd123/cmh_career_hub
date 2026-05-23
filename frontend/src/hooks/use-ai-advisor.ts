import { useState, useRef, useEffect } from "react";
import { sendAiChat } from "@/lib/ai-api";

type AiAdvisorOptions = {
  /** Reserved for lazy-loading the bubble panel only when open. */
  enabled?: boolean;
};

export function useAIAdvisor({ enabled: _enabled = true }: AiAdvisorOptions = {}) {
  const [messages, setMessages] = useState<{ role: "ai" | "user"; content: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const generateAIResponse = async (query: string): Promise<string> => {
    try {
      return await sendAiChat(query);
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
    contextReady: true,
  };
}
