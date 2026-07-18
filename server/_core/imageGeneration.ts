/**
 * AI image generation — OpenAI Images API (gpt-image-1).
 *
 * Generates an image from a text prompt, uploads it to Vercel Blob, and returns
 * the public URL. Used for blog cover images (blog.admin.aiGenerateImage).
 *
 * Requires OPENAI_API_KEY. The model id is overridable via OPENAI_IMAGE_MODEL.
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.openaiApiKey) {
    throw new Error(
      "AI image generation is not configured. Set OPENAI_API_KEY in the environment, or upload an image manually."
    );
  }

  const res = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: ENV.openaiImageModel,
      prompt: options.prompt,
      // Landscape cover. gpt-image-1 supports 1536x1024; dall-e-3 supports 1792x1024.
      size: ENV.openaiImageModel === "dall-e-3" ? "1792x1024" : "1536x1024",
      n: 1,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    // Surface OpenAI's own error message so misconfig (bad key, billing,
    // wrong model) is obvious to the admin instead of a generic failure.
    let detail = `HTTP ${res.status}`;
    try {
      const err = JSON.parse(text) as { error?: { message?: string } };
      if (err.error?.message) detail = err.error.message;
    } catch { /* keep status */ }
    throw new Error(`Image generation failed: ${detail}`);
  }

  const data = JSON.parse(text) as {
    data?: { b64_json?: string; url?: string }[];
  };

  const first = data.data?.[0];

  // gpt-image-1 always returns b64_json; dall-e-3 may return a url instead.
  if (first?.b64_json) {
    const buffer = Buffer.from(first.b64_json, "base64");
    const key = `blog/ai/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const { url } = await storagePut(key, buffer, "image/png");
    return { url };
  }

  if (first?.url) {
    const imgRes = await fetch(first.url);
    if (!imgRes.ok) {
      throw new Error(`Image generation failed: could not fetch result (HTTP ${imgRes.status})`);
    }
    const contentType = imgRes.headers.get("content-type") ?? "image/png";
    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const key = `blog/ai/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { url } = await storagePut(key, buffer, contentType);
    return { url };
  }

  throw new Error("Image generation returned no image. Try a different prompt.");
}
