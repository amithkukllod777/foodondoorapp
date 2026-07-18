/*
 * Applies drizzle/0021_otp_codes.sql (creates the otpCodes table).
 * Idempotent — safe to re-run; tolerates "table already exists".
 * Usage: node scripts/run-migration-otp.mjs   (requires DATABASE_URL)
 */
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

const sql = readFileSync("./drizzle/0021_otp_codes.sql", "utf8");
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

const conn = await mysql.createConnection(process.env.DATABASE_URL);
console.log("Connected to DB");

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log("✓", stmt.slice(0, 60));
  } catch (e) {
    if (e.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("⚠ Already exists:", stmt.slice(0, 60));
    } else {
      console.error("✗ Error:", e.message, "\n", stmt.slice(0, 80));
    }
  }
}

await conn.end();
console.log("Done!");
