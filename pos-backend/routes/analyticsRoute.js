const express = require("express");
const { z } = require("zod");
const controller = require("../controllers/analyticsController");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { requireFeature } = require("../middlewares/requireFeature");
const { validate } = require("../middlewares/validate");

const router = express.Router();
router.use(
  requireTenant,
  requireRole("OWNER", "MANAGER"),
  requireFeature("ANALYTICS_EXTENDED"),
);
router.get(
  "/",
  validate(z.object({ days: z.coerce.number().int().refine((value) => [7, 30, 90].includes(value)).default(30) }), "query"),
  controller.analytics,
);

module.exports = router;
