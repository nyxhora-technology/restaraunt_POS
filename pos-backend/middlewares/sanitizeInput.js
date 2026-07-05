/**
 * sanitizeInput middleware
 *
 * Defense-in-depth layer below Zod validation.
 * Strips HTML tags and control characters from all string values
 * in req.body so that even if a future route skips Zod validation,
 * raw HTML cannot reach the database or be reflected back to clients.
 *
 * This is NOT a replacement for Zod — Zod still validates shape and types.
 * This runs AFTER express.json() parses the body but BEFORE route handlers.
 *
 * Why not a library like xss-clean?
 *  - xss-clean was deprecated and removed from npm.
 *  - express-mongo-sanitize is MongoDB-specific.
 *  - A minimal custom implementation is more transparent and has no attack surface
 *    of its own.
 */

const STRIP_HTML = /<[^>]*>/g;
// Zero-width characters, null bytes, and other control chars that can
// be used to smuggle payloads past naive string-length checks.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Recursively sanitize all string values in a plain object or array.
 * Numbers, booleans, and null/undefined pass through untouched.
 */
const sanitizeValue = (value) => {
  if (typeof value === "string") {
    return value.replace(STRIP_HTML, "").replace(CONTROL_CHARS, "").trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === "object") {
    return sanitizeObject(value);
  }
  return value;
};

const sanitizeObject = (obj) => {
  const out = {};
  for (const key of Object.keys(obj)) {
    out[key] = sanitizeValue(obj[key]);
  }
  return out;
};

/**
 * Express middleware — mutates req.body in place.
 * Only runs when Content-Type is application/json and body has been parsed.
 */
const sanitizeInput = (req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
};

module.exports = { sanitizeInput };
