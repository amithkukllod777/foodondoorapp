import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const plugins = [react(), tailwindcss(), jsxLocPlugin()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter(d => !d.includes("vendor-sentry")),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react-dom")) {
            return "vendor-react-dom";
          }
          if (id.includes("/react/") || id.includes("react-helmet-async") || id.includes("wouter")) {
            return "vendor-react";
          }
          if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("sonner") || id.includes("embla-carousel") || id.includes("class-variance-authority") || id.includes("clsx") || id.includes("tailwind-merge") || id.includes("cmdk") || id.includes("vaul") || id.includes("input-otp") || id.includes("react-day-picker")) {
            return "vendor-ui";
          }
          if (id.includes("@trpc") || id.includes("@tanstack") || id.includes("superjson")) {
            return "vendor-data";
          }
          if (id.includes("@sentry")) {
            return "vendor-sentry";
          }
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
