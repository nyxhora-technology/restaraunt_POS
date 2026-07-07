const express = require("express");
const http = require("http");
const crypto = require("crypto");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { toNodeHandler } = require("better-auth/node");
const config = require("./config/config");
const auth = require("./config/auth");
const prisma = require("./config/prisma");
const globalErrorHandler = require("./middlewares/globalErrorHandler");
const { initSocket, closeSocket } = require("./config/socket");
const { webHookVerification } = require("./controllers/paymentController");
const { sanitizeInput } = require("./middlewares/sanitizeInput");

const app = express();

app.set("trust proxy", 1);

// ── Security headers (Helmet + full CSP) ──────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "https://checkout.razorpay.com"],
        styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc:     ["'self'", "https://fonts.gstatic.com"],
        imgSrc:      ["'self'", "data:", "https:", "blob:"],
        connectSrc:  ["'self'", "wss:", "ws:", "https://api.razorpay.com", "https://lumberjack.razorpay.com"],
        frameSrc:    ["https://api.razorpay.com"],
        objectSrc:   ["'none'"],
        baseUri:     ["'self'"],
        formAction:  ["'self'"],
        // Only force HTTPS upgrade in production — dev runs on plain HTTP
        ...(config.nodeEnv === "production" && { upgradeInsecureRequests: [] }),
      },
    },
    // Razorpay checkout uses cross-origin iframes
    crossOriginEmbedderPolicy: false,
    // Allow clickable links from Google / WhatsApp referrers
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    credentials: true,
    origin: config.frontendUrl,
  }),
);
app.use(cookieParser());

app.get("/api/config/auth", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({
    success: true,
    data: { googleEnabled: config.googleAuthEnabled },
  });
});

// ── Request correlation ID ─────────────────────────────────────────────────
// Lets support trace any error report back to a specific request in logs.
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

// ── Rate limiters ──────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

// General API limiter — wide window, generous cap
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

// Write limiter — tighter cap on state-changing endpoints
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  limit: 60,                 // 60 writes per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many write requests, slow down." },
});

// Admin limiter — very tight
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.all("/api/auth/*", toNodeHandler(auth));

app.use("/api", apiLimiter);
app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});
app.use("/api/admin", adminLimiter);

app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json", limit: "256kb" }),
  webHookVerification,
);

app.use(express.json({ limit: "256kb" }));
app.use(sanitizeInput); // Strip HTML + control chars from all string body values

// Attach request timing to all /api routes
app.use("/api", (req, res, next) => {
  req.requestStartedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - req.requestStartedAt;
    if (config.nodeEnv !== "production" && durationMs >= 500) {
      console.warn(`Slow API: ${req.method} ${req.originalUrl} ${durationMs}ms`);
    }
  });
  next();
});

app.get("/", (_req, res) => {
  res.json({ success: true, message: "Restaurant POS API" });
});
app.get("/api/health", async (_req, res, next) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    res.json({ success: true, database: "connected" });
  } catch (error) {
    next(error);
  }
});

app.use("/api/admin",      require("./routes/adminRoute"));
app.use("/api/restaurant", require("./routes/restaurantRoute"));
app.use("/api/referral",   require("./routes/referralRoute"));
app.use("/api/menu",       require("./routes/menuRoute"));
app.use("/api/order",      require("./routes/orderRoute"));
app.use("/api/table",      require("./routes/tableRoute"));
app.use("/api/payment",    require("./routes/paymentRoute"));
app.use("/api/inventory",  require("./routes/inventoryRoute"));
app.use("/api/qr",         require("./routes/qrRoute"));
app.use("/api/export",     require("./routes/exportRoute"));
app.use("/api/analytics",  require("./routes/analyticsRoute"));
app.use("/api/reservations", require("./routes/reservationRoute"));

app.use((_req, _res, next) => {
  next(Object.assign(new Error("Route not found"), { statusCode: 404 }));
});
app.use(globalErrorHandler);

const server = http.createServer(app);
initSocket(server);
let shuttingDown = false;

const start = async () => {
  await prisma.$connect();
  server.listen(config.port, () => {
    console.log(`POS API listening on ${config.backendUrl}`);
    console.log(
      `Auth configuration: google_provider=${config.googleAuthEnabled ? "enabled" : "disabled"}`,
    );
  });
};

const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Shutting down POS API...`);

  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  Promise.resolve()
    .then(() => closeSocket())
    .then(
      () =>
        new Promise((resolve) => {
          server.close((error) => resolve(error));
        }),
    )
    .then(async (error) => {
      if (error) {
        console.error("HTTP server close failed:", error);
        process.exitCode = 1;
      }
      await prisma.$disconnect();
      clearTimeout(forceExit);
      process.exit(process.exitCode || 0);
    })
    .catch((shutdownError) => {
      console.error("Graceful shutdown failed:", shutdownError);
      clearTimeout(forceExit);
      process.exit(1);
    });
};

if (require.main === module) {
  start().catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
  });

  // ── Process-level crash guards ─────────────────────────────────────────
  // Without these, an unhandled promise rejection silently kills the server
  // in production. PM2 / Docker will restart, but we want a clear log first.
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason, promise) => {
    console.error("[unhandledRejection]", reason, "at promise:", promise);
    // Do NOT exit — let it be handled by the next request cycle.
    // If it's truly fatal, the server will 500 on the next request
    // and the global error handler will log it with a requestId.
  });

  process.on("uncaughtException", (error) => {
    console.error("[uncaughtException]", error);
    // For true uncaught exceptions we must exit — the process is in an
    // undefined state. PM2 / systemd will restart within seconds.
    process.exit(1);
  });
}

module.exports = { app, server, start };
