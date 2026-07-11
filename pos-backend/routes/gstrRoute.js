const express = require("express");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { getGstrSummary, downloadGstrJson, downloadGstrCsv } = require("../controllers/gstrController");

const router = express.Router();

// All GSTR routes require a valid restaurant tenant
router.use(requireTenant);

// Only Owner + Manager can access financial exports
router.use(requireRole("OWNER", "MANAGER"));

/**
 * GET /api/analytics/gstr?month=YYYY-MM
 * Monthly GST summary for the UI Analytics tab.
 */
router.get("/", getGstrSummary);

/**
 * GET /api/analytics/gstr/json?month=YYYY-MM
 * Downloads a GSTN-compatible GSTR-1 JSON file.
 */
router.get("/json", downloadGstrJson);

/**
 * GET /api/analytics/gstr/csv?month=YYYY-MM
 * Downloads a CSV for the CA / accountant.
 */
router.get("/csv", downloadGstrCsv);

module.exports = router;
