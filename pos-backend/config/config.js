require("dotenv").config();

const port = Number(process.env.PORT || 8000);
const nodeEnv = process.env.NODE_ENV || "development";

const config = Object.freeze({
  port,
  nodeEnv,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  backendUrl: process.env.BETTER_AUTH_URL || `http://localhost:${port}`,
  betterAuthSecret:
    process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET || "development-only-change-me",
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim(),
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpaySecretKey: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  resendFrom: process.env.RESEND_FROM || "POS Platform <onboarding@resend.dev>",
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase(),
  devUnlockFeatures:
    nodeEnv !== "production" && process.env.DEV_UNLOCK_FEATURES !== "false",
});

if (nodeEnv === "production" && config.betterAuthSecret === "development-only-change-me") {
  throw new Error("BETTER_AUTH_SECRET is required in production");
}

if (Boolean(config.googleClientId) !== Boolean(config.googleClientSecret)) {
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together",
  );
}

module.exports = config;
