const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { toNodeHandler } = require("better-auth/node");
const config = require("./config/config");
const auth = require("./config/auth");
const prisma = require("./config/prisma");
const globalErrorHandler = require("./middlewares/globalErrorHandler");
const { initSocket } = require("./config/socket");
const { webHookVerification } = require("./controllers/paymentController");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin: config.frontendUrl,
  }),
);
app.use(cookieParser());

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.all("/api/auth/*", toNodeHandler(auth));

app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json", limit: "256kb" }),
  webHookVerification,
);

app.use(express.json({ limit: "256kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use("/api", (req, res, next) => {
  req.requestStartedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - req.requestStartedAt;
    if (config.nodeEnv !== "production" && durationMs >= 500) {
      console.warn(
        `Slow API request: ${req.method} ${req.originalUrl} ${durationMs}ms`,
      );
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

app.use("/api/admin", require("./routes/adminRoute"));
app.use("/api/restaurant", require("./routes/restaurantRoute"));
app.use("/api/menu", require("./routes/menuRoute"));
app.use("/api/order", require("./routes/orderRoute"));
app.use("/api/table", require("./routes/tableRoute"));
app.use("/api/payment", require("./routes/paymentRoute"));
app.use("/api/inventory", require("./routes/inventoryRoute"));
app.use("/api/qr", require("./routes/qrRoute"));

app.use((_req, _res, next) => {
  next(Object.assign(new Error("Route not found"), { statusCode: 404 }));
});
app.use(globalErrorHandler);

const server = http.createServer(app);
initSocket(server);

const start = async () => {
  await prisma.$connect();
  server.listen(config.port, () => {
    console.log(`POS API listening on ${config.backendUrl}`);
  });
};

if (require.main === module) {
  start().catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
  });
}

module.exports = { app, server, start };
