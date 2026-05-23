import { useAuth } from "./auth";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8000";

export interface AiChatContext {
  analytics: Record<string, unknown>;
  promotions: unknown[];
  candidates: unknown[];
}

export async function sendAiChat(
  message: string,
  context: AiChatContext,
): Promise<string> {
  const token = useAuth.getState().token;
  const res = await fetch(`${API_BASE}/api/v1/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, context }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (data as { message?: string }).message ||
      "Unable to reach the AI advisor. Please try again.";
    throw new Error(msg);
  }

  const reply = (data as { data?: { reply?: string } }).data?.reply;
  if (!reply) {
    throw new Error("The AI advisor returned an empty response.");
  }

  return reply;
}
