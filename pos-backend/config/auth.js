const { betterAuth } = require("better-auth");
const { prismaAdapter } = require("better-auth/adapters/prisma");
const prisma = require("./prisma");
const config = require("./config");

const socialProviders =
  config.googleAuthEnabled
    ? {
        google: {
          clientId: config.googleClientId,
          clientSecret: config.googleClientSecret,
        },
      }
    : undefined;

const auth = betterAuth({
  appName: "Restaurant POS",
  baseURL: config.backendUrl,
  secret: config.betterAuthSecret,
  // Trust both the frontend (Vercel) and the backend itself (Render)
  // so the Vercel rewrite proxy's requests are accepted as trusted origins
  trustedOrigins: [config.frontendUrl, config.backendUrl],
  socialProviders,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  account: {
    accountLinking: {
      // Allow Google sign-in to link to an existing email/password account
      // automatically. Without this, users who registered with email/password
      // get `account_not_linked` when they try Google OAuth with the same email.
      enabled: true,
      trustedProviders: ["google"],
      // Set to false because email/password signups might not have verified emails
      requireLocalEmailVerified: false,
    },
    // vercel.app and onrender.com are public-suffix domains — browsers block
    // SameSite=None cookies from them regardless of cookie config.
    // The Vercel rewrite proxy makes auth first-party, but as a documented
    // fallback we skip the state cookie check since the state is still
    // verified via the OAuth `state` query param from Google.
    skipStateCookieCheck: config.nodeEnv === "production",
  },
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "CASHIER",
        input: false,
      },
      restaurantId: {
        type: "string",
        required: false,
        input: false,
      },
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  advanced: {
    // cross-domain (Vercel ↔ Render) — must be none+secure so browser
    // doesn't drop the OAuth state cookie during the Google redirect.
    // Note: vercel.app / onrender.com are public suffixes so browsers
    // may still block — the Vercel rewrite proxy in vercel.json is the
    // real fix; these settings are a belt-and-suspenders fallback.
    useSecureCookies: true,
    defaultCookieAttributes: {
      httpOnly: true,
      secure: true,
      sameSite: config.nodeEnv === "production" ? "none" : "lax",
    },
    // Tell Better-Auth to trust Render's forwarded IP header so
    // rate limiting works per-client instead of a shared bucket
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
      trustedProxies: ["loopback", "linklocal", "uniquelocal"],
    },
  },
});

module.exports = auth;
