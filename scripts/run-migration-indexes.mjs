/*
 * Applies index migration SQL files (secondary indexes for hot query paths).
 * Idempotent — tolerates "Duplicate key name" (1061) so it is safe to re-run.
 * Usage: node scripts/run-migration-indexes.mjs   (requires DATABASE_URL)
 */
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

const files = [
  "./drizzle/0022_perf_indexes.sql",
  "./drizzle/0026_messaging_indexes.sql",
];
const statements = files.flatMap(f =>
  readFileSync(f, "utf8").split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean)
);

const conn = await mysql.createConnection(process.env.DATABASE_URL);
console.log("Connected to DB");

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log("✓", stmt.slice(0, 70));
  } catch (e) {
    if (e.code === "ER_DUP_KEYNAME" || e.errno === 1061) {
      console.log("⚠ Already exists:", stmt.slice(0, 70));
    } else {
      console.error("✗ Error:", e.message, "\n", stmt.slice(0, 90));
    }
  }
}

await conn.end();
console.log("Done!");
