import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL.split('?')[0];
const db = await mysql.createConnection(url + "?ssl={\"rejectUnauthorized\":false}");

// Check first few products and their images
const [products] = await db.execute(
  "SELECT id, name, image, images FROM products ORDER BY id ASC LIMIT 5"
);
console.log("\n=== Products (first 5) ===");
for (const p of products) {
  console.log(`\nID: ${p.id} | ${p.name.slice(0, 50)}`);
  console.log(`  image: ${p.image}`);
  if (p.images) {
    try {
      const imgs = JSON.parse(p.images);
      console.log(`  images (JSON): ${imgs.length} items`);
      imgs.forEach((img, i) => console.log(`    [${i}]: ${img}`));
    } catch {}
  }
}

// Check productImages table
const [productImages] = await db.execute(
  "SELECT * FROM productImages ORDER BY productId, sortOrder LIMIT 20"
);
console.log(`\n=== productImages table (${productImages.length} rows) ===`);
for (const img of productImages) {
  console.log(`  ID:${img.id} productId:${img.productId} isHero:${img.isHero} url: ${img.url.slice(0, 80)}`);
}

await db.end();
