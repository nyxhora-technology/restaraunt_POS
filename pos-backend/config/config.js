const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const port = Number(process.env.PORT || 8000);
const nodeEnv = process.env.NODE_ENV || "development";
const parseBoolean = (value, fallback = false) => {
  if (value == null || value === "") return fallback;
  return value.trim().toLowerCase() === "true";
};
const isProduction = nodeEnv === "production";
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const googleAuthEnabled = parseBoolean(
  process.env.GOOGLE_AUTH_ENABLED,
  Boolean(googleClientId && googleClientSecret),
);
const validateUrl = (name, value, { requireHttps = false } = {}) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${name} must use http or https`);
  }
  if (requireHttps && parsed.protocol !== "https:") {
    throw new Error(`${name} must use https in production`);
  }
  return parsed.origin;
};

const frontendUrl = validateUrl(
  "FRONTEND_URL",
  process.env.FRONTEND_URL || "http://localhost:5173",
  { requireHttps: nodeEnv === "production" },
);
const backendUrl = validateUrl(
  "BETTER_AUTH_URL",
  process.env.BETTER_AUTH_URL || `http://localhost:${port}`,
  { requireHttps: nodeEnv === "production" },
);

const config = Object.freeze({
  port,
  nodeEnv,
  frontendUrl,
  backendUrl,
  betterAuthSecret:
    process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET || "development-only-change-me",
  googleAuthEnabled,
  googleClientId,
  googleClientSecret,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpaySecretKey: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  onlinePaymentsEnabled: parseBoolean(
    process.env.ONLINE_PAYMENTS_ENABLED,
    false,
  ),
  resendApiKey: process.env.RESEND_API_KEY,
  resendFrom: process.env.RESEND_FROM || "POS Platform <onboarding@resend.dev>",
  staffEmailInvitesEnabled: parseBoolean(
    process.env.STAFF_EMAIL_INVITES_ENABLED,
    false,
  ),
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase(),
  devUnlockFeatures:
    nodeEnv !== "production" && process.env.DEV_UNLOCK_FEATURES !== "false",
});

if (isProduction) {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required in production");
  }

  if (
    !process.env.BETTER_AUTH_SECRET?.trim() ||
    config.betterAuthSecret === "development-only-change-me" ||
    config.betterAuthSecret.length < 32
  ) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters in production");
  }

  if (config.onlinePaymentsEnabled) {
    if (!config.razorpayKeyId || !config.razorpaySecretKey || !config.razorpayWebhookSecret) {
      throw new Error(
        "ONLINE_PAYMENTS_ENABLED requires RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET in production",
      );
    }
  }

  if (config.staffEmailInvitesEnabled) {
    if (!config.resendApiKey || !config.resendFrom) {
      throw new Error(
        "STAFF_EMAIL_INVITES_ENABLED requires RESEND_API_KEY and RESEND_FROM in production",
      );
    }
  }
}

if (Boolean(config.googleClientId) !== Boolean(config.googleClientSecret)) {
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together",
  );
}

if (
  config.googleAuthEnabled &&
  (!config.googleClientId || !config.googleClientSecret)
) {
  throw new Error(
    "Google authentication is enabled but GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are missing",
  );
}

module.exports = config;
