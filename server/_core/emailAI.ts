/*
 * AI email-campaign designer — generates a responsive, email-client-safe HTML
 * campaign from a short brief using Claude (Anthropic). Requires ANTHROPIC_API_KEY.
 */
import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

export interface GeneratedCampaign {
  subject: string;
  previewText: string;
  html: string;
}

export interface GenerateInput {
  brief: string;
  storeName?: string;
  storeUrl?: string;
  brandColor?: string;
  logoUrl?: string;
  products?: Array<{ name: string; price?: number; url?: string; image?: string }>;
}

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", description: "Email subject line, < 60 chars, compelling, no clickbait" },
    previewText: { type: "string", description: "Preheader/preview text shown in inbox, < 100 chars" },
    html: { type: "string", description: "Complete responsive HTML email document" },
  },
  required: ["subject", "previewText", "html"],
  additionalProperties: false,
} as const;

function systemPrompt(input: GenerateInput): string {
  const store = input.storeName || "Nutriwow";
  const url = input.storeUrl || "https://nutriwow.in";
  const brand = input.brandColor || "#43A047";
  const logo = input.logoUrl || "https://nutriwow.in/nutriwow-logo.png";
  return `You are an expert email marketing designer for ${store}, an Indian premium dry-fruits, nuts & healthy-snacks e-commerce store (${url}).

Produce a COMPLETE, production-ready HTML email. Hard requirements:
- Single self-contained HTML document (<!DOCTYPE html> ... </html>). No external CSS files or <script>.
- Table-based layout, max-width 600px, centered. Mobile-responsive with inline CSS only (email clients strip <style> in <head> for many cases — inline the critical styles; a <style> block in <head> may add media queries as progressive enhancement).
- Web-safe fonts (Arial, Helvetica, sans-serif) with graceful fallbacks.
- Use the brand color ${brand} for primary buttons/accents. Clean, trustworthy, appetizing look.
- BRAND LOGO (required): the header MUST start with the store logo as a real image: <img src="${logo}" alt="${store}" width="150" style="display:block;margin:0 auto;max-width:150px;height:auto"> centered at the top, on a white or light background (the logo is green-on-transparent, so do NOT place it on a dark/green background — use white/cream behind it). Then the store name/tagline below or beside it.
- Include: a clear hero message, body content, and at least one prominent CTA button linking to ${url} (or a relevant /collections path).
- PRODUCT IMAGES: when product image URLs are provided below, you MUST render each featured product as a real card with <img src="THE_EXACT_URL" width="..." alt="..." style="..."> using that exact hosted URL (they are valid, publicly accessible images — never replace them with placeholders or emoji). Lay featured products out as an attractive responsive grid/cards: product image on top, then name, ₹ price, and a "Shop Now"/"Buy" button linking to the product's URL.
- Every <img> must have alt text. If NO product images are provided, use tasteful text/emoji + colored blocks instead of hotlinking images that may not exist.
- Footer must include the store name, a short address line placeholder, and an unsubscribe line: "You're receiving this because you shopped with ${store}. Unsubscribe." (plain text is fine — no working link needed).
- Indian context: prices in ₹ (INR), tone warm and benefit-led.
- Output ONLY via the structured schema (subject, previewText, html). Do not wrap html in markdown fences.`;
}

function userPrompt(input: GenerateInput): string {
  let p = `Campaign brief:\n${input.brief}\n`;
  if (input.products?.length) {
    p += `\nFeature these products (use real ₹ prices and link to their URLs):\n`;
    for (const pr of input.products.slice(0, 8)) {
      p += `- ${pr.name}${pr.price ? ` (₹${pr.price})` : ""}${pr.url ? ` → ${pr.url}` : ""}${pr.image ? ` [img: ${pr.image}]` : ""}\n`;
    }
  }
  p += `\nDesign a polished, conversion-focused email for the brief above.`;
  return p;
}

export function isAiConfigured(): boolean {
  return !!ENV.anthropicApiKey;
}

export async function generateEmailCampaign(
  input: GenerateInput,
  apiKeyOverride?: string
): Promise<GeneratedCampaign> {
  // Prefer a key saved from the admin UI; fall back to the env var.
  const apiKey = (apiKeyOverride && apiKeyOverride.trim()) || ENV.anthropicApiKey;
  if (!apiKey) {
    throw new Error(
      "AI is not configured. Add your Anthropic API key in Admin → Email (AI settings), or set ANTHROPIC_API_KEY in the deployment environment."
    );
  }
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    // effort low keeps generation comfortably within the 60s serverless limit
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    system: systemPrompt(input),
    messages: [{ role: "user", content: userPrompt(input) }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI returned no usable content. Please try again.");
  }
  let parsed: GeneratedCampaign;
  try {
    parsed = JSON.parse(textBlock.text) as GeneratedCampaign;
  } catch {
    throw new Error("AI returned malformed output. Please try again.");
  }
  if (!parsed.html || !parsed.subject) {
    throw new Error("AI output was incomplete. Please try again.");
  }
  return {
    subject: parsed.subject,
    previewText: parsed.previewText || "",
    html: parsed.html,
  };
}
