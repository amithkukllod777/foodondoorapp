import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

// Live-integration suites: these require production secrets or make real
// external calls (DB, Meta WhatsApp, PhonePe, live SMTP send). They are
// excluded from the default `pnpm test` / CI run and only executed when
// RUN_LIVE_TESTS is set (with the relevant credentials available).
const LIVE_TESTS = [
  "server/whatsapp.test.ts",
  "server/phonepe.test.ts",
  "server/email.test.ts",
  "server/blog.test.ts",
  "server/adminSession.test.ts",
  "server/auth.logout.test.ts",
];

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    exclude: process.env.RUN_LIVE_TESTS
      ? [...configDefaults.exclude]
      : [...configDefaults.exclude, ...LIVE_TESTS],
  },
});
