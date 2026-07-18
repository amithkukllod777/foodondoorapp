/**
 * Script: upload-product-images.mjs
 * Downloads all product images from Shopify CDN and uploads via Manus storage proxy
 * Outputs a JSON map: { shopifyCdnUrl: s3Url }
 * 
 * Usage: node scripts/upload-product-images.mjs
 */
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config({ path: join(__dirname, '../.env') });

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error('Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY');
  process.exit(1);
}

// All unique Shopify CDN image URLs extracted from products.ts
const allImages = [
  // Product 1 - Combo 900g
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/Nutriwow_Premium_Nuts_Dry_Fruits_Combo_600g_Almonds_Cashews_Green_Raisins_200g_Each___600g_200g_Pack_of_3.png?v=1763812588",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/02_B_Whole_Cashew_Back_409d7bd7-6f2d-4161-88f4-55cfc5987796.jpg?v=1763812588",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/02_C_Whole_Cashew_Nutrition_84e56cdd-a9ce-412f-b0f4-faf12305967f.jpg?v=1763812588",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/03_B_Whole_Almond_Back_f730b806-af72-4c2d-ad3e-012bd0a2bc0c.jpg?v=1763812588",
  // Product 2 - Salted Almonds 400g
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/1500X1500_Salted_Almond_16092025_c8c15f73-2375-4153-9196-1dd530cd5cd2.png?v=1763617179",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/nutriwow-premium-classic-salted-almonds-badam-healthy-protein-rich-snack-9599258.jpg?v=1763617179",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/nutriwow-premium-classic-salted-almonds-badam-healthy-protein-rich-snack-4877527.jpg?v=1763617179",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/nutriwow-premium-classic-salted-almonds-badam-healthy-protein-rich-snack-2567237.jpg?v=1763617179",
  // Product 3 - Cashews + Almonds 400g
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/Whole_Cashew_Whole_AlmondCombo_pack_02bf6984-a69b-40ba-ba66-7b0abbc0612f.png?v=1763020301",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/nutriwow-premium-cashews-kaju-7231955.jpg?v=1763020301",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/nutriwow-premium-cashews-kaju-7567181.jpg?v=1763020301",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/03_B_Whole_Almond_Back_f9539049-8b2e-4281-ad88-ecff86d53e58.jpg?v=1763020301",
  // Product 4 - Green Raisins + Cashews
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/1000X1500_Green_Raisins_Cashews_1762531858836.jpg?v=1762863631",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/IMG-20250905-WA0085.jpg?v=1762863631",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/IMG-20250905-WA0095.jpg?v=1762863631",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/02_B_Whole_Cashew_Back_952112c1-e871-4600-80cd-8152f6e22b53.jpg?v=1762863631",
  // Product 5 - Green Raisins + Salted Almonds
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/1000X1500_Green_Raisins_Salted_Almonds_1762532377958.jpg?v=1762863144",
  "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/01_C_Salted_Almond_Nutrition_fe332163-d114-4c44-9ed5-671b6c7a1c24.jpg?v=1762863144",
];

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout: ' + url)); });
  });
}

function getFilename(url) {
  const clean = url.split('?')[0];
  return clean.split('/').pop();
}

function getContentType(url) {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function uploadToStorage(buffer, filename, contentType) {
  const baseUrl = FORGE_API_URL.replace(/\/+$/, '');
  const uploadUrl = `${baseUrl}/v1/storage/upload?path=products/${filename}`;
  
  const blob = new Blob([buffer], { type: contentType });
  const form = new FormData();
  form.append('file', blob, filename);
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${FORGE_API_KEY}` },
    body: form,
  });
  
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }
  
  const data = await response.json();
  return data.url;
}

async function main() {
  // Deduplicate
  const uniqueImages = [...new Set(allImages)];
  console.log(`Uploading ${uniqueImages.length} unique images to Manus storage...`);
  
  const urlMap = {};
  let success = 0;
  let failed = 0;

  for (let i = 0; i < uniqueImages.length; i++) {
    const url = uniqueImages[i];
    const filename = getFilename(url);
    const contentType = getContentType(url);
    
    try {
      process.stdout.write(`[${i+1}/${uniqueImages.length}] ${filename}... `);
      const buffer = await downloadBuffer(url);
      const s3Url = await uploadToStorage(buffer, filename, contentType);
      urlMap[url] = s3Url;
      success++;
      console.log(`✓`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      urlMap[url] = url; // fallback to original
      failed++;
    }
    
    await new Promise(r => setTimeout(r, 300));
  }

  const outputPath = join(__dirname, 'image-url-map.json');
  writeFileSync(outputPath, JSON.stringify(urlMap, null, 2));
  
  console.log(`\n✅ Done! ${success} uploaded, ${failed} failed`);
  console.log(`URL map saved to: ${outputPath}`);
}

main().catch(console.error);
