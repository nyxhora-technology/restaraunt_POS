const express = require("express");
const { z } = require("zod");
const controller = require("../controllers/taxGroupController");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { validate } = require("../middlewares/validate");

const router = express.Router();

// All tax group endpoints require a valid restaurant tenant
router.use(requireTenant);

// All roles can read tax groups (needed for billing screen awareness)
router.get("/", requireRole("OWNER", "MANAGER", "CASHIER", "WAITER"), controller.listTaxGroups);

// State VAT presets — public within the tenant (used in UI dropdowns)
router.get("/state-presets", requireRole("OWNER", "MANAGER"), controller.listStatePresets);

// Only owners and managers can manage tax groups
const managers = requireRole("OWNER", "MANAGER");

const taxGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["GST", "VAT", "INCLUDED", "EXEMPT"]),
  cgst: z.coerce.number().min(0).max(50).default(0),
  sgst: z.coerce.number().min(0).max(50).default(0),
  igst: z.coerce.number().min(0).max(50).default(0),
  vatRate: z.coerce.number().min(0).max(200).default(0),
  stateName: z.string().trim().max(100).optional(),
  hsnSacCode: z.string().trim().max(20).optional(),
  isDefault: z.boolean().optional().default(false),
});

router.post("/", managers, validate(taxGroupSchema), controller.createTaxGroup);
router.put("/:id", managers, validate(taxGroupSchema.partial()), controller.updateTaxGroup);
router.delete("/:id", managers, controller.deleteTaxGroup);

// Seed default GST groups (idempotent — only adds missing ones)
router.post("/seed-defaults", managers, controller.seedDefaults);

module.exports = router;
