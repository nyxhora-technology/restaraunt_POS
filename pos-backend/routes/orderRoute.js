const express = require("express");
const { z } = require("zod");
const controller = require("../controllers/orderController");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { validate } = require("../middlewares/validate");
const { checkPlanLimit } = require("../middlewares/checkPlanLimit");

const router = express.Router();
const status = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "PREPARING",
  "READY",
  "SERVED",
  "COMPLETED",
  "CANCELLED",
]);
const orderItemInput = z.object({
  menuItemId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  quantity: z.coerce.number().int().min(1).max(100),
  note: z.string().trim().max(500).nullable().optional(),
});

router.use(requireTenant);
router.get(
  "/",
  requireRole("OWNER", "MANAGER", "CASHIER", "WAITER"),
  validate(
    z.object({
      status: status.optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
    "query",
  ),
  controller.getOrders,
);
router.get(
  "/kitchen",
  requireRole("OWNER", "MANAGER", "KITCHEN"),
  controller.getKitchenOrders,
);
router.get(
  "/dashboard",
  requireRole("OWNER", "MANAGER"),
  controller.getDashboard,
);
router.get(
  "/usage",
  requireRole("OWNER", "MANAGER"),
  controller.getOrderUsage,
);
router.post(
  "/",
  requireRole("OWNER", "MANAGER", "CASHIER", "WAITER"),
  checkPlanLimit("orders_per_month"),
  validate(
    z.object({
      orderType: z.enum(["DINE_IN", "TAKEAWAY"]).default("DINE_IN"),
      tableId: z.string().min(1).optional(),
      tableIds: z.array(z.string().min(1)).min(1).max(10).optional(),
      customerName: z.string().trim().min(1).max(100),
      customerPhone: z.string().trim().min(7).max(20),
      guests: z.coerce.number().int().min(1).max(100),
      kitchenNote: z.string().trim().max(1000).optional(),
      items: z
        .array(orderItemInput)
        .min(1)
        .max(100),
    }).superRefine((data, context) => {
      if (
        data.orderType === "DINE_IN" &&
        !data.tableId &&
        !data.tableIds?.length
      ) {
        context.addIssue({
          code: "custom",
          path: ["tableId"],
          message: "A table is required for dine-in orders",
        });
      }
      if (
        data.orderType === "TAKEAWAY" &&
        (data.tableId || data.tableIds?.length)
      ) {
        context.addIssue({
          code: "custom",
          path: ["tableId"],
          message: "Takeaway orders cannot have a table",
        });
      }
    }),
  ),
  controller.addOrder,
);
router.put(
  "/:id/items",
  requireRole("OWNER", "MANAGER", "CASHIER", "WAITER"),
  validate(
    z.object({
      items: z
        .array(orderItemInput)
        .min(1)
        .max(100),
    })
  ),
  controller.updateOrderItems,
);

router.put(
  "/:id/status",
  requireRole("OWNER", "MANAGER", "KITCHEN", "CASHIER", "WAITER"),
  validate(
    z.object({
      orderStatus: status,
      kitchenNote: z.string().trim().max(1000).optional(),
    }),
  ),
  controller.updateOrderStatus,
);
router.get(
  "/:id",
  requireRole("OWNER", "MANAGER", "CASHIER", "WAITER"),
  controller.getOrderById,
);

module.exports = router;
