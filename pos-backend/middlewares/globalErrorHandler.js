const config = require("../config/config");

const globalErrorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";

  if (err.code === "P2002") {
    statusCode = 409;
    message = `A record with that ${err.meta?.target?.join(", ") || "value"} already exists`;
  } else if (err.code === "P2025") {
    statusCode = 404;
    message = "Record not found";
  } else if (err.code?.startsWith?.("P")) {
    statusCode = 400;
    message = "Database operation could not be completed";
  }

  const body = {
    success: false,
    message,
    requestId: req?.requestId,    // Always include — safe to expose, helps support
    code: err.code || undefined,
    feature: err.feature || undefined,
    resource: err.resource || undefined,
    currentPlan: err.currentPlan || undefined,
  };

  // Stack traces only in development — never in production
  if (config.nodeEnv === "development") {
    body.errorStack = err.stack;
  }

  // Log 5xx in production for observability
  if (statusCode >= 500 && config.nodeEnv === "production") {
    console.error(`[${req?.requestId}] ${err.stack}`);
  }

  res.status(statusCode).json(body);
};

module.exports = globalErrorHandler;
