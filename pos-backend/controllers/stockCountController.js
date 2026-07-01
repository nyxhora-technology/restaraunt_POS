const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { writeAudit } = require("../utils/audit");
const { getIo } = require("../config/socket");

const emitInventory = (restaurantId) => {
  getIo().to(`restaurant:${restaurantId}`).emit("inventory:updated");
};

// ── Start a new stock count ─────────────────────────────────────────────────
const startStockCount = async (req, res, next) => {
  try {
    // Check no IN_PROGRESS count already
    const existing = await prisma.stockCount.findFirst({
      where: { restaurantId: req.restaurantId, status: "IN_PROGRESS" },
    });
    if (existing) throw createHttpError(400, "An in-progress stock count already exists. Complete or cancel it first.");

    const { notes } = req.body;

    // Snapshot all current inventory items
    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { name: "asc" },
    });

    if (items.length === 0) throw createHttpError(400, "No inventory items to count");

    const count = await prisma.stockCount.create({
      data: {
        restaurantId: req.restaurantId,
        notes: notes || null,
        status: "IN_PROGRESS",
        items: {
          create: items.map((item) => ({
            inventoryItemId: item.id,
            expectedStock: item.currentStock,
            actualStock: null,
            variance: null,
          })),
        },
      },
      include: {
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true, currentStock: true, location: true } },
          },
        },
      },
    });

    await writeAudit(req, "STOCK_COUNT_STARTED", "StockCount", count.id);
    res.status(201).json({ success: true, data: count });
  } catch (error) { next(error); }
};

// ── List stock counts ───────────────────────────────────────────────────────
const listStockCounts = async (req, res, next) => {
  try {
    const counts = await prisma.stockCount.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { items: true } },
      },
    });
    res.json({ success: true, data: counts });
  } catch (error) { next(error); }
};

// ── Get single stock count with all items ───────────────────────────────────
const getStockCount = async (req, res, next) => {
  try {
    const count = await prisma.stockCount.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
      include: {
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true, currentStock: true, location: true } },
          },
          orderBy: { inventoryItem: { name: "asc" } },
        },
      },
    });
    if (!count) throw createHttpError(404, "Stock count not found");
    res.json({ success: true, data: count });
  } catch (error) { next(error); }
};

// ── Update actual counts per item ───────────────────────────────────────────
const updateCountItems = async (req, res, next) => {
  try {
    const { updates } = req.body;
    // updates: [{ stockCountItemId, actualStock, note }]

    const count = await prisma.stockCount.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!count) throw createHttpError(404, "Stock count not found");
    if (count.status !== "IN_PROGRESS") throw createHttpError(400, "Can only update items on an in-progress count");

    for (const update of updates) {
      const actual = Number(update.actualStock);
      const item = await prisma.stockCountItem.findFirst({
        where: { id: update.stockCountItemId, stockCountId: req.params.id },
      });
      if (!item) continue;

      const variance = actual - item.expectedStock;
      await prisma.stockCountItem.update({
        where: { id: update.stockCountItemId },
        data: {
          actualStock: actual,
          variance,
          note: update.note || null,
        },
      });
    }

    res.json({ success: true });
  } catch (error) { next(error); }
};

// ── Complete stock count → auto-adjust all variances ────────────────────────
const completeStockCount = async (req, res, next) => {
  try {
    const count = await prisma.stockCount.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
      include: { items: true },
    });
    if (!count) throw createHttpError(404, "Stock count not found");
    if (count.status !== "IN_PROGRESS") throw createHttpError(400, "Stock count is not in progress");

    // Must have at least some items entered
    const entered = count.items.filter((i) => i.actualStock !== null);
    if (entered.length === 0) throw createHttpError(400, "No items have been counted yet");

    // Adjust each entered item
    for (const item of entered) {
      if (item.actualStock === null) continue;
      const actual = item.actualStock;
      const variance = actual - item.expectedStock;
      if (Math.abs(variance) < 0.001) continue; // no change needed

      const invItem = await prisma.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
      if (!invItem) continue;

      await prisma.inventoryItem.update({
        where: { id: item.inventoryItemId },
        data: { currentStock: actual },
      });

      await prisma.inventoryLog.create({
        data: {
          inventoryItemId: item.inventoryItemId,
          type: "STOCK_COUNT",
          quantity: variance,
          stockAfter: actual,
          note: `Stock count reconciliation (variance: ${variance > 0 ? "+" : ""}${variance.toFixed(2)})`,
        },
      });
    }

    const completed = await prisma.stockCount.update({
      where: { id: req.params.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    emitInventory(req.restaurantId);
    await writeAudit(req, "STOCK_COUNT_COMPLETED", "StockCount", count.id, { itemsEntered: entered.length });
    res.json({ success: true, data: completed });
  } catch (error) { next(error); }
};

// ── Cancel stock count ───────────────────────────────────────────────────────
const cancelStockCount = async (req, res, next) => {
  try {
    const count = await prisma.stockCount.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!count) throw createHttpError(404, "Stock count not found");
    if (count.status !== "IN_PROGRESS") throw createHttpError(400, "Only in-progress counts can be cancelled");

    const updated = await prisma.stockCount.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
    });
    await writeAudit(req, "STOCK_COUNT_CANCELLED", "StockCount", count.id);
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

module.exports = {
  startStockCount,
  listStockCounts,
  getStockCount,
  updateCountItems,
  completeStockCount,
  cancelStockCount,
};
