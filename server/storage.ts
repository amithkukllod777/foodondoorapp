// Storage helpers — uses Vercel Blob (public) for uploaded media (banners,
// product images, blog images, WhatsApp template images).
//
// Requires the BLOB_READ_WRITE_TOKEN env var, which Vercel sets automatically
// when the Blob store is connected to the project.

import { put } from "@vercel/blob";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "Storage not configured: set BLOB_READ_WRITE_TOKEN (connect the Vercel Blob store to this project).",
    );
  }
  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? data : Buffer.from(data as Uint8Array);
  const blob = await put(key, body, {
    access: "public",
    contentType,
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { key, url: blob.url };
}

// Kept for API compatibility (currently unused). Public blobs are served
// directly from the URL returned by storagePut.
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  return { key: normalizeKey(relKey), url: "" };
}
