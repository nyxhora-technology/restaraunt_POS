const { betterAuth } = require("better-auth");
const { prismaAdapter } = require("better-auth/adapters/prisma");
const prisma = require("./prisma");
const config = require("./config");

const socialProviders =
  config.googleClientId && config.googleClientSecret
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
      secure: config.nodeEnv === "production",
      sameSite: "lax",
    },
  },
});

module.exports = auth;
