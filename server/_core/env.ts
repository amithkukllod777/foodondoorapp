export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  // Admin panel password (server-side only — never shipped to the browser bundle).
  // Falls back to the legacy password until ADMIN_PASSWORD is configured in the
  // environment, so existing admins are not locked out during the migration.
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Shipping
  shiprocketEmail: process.env.SHIPROCKET_EMAIL ?? "",
  shiprocketPassword: process.env.SHIPROCKET_PASSWORD ?? "",
  ithinkAccessToken: process.env.ITHINK_ACCESS_TOKEN ?? "",
  ithinkSecretKey: process.env.ITHINK_SECRET_KEY ?? "",
  // iThink pickup/return address id (from the iThink panel) and default courier.
  // Override ITHINK_PICKUP_ID after creating a fresh pickup address in iThink.
  ithinkPickupId: process.env.ITHINK_PICKUP_ID ?? "89598",
  ithinkLogistics: process.env.ITHINK_LOGISTICS ?? "Delhivery",
  // Email (SMTP)
  SMTP_HOST: process.env.SMTP_HOST ?? "smtp.gmail.com",
  SMTP_PORT: process.env.SMTP_PORT ?? "587",
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  // Resend (preferred email provider; falls back to SMTP if unset)
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM ?? "",
  // Facebook Conversions API
  fbConversionsApiToken: process.env.FB_CONVERSIONS_API_TOKEN ?? "",
  // Anthropic (AI email campaign design)
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  // OpenAI (AI blog cover image generation). Set OPENAI_API_KEY. Model is
  // overridable via OPENAI_IMAGE_MODEL (gpt-image-1 default; dall-e-3 also ok).
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
};
