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
  trustedOrigins: [config.frontendUrl],
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
    defaultCookieAttributes: {
      httpOnly: true,
      // cross-domain (Vercel ↔ Render) — must be none+secure so browser
      // doesn't drop the OAuth state cookie during the Google redirect
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
