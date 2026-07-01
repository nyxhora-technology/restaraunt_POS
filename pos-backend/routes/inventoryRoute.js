const express = require("express");
const { z } = require("zod");
const controller = require("../controllers/inventoryController");
const supplierController = require("../controllers/supplierController");
const purchaseOrderController = require("../controllers/purchaseOrderController");
const stockCountController = require("../controllers/stockCountController");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { validate } = require("../middlewares/validate");
const { requireFeature } = require("../middlewares/requireFeature");

const router = express.Router();
const managers = requireRole("OWNER", "MANAGER");
const inventoryFeature = requireFeature("INVENTORY");

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(20),
  currentStock: z.coerce.number().min(0),
  totalStock: z.coerce.number().min(0).optional(),
  alertThreshold: z.coerce.number().min(0).max(100).optional(),
  alertEnabled: z.boolean().optional(),
  menuItemId: z.string().optional().nullable(),
  variantLabel: z.string().optional().nullable(),
  costPerUnit: z.coerce.number().min(0).optional().nullable(),
  supplier: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  expiryDate: z.string().datetime({ offset: true }).optional().nullable(),
  reorderPoint: z.coerce.number().min(0).optional().nullable(),
  reorderQuantity: z.coerce.number().min(0).optional().nullable(),
  location: z.string().trim().max(100).optional().nullable(),
});

const restockSchema = z.object({
  quantity: z.coerce.number().positive(),
  note: z.string().optional(),
});

const adjustSchema = z.object({
  quantity: z.coerce.number(),
  type: z.enum(["ADJUSTMENT", "WASTE"]),
  note: z.string().optional(),
});

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(120),
  contactName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  leadTimeDays: z.coerce.number().min(0).max(365).optional(),
});

const poItemSchema = z.object({
  inventoryItemId: z.string().optional().nullable(),
  itemName: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(20),
  costPerUnit: z.coerce.number().min(0).optional(),
});

const purchaseOrderSchema = z.object({
  supplierId: z.string().optional().nullable(),
  expectedDelivery: z.string().datetime({ offset: true }).optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(poItemSchema).min(1),
});

const receiveSchema = z.object({
  receivedItems: z.array(z.object({
    purchaseOrderItemId: z.string(),
    receivedQuantity: z.coerce.number().min(0),
  })).min(1),
});

const stockCountUpdatesSchema = z.object({
  updates: z.array(z.object({
    stockCountItemId: z.string(),
    actualStock: z.coerce.number().min(0),
    note: z.string().optional().nullable(),
  })).min(1),
});

// ── Apply auth + feature gate to all routes below ────────────────────────────
router.use(requireTenant, inventoryFeature);

// ── Inventory Items ──────────────────────────────────────────────────────────
router.get("/", managers, controller.listItems);
router.post("/", managers, validate(itemSchema), controller.createItem);
router.patch("/:id", managers, validate(itemSchema.partial()), controller.updateItem);
router.delete("/:id", managers, controller.deleteItem);

// ── Stock Operations ─────────────────────────────────────────────────────────
router.post("/:id/restock", managers, validate(restockSchema), controller.restock);
router.post("/:id/adjust", managers, validate(adjustSchema), controller.adjust);

// ── Alerts ───────────────────────────────────────────────────────────────────
router.get("/alerts", managers, controller.listAlerts);
router.patch("/alerts/read-all", managers, controller.markAllAlertsRead);
router.patch("/alerts/:id/read", managers, controller.markAlertRead);

// ── Logs ─────────────────────────────────────────────────────────────────────
router.get("/logs", managers, controller.getLogs);

// ── Analytics ────────────────────────────────────────────────────────────────
router.get("/analytics", managers, controller.getAnalytics);

// ── Suppliers ────────────────────────────────────────────────────────────────
router.get("/suppliers", managers, supplierController.listSuppliers);
router.post("/suppliers", managers, validate(supplierSchema), supplierController.createSupplier);
router.patch("/suppliers/:id", managers, validate(supplierSchema.partial()), supplierController.updateSupplier);
router.delete("/suppliers/:id", managers, supplierController.deleteSupplier);

// ── Purchase Orders ──────────────────────────────────────────────────────────
router.get("/purchase-orders", managers, purchaseOrderController.listPurchaseOrders);
router.post("/purchase-orders", managers, validate(purchaseOrderSchema), purchaseOrderController.createPurchaseOrder);
router.patch("/purchase-orders/:id", managers, validate(purchaseOrderSchema.partial()), purchaseOrderController.updatePurchaseOrder);
router.post("/purchase-orders/:id/order", managers, purchaseOrderController.markOrdered);
router.post("/purchase-orders/:id/receive", managers, validate(receiveSchema), purchaseOrderController.receivePurchaseOrder);
router.delete("/purchase-orders/:id", managers, purchaseOrderController.cancelPurchaseOrder);

// ── Stock Counts ─────────────────────────────────────────────────────────────
router.get("/stock-counts", managers, stockCountController.listStockCounts);
router.post("/stock-counts", managers, stockCountController.startStockCount);
router.get("/stock-counts/:id", managers, stockCountController.getStockCount);
router.patch("/stock-counts/:id/items", managers, validate(stockCountUpdatesSchema), stockCountController.updateCountItems);
router.post("/stock-counts/:id/complete", managers, stockCountController.completeStockCount);
router.delete("/stock-counts/:id", managers, stockCountController.cancelStockCount);

module.exports = router;
