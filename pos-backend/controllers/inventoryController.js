const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { writeAudit } = require("../utils/audit");
const { getIo } = require("../config/socket");

const emitInventory = (restaurantId) => {
  getIo().to(`restaurant:${restaurantId}`).emit("inventory:updated");
};

const checkAndFireAlerts = async (item, restaurantId) => {
  if (!item.alertEnabled || item.totalStock <= 0) return;
  const pct = (item.currentStock / item.totalStock) * 100;

  let level = null;
  if (pct <= item.alertThreshold / 2) level = "CRITICAL";
  else if (pct <= item.alertThreshold) level = "WARNING";

  if (!level) return;

  const message =
    level === "CRITICAL"
      ? `🔴 ${item.name} is critically low — only ${item.currentStock.toFixed(1)} ${item.unit} left (${pct.toFixed(0)}%)`
      : `🟡 ${item.name} is running low — ${item.currentStock.toFixed(1)} ${item.unit} remaining (${pct.toFixed(0)}%)`;

  const alert = await prisma.inventoryAlert.create({
    data: { inventoryItemId: item.id, restaurantId, message, level },
  });

  getIo().to(`restaurant:${restaurantId}`).emit("inventory:alert", {
    id: alert.id,
    message,
    level,
    itemName: item.name,
    createdAt: alert.createdAt,
  });
};

const checkExpiryAlerts = async (item, restaurantId) => {
  if (!item.expiryDate) return;
  const now = new Date();
  const daysUntilExpiry = Math.ceil((new Date(item.expiryDate) - now) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry > 7) return; // Only alert within 7 days

  const message =
    daysUntilExpiry <= 0
      ? `🔴 ${item.name} has EXPIRED`
      : `🟠 ${item.name} expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`;

  const alert = await prisma.inventoryAlert.create({
    data: { inventoryItemId: item.id, restaurantId, message, level: "EXPIRY" },
  });

  getIo().to(`restaurant:${restaurantId}`).emit("inventory:alert", {
    id: alert.id,
    message,
    level: "EXPIRY",
    itemName: item.name,
    createdAt: alert.createdAt,
  });
};

const listItems = async (req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { name: "asc" },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            category: { select: { id: true, name: true } },
          },
        },
        supplierRef: { select: { id: true, name: true } },
      },
    });
    const enriched = items.map((item) => ({
      ...item,
      stockPercent: item.totalStock > 0 ? Math.round((item.currentStock / item.totalStock) * 100) : 0,
      needsReorder: item.reorderPoint != null && item.currentStock <= item.reorderPoint,
      isExpired: item.expiryDate ? new Date(item.expiryDate) < new Date() : false,
      daysUntilExpiry: item.expiryDate
        ? Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
        : null,
    }));
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

const createItem = async (req, res, next) => {
  try {
    const {
      name, unit, currentStock, totalStock, alertThreshold, alertEnabled,
      menuItemId, variantLabel, costPerUnit, supplier, supplierId,
      expiryDate, reorderPoint, reorderQuantity, location,
    } = req.body;
    const item = await prisma.inventoryItem.create({
      data: {
        restaurantId: req.restaurantId,
        name,
        unit,
        currentStock: Number(currentStock),
        totalStock: Number(totalStock || currentStock),
        alertThreshold: alertThreshold != null ? Number(alertThreshold) : 30,
        alertEnabled: alertEnabled ?? true,
        menuItemId: menuItemId || null,
        variantLabel: variantLabel || null,
        costPerUnit: costPerUnit != null ? Number(costPerUnit) : null,
        supplier: supplier || null,
        supplierId: supplierId || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        reorderPoint: reorderPoint != null ? Number(reorderPoint) : null,
        reorderQuantity: reorderQuantity != null ? Number(reorderQuantity) : null,
        location: location || null,
        lastRestockedAt: new Date(),
      },
    });
    await prisma.inventoryLog.create({
      data: { inventoryItemId: item.id, type: "RESTOCK", quantity: item.currentStock, stockAfter: item.currentStock, note: "Initial stock" },
    });
    await checkExpiryAlerts(item, req.restaurantId);
    await writeAudit(req, "INVENTORY_ITEM_CREATED", "InventoryItem", item.id);
    emitInventory(req.restaurantId);
    res.status(201).json({ success: true, data: item });
  } catch (error) { next(error); }
};

const updateItem = async (req, res, next) => {
  try {
    const existing = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, restaurantId: req.restaurantId } });
    if (!existing) throw createHttpError(404, "Inventory item not found");
    const {
      name, unit, alertThreshold, alertEnabled, menuItemId, variantLabel,
      costPerUnit, supplier, supplierId, expiryDate, reorderPoint, reorderQuantity, location,
    } = req.body;
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        name: name ?? existing.name,
        unit: unit ?? existing.unit,
        alertThreshold: alertThreshold != null ? Number(alertThreshold) : existing.alertThreshold,
        alertEnabled: alertEnabled ?? existing.alertEnabled,
        menuItemId: menuItemId !== undefined ? menuItemId || null : existing.menuItemId,
        variantLabel: variantLabel !== undefined ? variantLabel || null : existing.variantLabel,
        costPerUnit: costPerUnit != null ? Number(costPerUnit) : existing.costPerUnit,
        supplier: supplier !== undefined ? supplier || null : existing.supplier,
        supplierId: supplierId !== undefined ? supplierId || null : existing.supplierId,
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : existing.expiryDate,
        reorderPoint: reorderPoint !== undefined ? (reorderPoint != null ? Number(reorderPoint) : null) : existing.reorderPoint,
        reorderQuantity: reorderQuantity !== undefined ? (reorderQuantity != null ? Number(reorderQuantity) : null) : existing.reorderQuantity,
        location: location !== undefined ? location || null : existing.location,
      },
    });
    await checkExpiryAlerts(item, req.restaurantId);
    await writeAudit(req, "INVENTORY_ITEM_UPDATED", "InventoryItem", item.id, req.body);
    emitInventory(req.restaurantId);
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
};

const deleteItem = async (req, res, next) => {
  try {
    const existing = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, restaurantId: req.restaurantId } });
    if (!existing) throw createHttpError(404, "Inventory item not found");
    await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    await writeAudit(req, "INVENTORY_ITEM_DELETED", "InventoryItem", req.params.id);
    emitInventory(req.restaurantId);
    res.json({ success: true });
  } catch (error) { next(error); }
};

const restock = async (req, res, next) => {
  try {
    const { quantity, note } = req.body;
    const qty = Number(quantity);
    if (!qty || qty <= 0) throw createHttpError(400, "Quantity must be positive");
    const existing = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, restaurantId: req.restaurantId } });
    if (!existing) throw createHttpError(404, "Inventory item not found");
    const newStock = existing.currentStock + qty;
    const newTotal = existing.totalStock + qty;
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: { currentStock: newStock, totalStock: newTotal, lastRestockedAt: new Date() },
    });
    await prisma.inventoryLog.create({
      data: { inventoryItemId: item.id, type: "RESTOCK", quantity: qty, stockAfter: newStock, note: note || null },
    });
    await writeAudit(req, "INVENTORY_RESTOCKED", "InventoryItem", item.id, { quantity: qty });
    emitInventory(req.restaurantId);
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
};

const adjust = async (req, res, next) => {
  try {
    const { quantity, type, note } = req.body;
    const qty = Number(quantity);
    if (!["ADJUSTMENT", "WASTE"].includes(type)) throw createHttpError(400, "Invalid adjustment type");
    const existing = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, restaurantId: req.restaurantId } });
    if (!existing) throw createHttpError(404, "Inventory item not found");
    const newStock = Math.max(0, existing.currentStock + qty);
    const item = await prisma.inventoryItem.update({ where: { id: req.params.id }, data: { currentStock: newStock } });
    await prisma.inventoryLog.create({
      data: { inventoryItemId: item.id, type, quantity: qty, stockAfter: newStock, note: note || null },
    });
    await checkAndFireAlerts(item, req.restaurantId);
    emitInventory(req.restaurantId);
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
};

const processOrderConsumption = async (restaurantId, orderId, items) => {
  if (!items || !items.length) return;
  for (const orderItem of items) {
    const where = { restaurantId, menuItemId: orderItem.menuItemId };
    if (orderItem.variantLabel) where.variantLabel = orderItem.variantLabel;
    const invItem = await prisma.inventoryItem.findFirst({ where });
    if (!invItem) continue;
    const deduct = Number(orderItem.quantity);
    const newStock = Math.max(0, invItem.currentStock - deduct);
    const updated = await prisma.inventoryItem.update({ where: { id: invItem.id }, data: { currentStock: newStock } });
    await prisma.inventoryLog.create({
      data: { inventoryItemId: invItem.id, type: "SALE", quantity: -deduct, stockAfter: newStock, orderId: orderId || null, note: "Order deduction" },
    });
    await checkAndFireAlerts(updated, restaurantId);
  }
  emitInventory(restaurantId);
};

/**
 * ARCH-1: Re-credit inventory when a SERVED order is later CANCELLED.
 * Mirrors processOrderConsumption but adds stock back.
 */
const reverseOrderConsumption = async (restaurantId, orderId, items) => {
  if (!items || !items.length) return;
  for (const orderItem of items) {
    const where = { restaurantId, menuItemId: orderItem.menuItemId };
    if (orderItem.variantLabel) where.variantLabel = orderItem.variantLabel;
    const invItem = await prisma.inventoryItem.findFirst({ where });
    if (!invItem) continue;
    const credit = Number(orderItem.quantity);
    const newStock = invItem.currentStock + credit;
    const updated = await prisma.inventoryItem.update({
      where: { id: invItem.id },
      data: { currentStock: newStock },
    });
    await prisma.inventoryLog.create({
      data: {
        inventoryItemId: invItem.id,
        type: "ADJUSTMENT",
        quantity: credit,
        stockAfter: newStock,
        orderId: orderId || null,
        note: "Reversal — order cancelled after serving",
      },
    });
    // Re-check alerts (stock went up, so unlikely to fire, but keeps logic consistent)
    await checkAndFireAlerts(updated, restaurantId);
  }
  emitInventory(restaurantId);
};

const consume = async (req, res, next) => {
  try {
    const { restaurantId, orderId, items } = req.body;
    await processOrderConsumption(restaurantId, orderId, items);
    res.json({ success: true });
  } catch (error) { next(error); }
};

const listAlerts = async (req, res, next) => {
  try {
    const alerts = await prisma.inventoryAlert.findMany({
      where: { restaurantId: req.restaurantId },
      include: { inventoryItem: { select: { name: true, unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = alerts.filter((a) => !a.isRead).length;
    res.json({ success: true, data: alerts, unreadCount });
  } catch (error) { next(error); }
};

const markAlertRead = async (req, res, next) => {
  try {
    await prisma.inventoryAlert.updateMany({ where: { id: req.params.id, restaurantId: req.restaurantId }, data: { isRead: true } });
    res.json({ success: true });
  } catch (error) { next(error); }
};

const markAllAlertsRead = async (req, res, next) => {
  try {
    await prisma.inventoryAlert.updateMany({ where: { restaurantId: req.restaurantId, isRead: false }, data: { isRead: true } });
    res.json({ success: true });
  } catch (error) { next(error); }
};

const getLogs = async (req, res, next) => {
  try {
    const { itemId, type, limit = 100 } = req.query;
    const where = { inventoryItem: { restaurantId: req.restaurantId } };
    if (itemId) where.inventoryItemId = itemId;
    if (type) where.type = type;
    const logs = await prisma.inventoryLog.findMany({
      where,
      include: { inventoryItem: { select: { name: true, unit: true } } },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
    });
    res.json({ success: true, data: logs });
  } catch (error) { next(error); }
};

const getAnalytics = async (req, res, next) => {
  try {
    const { period = "30" } = req.query;
    const days = Number(period);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId: req.restaurantId },
    });

    // Total inventory value
    const totalValue = items.reduce((sum, i) => {
      return sum + (i.currentStock * (i.costPerUnit || 0));
    }, 0);

    // Waste logs in period
    const wasteLogs = await prisma.inventoryLog.findMany({
      where: {
        type: "WASTE",
        createdAt: { gte: since },
        inventoryItem: { restaurantId: req.restaurantId },
      },
      include: { inventoryItem: { select: { name: true, costPerUnit: true } } },
    });

    const wasteValue = wasteLogs.reduce((sum, log) => {
      return sum + Math.abs(log.quantity) * (log.inventoryItem.costPerUnit || 0);
    }, 0);

    // Top waste items
    const wasteByItem = {};
    for (const log of wasteLogs) {
      const key = log.inventoryItem.name;
      if (!wasteByItem[key]) wasteByItem[key] = { name: key, quantity: 0, value: 0 };
      wasteByItem[key].quantity += Math.abs(log.quantity);
      wasteByItem[key].value += Math.abs(log.quantity) * (log.inventoryItem.costPerUnit || 0);
    }
    const topWasteItems = Object.values(wasteByItem)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Low stock / needs reorder
    const lowStockItems = items.filter((i) => i.reorderPoint != null && i.currentStock <= i.reorderPoint);

    // Expiring within 7 days
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiringItems = items
      .filter((i) => i.expiryDate && new Date(i.expiryDate) <= sevenDaysFromNow)
      .map((i) => ({
        ...i,
        daysUntilExpiry: Math.ceil((new Date(i.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    // Sales deduction value in period
    const saleLogs = await prisma.inventoryLog.findMany({
      where: {
        type: "SALE",
        createdAt: { gte: since },
        inventoryItem: { restaurantId: req.restaurantId },
      },
      include: { inventoryItem: { select: { costPerUnit: true } } },
    });
    const salesValue = saleLogs.reduce((sum, log) => {
      return sum + Math.abs(log.quantity) * (log.inventoryItem.costPerUnit || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        totalValue,
        wasteValue,
        salesValue,
        topWasteItems,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 10),
        expiringCount: expiringItems.length,
        expiringItems: expiringItems.slice(0, 10),
        totalItems: items.length,
        outOfStockCount: items.filter((i) => i.currentStock <= 0).length,
        period: days,
      },
    });
  } catch (error) { next(error); }
};

module.exports = { processOrderConsumption, reverseOrderConsumption, listItems, createItem, updateItem, deleteItem, restock, adjust, consume, listAlerts, markAlertRead, markAllAlertsRead, getLogs, getAnalytics };
