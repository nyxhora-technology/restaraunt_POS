const config = require("../config/config");

const globalErrorHandler = (err, _req, res, _next) => {
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

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.nodeEnv === "development" && { errorStack: err.stack }),
  });
};

module.exports = globalErrorHandler;
