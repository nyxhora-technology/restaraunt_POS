const createHttpError = require("http-errors");

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return next(createHttpError(401, "Unauthorized"));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(createHttpError(403, "Insufficient permissions"));
  }
  
  next();
};

module.exports = { requireRole };
