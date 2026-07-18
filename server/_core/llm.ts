import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";
import { getStoreSetting } from "../db";

export type Role = "system" | "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: { name: string; schema: Record<string, unknown>; strict?: boolean } };

export type InvokeParams = {
  messages: Message[];
  maxTokens?: number;
  max_tokens?: number;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type InvokeResult = {
  choices: Array<{
    index: number;
    message: { role: Role; content: string };
    finish_reason: string | null;
  }>;
};

async function getApiKey(): Promise<string> {
  if (ENV.anthropicApiKey) return ENV.anthropicApiKey;
  try {
    const dbKey = await getStoreSetting("anthropicApiKey");
    if (typeof dbKey === "string" && dbKey.trim()) return dbKey.trim();
  } catch {}
  throw new Error(
    "Anthropic API key not configured. Add it in Admin → Settings, or set ANTHROPIC_API_KEY in the deployment environment."
  );
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = await getApiKey();
  const client = new Anthropic({ apiKey });

  const systemMsgs = params.messages.filter(m => m.role === "system");
  const userMsgs = params.messages.filter(m => m.role !== "system");
  const systemText = systemMsgs.map(m => typeof m.content === "string" ? m.content : "").join("\n\n");

  const format = params.responseFormat || params.response_format;
  const wantsJson = format && format.type !== "text";

  let finalSystem = systemText;
  if (wantsJson) {
    finalSystem += "\n\nIMPORTANT: Return your response as valid JSON only, with no markdown fences or extra text.";
  }

  const maxTokens = params.maxTokens || params.max_tokens || 4096;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: finalSystem || undefined,
    messages: userMsgs.map(m => ({
      role: m.role as "user" | "assistant",
      content: typeof m.content === "string" ? m.content : String(m.content),
    })),
  });

  const textBlock = response.content.find(b => b.type === "text");
  const content = textBlock && textBlock.type === "text" ? textBlock.text : "";

  return {
    choices: [{
      index: 0,
      message: { role: "assistant", content },
      finish_reason: response.stop_reason || "end_turn",
    }],
  };
}
