const prisma = require("../config/prisma");

const csvCell = (value) =>
  `"${String(value ?? "").replaceAll('"', '""').replaceAll(/\r?\n/g, " ")}"`;

const sendCsv = (res, filename, rows) => {
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  });
  res.send(`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`);
};

const exportOrders = async (req, res, next) => {
  try {
    const where = { restaurantId: req.restaurantId };
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from);
      if (req.query.to) where.createdAt.lte = new Date(req.query.to);
    }
    const orders = await prisma.order.findMany({
      where,
      include: { items: true, table: true },
      orderBy: { createdAt: "desc" },
    });
    const rows = [[
      "Order No", "Created At", "Type", "Table", "Customer", "Phone",
      "Status", "Payment Status", "Payment Method", "Subtotal", "Tax", "Total", "Items",
    ]];
    orders.forEach((order) => rows.push([
      order.orderNo,
      order.createdAt.toISOString(),
      order.orderType,
      order.table?.label || order.table?.tableNo || "",
      order.customerName,
      order.customerPhone,
      order.orderStatus,
      order.paymentStatus,
      order.paymentMethod || "",
      order.subtotal,
      order.tax,
      order.totalWithTax,
      order.items.map((item) => `${item.name} x${item.quantity}`).join("; "),
    ]));
    sendCsv(res, `orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  } catch (error) {
    next(error);
  }
};

const exportInventory = async (req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { name: "asc" },
    });
    const rows = [[
      "Item", "Unit", "Current Stock", "Total Stock", "Stock Percent",
      "Reorder Point", "Cost Per Unit", "Supplier", "Location", "Updated At",
    ]];
    items.forEach((item) => rows.push([
      item.name,
      item.unit,
      item.currentStock,
      item.totalStock,
      item.totalStock ? Math.round((item.currentStock / item.totalStock) * 100) : 0,
      item.reorderPoint ?? "",
      item.costPerUnit ?? "",
      item.supplier || "",
      item.location || "",
      item.updatedAt.toISOString(),
    ]));
    sendCsv(res, `inventory-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  } catch (error) {
    next(error);
  }
};

module.exports = { exportOrders, exportInventory };
