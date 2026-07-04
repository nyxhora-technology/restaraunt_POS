const express = require("express");
const { z } = require("zod");
const controller = require("../controllers/menuController");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { validate } = require("../middlewares/validate");
const { checkPlanLimit } = require("../middlewares/checkPlanLimit");

const router = express.Router();
const managers = requireRole("OWNER", "MANAGER");
const category = z.object({
  name: z.string().trim().min(1).max(80),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});
const variant = z.object({
  label: z.string().trim().min(1).max(80),
  price: z.coerce.number().min(0).max(1000000),
  available: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
});
// Base shape — no refinements so .partial() works for the PUT (edit) route
const menuItemBase = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  // price must be >0 when no variants; can be 0/omitted when variants carry their own prices
  price: z.coerce.number().min(0).max(1000000).optional().default(0),
  image: z.string().url().max(1000).optional(),
  available: z.boolean().optional(),
  isVeg: z.boolean().default(true),
  categoryId: z.string().min(1),
  variants: z.array(variant).max(50).optional(),
});

// Create schema adds the price-vs-variants cross-field check
const menuItemCreate = menuItemBase.superRefine((data, ctx) => {
  const hasVariants = data.variants && data.variants.length > 0;
  if (!hasVariants && (!data.price || data.price <= 0)) {
    ctx.addIssue({
      path: ["price"],
      code: z.ZodIssueCode.too_small,
      minimum: 0.01,
      type: "number",
      inclusive: false,
      message: "Base price is required when no variants are provided",
    });
  }
});

router.use(requireTenant);
router.get("/", controller.getMenu);
router.post("/category", managers, validate(category), controller.addCategory);
router.put("/category/:id", managers, validate(category.partial()), controller.updateCategory);
router.delete("/category/:id", managers, controller.deleteCategory);
router.post("/item", managers, checkPlanLimit("menu_items"), validate(menuItemCreate), controller.addMenuItem);
router.put("/item/:id", managers, validate(menuItemBase.partial()), controller.updateMenuItem);
router.patch(
  "/item/:id/toggle",
  managers,
  validate(z.object({ available: z.boolean() })),
  controller.toggleMenuItem,
);
router.delete("/item/:id", managers, controller.deleteMenuItem);

module.exports = router;
