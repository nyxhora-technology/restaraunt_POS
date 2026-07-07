const express = require("express");
const { z } = require("zod");
const controller = require("../controllers/exportController");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { requireFeature } = require("../middlewares/requireFeature");
const { validate } = require("../middlewares/validate");

const router = express.Router();
const managers = requireRole("OWNER", "MANAGER");
const exportFeature = requireFeature("EXPORT");

router.use(requireTenant, managers, exportFeature);
router.get(
  "/orders",
  validate(z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }), "query"),
  controller.exportOrders,
);
router.get("/inventory", controller.exportInventory);

module.exports = router;
