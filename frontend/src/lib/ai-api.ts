import { useAuth } from "./auth";
import { apiUrl } from "./api-base";

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
  const res = await fetch(apiUrl("/api/v1/ai/chat"), {
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
