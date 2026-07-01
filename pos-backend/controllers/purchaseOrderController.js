const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { writeAudit } = require("../utils/audit");
const { getIo } = require("../config/socket");

const emitInventory = (restaurantId) => {
  getIo().to(`restaurant:${restaurantId}`).emit("inventory:updated");
};

// ── List all POs ────────────────────────────────────────────────────────────
const listPurchaseOrders = async (req, res, next) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
        },
      },
    });
    res.json({ success: true, data: orders });
  } catch (error) { next(error); }
};

// ── Create draft PO ─────────────────────────────────────────────────────────
const createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplierId, expectedDelivery, notes, items } = req.body;

    // Validate items
    if (!items || items.length === 0) throw createHttpError(400, "At least one item is required");

    // Calculate total cost
    const totalCost = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.costPerUnit || 0), 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        restaurantId: req.restaurantId,
        supplierId: supplierId || null,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        notes: notes || null,
        totalCost,
        status: "DRAFT",
        items: {
          create: items.map((item) => ({
            inventoryItemId: item.inventoryItemId || null,
            itemName: item.itemName,
            quantity: Number(item.quantity),
            unit: item.unit,
            costPerUnit: Number(item.costPerUnit || 0),
            receivedQuantity: 0,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
      },
    });

    await writeAudit(req, "PURCHASE_ORDER_CREATED", "PurchaseOrder", po.id);
    res.status(201).json({ success: true, data: po });
  } catch (error) { next(error); }
};

// ── Update PO (edit items/notes while DRAFT) ────────────────────────────────
const updatePurchaseOrder = async (req, res, next) => {
  try {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "Purchase order not found");
    if (!["DRAFT"].includes(existing.status)) {
      throw createHttpError(400, "Only DRAFT orders can be edited");
    }

    const { supplierId, expectedDelivery, notes, items } = req.body;
    const totalCost = items
      ? items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.costPerUnit || 0), 0)
      : existing.totalCost;

    const po = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        supplierId: supplierId !== undefined ? (supplierId || null) : existing.supplierId,
        expectedDelivery: expectedDelivery !== undefined ? (expectedDelivery ? new Date(expectedDelivery) : null) : existing.expectedDelivery,
        notes: notes !== undefined ? (notes || null) : existing.notes,
        totalCost,
        ...(items && {
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              inventoryItemId: item.inventoryItemId || null,
              itemName: item.itemName,
              quantity: Number(item.quantity),
              unit: item.unit,
              costPerUnit: Number(item.costPerUnit || 0),
              receivedQuantity: 0,
            })),
          },
        }),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } },
      },
    });

    await writeAudit(req, "PURCHASE_ORDER_UPDATED", "PurchaseOrder", po.id, req.body);
    res.json({ success: true, data: po });
  } catch (error) { next(error); }
};

// ── Mark as ORDERED ─────────────────────────────────────────────────────────
const markOrdered = async (req, res, next) => {
  try {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "Purchase order not found");
    if (existing.status !== "DRAFT") throw createHttpError(400, "Only DRAFT orders can be marked as ordered");

    const po = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: "ORDERED" },
    });

    await writeAudit(req, "PURCHASE_ORDER_ORDERED", "PurchaseOrder", po.id);
    res.json({ success: true, data: po });
  } catch (error) { next(error); }
};

// ── Receive Delivery (auto-restocks inventory) ───────────────────────────────
const receivePurchaseOrder = async (req, res, next) => {
  try {
    const { receivedItems } = req.body;
    // receivedItems: [{ purchaseOrderItemId, receivedQuantity }]

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
      include: { items: true },
    });
    if (!existing) throw createHttpError(404, "Purchase order not found");
    if (!["ORDERED", "PARTIAL"].includes(existing.status)) {
      throw createHttpError(400, "Only ORDERED or PARTIAL orders can be received");
    }

    // Update each item's receivedQuantity and restock inventory
    for (const received of receivedItems) {
      const poItem = existing.items.find((i) => i.id === received.purchaseOrderItemId);
      if (!poItem) continue;

      const receivedQty = Number(received.receivedQuantity);
      if (receivedQty <= 0) continue;

      // Update PO item
      await prisma.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: { receivedQuantity: receivedQty },
      });

      // Auto-restock linked inventory item
      if (poItem.inventoryItemId) {
        const invItem = await prisma.inventoryItem.findUnique({ where: { id: poItem.inventoryItemId } });
        if (invItem) {
          const newStock = invItem.currentStock + receivedQty;
          const newTotal = invItem.totalStock + receivedQty;
          await prisma.inventoryItem.update({
            where: { id: invItem.id },
            data: { currentStock: newStock, totalStock: newTotal, lastRestockedAt: new Date() },
          });
          await prisma.inventoryLog.create({
            data: {
              inventoryItemId: invItem.id,
              type: "PO_RECEIVE",
              quantity: receivedQty,
              stockAfter: newStock,
              note: `Received from PO #${existing.id.slice(-6).toUpperCase()}`,
            },
          });
        }
      }
    }

    // Determine new status
    const updatedItems = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: req.params.id } });
    const allReceived = updatedItems.every((i) => i.receivedQuantity >= i.quantity);
    const anyReceived = updatedItems.some((i) => i.receivedQuantity > 0);
    const newStatus = allReceived ? "DELIVERED" : anyReceived ? "PARTIAL" : existing.status;

    const po = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: newStatus, deliveredAt: allReceived ? new Date() : null },
    });

    emitInventory(req.restaurantId);
    await writeAudit(req, "PURCHASE_ORDER_RECEIVED", "PurchaseOrder", po.id, { status: newStatus });
    res.json({ success: true, data: po });
  } catch (error) { next(error); }
};

// ── Cancel PO ────────────────────────────────────────────────────────────────
const cancelPurchaseOrder = async (req, res, next) => {
  try {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "Purchase order not found");
    if (existing.status === "DELIVERED") throw createHttpError(400, "Cannot cancel a delivered order");

    const po = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
    });
    await writeAudit(req, "PURCHASE_ORDER_CANCELLED", "PurchaseOrder", po.id);
    res.json({ success: true, data: po });
  } catch (error) { next(error); }
};

module.exports = {
  listPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  markOrdered,
  receivePurchaseOrder,
  cancelPurchaseOrder,
};
