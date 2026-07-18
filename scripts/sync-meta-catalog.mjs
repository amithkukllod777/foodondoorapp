#!/usr/bin/env node
import Papa from "papaparse";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v25.0";
const CATALOG_ID = process.env.META_CATALOG_ID || process.env.FB_CATALOG_ID || "";
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN || "";
const FEED_URL = process.env.META_FEED_URL || "https://www.nutriwow.in/feed/facebook-catalog.csv";
const BATCH_SIZE = Number(process.env.META_CATALOG_BATCH_SIZE || 500);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!CATALOG_ID) {
  fail("Missing META_CATALOG_ID. Set it to the Meta Commerce catalog ID.");
}

if (!ACCESS_TOKEN) {
  fail("Missing META_ACCESS_TOKEN. Use a token with catalog management permissions for that catalog.");
}

function normalizeProduct(row) {
  const id = String(row.id || "").trim();
  const title = String(row.title || "").trim();
  const description = String(row.description || title).trim().slice(0, 5000);
  const image = String(row.image_link || "").trim();
  const link = String(row.link || "").trim();
  const price = String(row.price || "").trim();

  if (!id || !title || !image || !link || !price) return null;

  return {
    method: "UPDATE",
    retailer_id: id,
    data: {
      id,
      title,
      description,
      availability: String(row.availability || "in stock").trim(),
      condition: String(row.condition || "new").trim(),
      price,
      link,
      image_link: image,
      brand: String(row.brand || "Nutriwow").trim(),
      product_type: String(row.product_type || "Dry Fruits & Nuts").trim(),
      visibility: "published",
    },
  };
}

async function postBatch(requests, index) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${CATALOG_ID}/items_batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: ACCESS_TOKEN,
      item_type: "PRODUCT_ITEM",
      allow_upsert: true,
      requests,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Meta batch ${index} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

console.log(`Fetching product feed: ${FEED_URL}`);
const feedResponse = await fetch(FEED_URL);
if (!feedResponse.ok) {
  fail(`Could not fetch feed: ${feedResponse.status} ${feedResponse.statusText}`);
}

const csv = await feedResponse.text();
const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
if (parsed.errors.length > 0) {
  fail(`CSV parse failed: ${parsed.errors.map((e) => e.message).join("; ")}`);
}

const requests = parsed.data.map(normalizeProduct).filter(Boolean);
if (requests.length === 0) {
  fail("No valid products found in feed.");
}

console.log(`Uploading ${requests.length} products to Meta catalog ${CATALOG_ID}...`);
const results = [];
for (let start = 0; start < requests.length; start += BATCH_SIZE) {
  const batch = requests.slice(start, start + BATCH_SIZE);
  const result = await postBatch(batch, results.length + 1);
  results.push({ count: batch.length, result });
  console.log(`Batch ${results.length}: uploaded ${batch.length} products`);
}

console.log(JSON.stringify({
  success: true,
  catalogId: CATALOG_ID,
  productCount: requests.length,
  batches: results.length,
}, null, 2));
