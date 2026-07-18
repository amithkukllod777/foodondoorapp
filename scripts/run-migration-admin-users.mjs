#!/usr/bin/env node
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomBytes, scryptSync } from "crypto";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const parsed = new URL(url);
  const conn = await mysql.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port) || 4000,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    ssl: { rejectUnauthorized: true },
  });

  const ddl = readFileSync(join(__dirname, "../drizzle/0023_admin_users.sql"), "utf8");
  for (const stmt of ddl.split(";").filter((s) => s.trim())) {
    await conn.execute(stmt);
  }
  console.log("adminUsers table created");

  const seedUsers = [
    { email: "amith@foodondoor.com", name: "Amith", mobile: "9243177706", role: "owner" },
    { email: "orders@foodondoor.com", name: "Orders Team", mobile: "9546334633", role: "admin" },
    { email: "wecare@nutriwow.in", name: "Customer Care", mobile: null, role: "admin" },
  ];

  for (const u of seedUsers) {
    const [existing] = await conn.execute(
      "SELECT id FROM adminUsers WHERE email = ?",
      [u.email],
    );
    if (existing.length > 0) {
      console.log(`${u.email} already exists, skipping`);
      continue;
    }
    const tempPassword = randomBytes(4).toString("hex");
    const hash = hashPassword(tempPassword);
    await conn.execute(
      "INSERT INTO adminUsers (email, name, mobile, passwordHash, adminRole) VALUES (?, ?, ?, ?, ?)",
      [u.email, u.name, u.mobile, hash, u.role],
    );
    console.log(`Created ${u.email} (temp password: ${tempPassword})`);
  }

  await conn.end();
  console.log("\nDone! Users should reset passwords via /admin/login -> Forgot Password");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
