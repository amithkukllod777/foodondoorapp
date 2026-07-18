import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL.split('?')[0];
const db = await mysql.createConnection(url + "?ssl={\"rejectUnauthorized\":false}");

// Original Shopify image URL for product 1
const originalImage = "https://cdn.shopify.com/s/files/1/0720/1728/1209/files/Nutriwow_Premium_Nuts_Dry_Fruits_Combo_600g_Almonds_Cashews_Green_Raisins_200g_Each___600g_200g_Pack_of_3.png?v=1763812588";

// Check current image
const [rows] = await db.execute("SELECT id, name, image FROM products WHERE id = 1");
console.log("Current product 1 image:", rows[0]?.image);

// Restore original image
await db.execute("UPDATE products SET image = ? WHERE id = 1", [originalImage]);
console.log("\n✅ Restored product 1 image to original Shopify URL");

// Also delete any stale productImages entries for product 1
const [deleted] = await db.execute("DELETE FROM productImages WHERE productId = 1");
console.log(`✅ Deleted ${deleted.affectedRows} stale productImages rows for product 1`);

// Verify
const [verify] = await db.execute("SELECT id, name, image FROM products WHERE id = 1");
console.log("\nVerified product 1 image:", verify[0]?.image);

await db.end();
