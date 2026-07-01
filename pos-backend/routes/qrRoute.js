const express = require("express");
const { z } = require("zod");
const controller = require("../controllers/qrController");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { requireFeature } = require("../middlewares/requireFeature");
const { validate } = require("../middlewares/validate");

const router = express.Router();
const managers = requireRole("OWNER", "MANAGER");
const qrFeature = requireFeature("QR_MENU");

// ─── Public route (no auth) ───────────────────────────────────────────────────
router.get("/public/:slug", controller.getPublicMenu);

// ─── Authenticated routes ─────────────────────────────────────────────────────
router.use(requireTenant, qrFeature, managers);

router.get("/", controller.listQrCodes);

router.post(
  "/",
  validate(
    z.object({
      label: z.string().trim().min(1).max(60),
      tableId: z.string().optional().nullable(),
    })
  ),
  controller.createQrCode
);

router.patch(
  "/:id",
  validate(
    z.object({
      label: z.string().trim().min(1).max(60).optional(),
      enabled: z.boolean().optional(),
    })
  ),
  controller.updateQrCode
);

router.delete("/:id", controller.deleteQrCode);

module.exports = router;
