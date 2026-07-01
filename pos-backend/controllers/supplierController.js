const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { writeAudit } = require("../utils/audit");

const listSuppliers = async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { inventoryItems: true, purchaseOrders: true } },
      },
    });
    res.json({ success: true, data: suppliers });
  } catch (error) { next(error); }
};

const createSupplier = async (req, res, next) => {
  try {
    const { name, contactName, phone, email, address, notes, leadTimeDays } = req.body;
    const supplier = await prisma.supplier.create({
      data: {
        restaurantId: req.restaurantId,
        name,
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : 1,
      },
    });
    await writeAudit(req, "SUPPLIER_CREATED", "Supplier", supplier.id);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) { next(error); }
};

const updateSupplier = async (req, res, next) => {
  try {
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "Supplier not found");
    const { name, contactName, phone, email, address, notes, leadTimeDays } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        name: name ?? existing.name,
        contactName: contactName !== undefined ? (contactName || null) : existing.contactName,
        phone: phone !== undefined ? (phone || null) : existing.phone,
        email: email !== undefined ? (email || null) : existing.email,
        address: address !== undefined ? (address || null) : existing.address,
        notes: notes !== undefined ? (notes || null) : existing.notes,
        leadTimeDays: leadTimeDays != null ? Number(leadTimeDays) : existing.leadTimeDays,
      },
    });
    await writeAudit(req, "SUPPLIER_UPDATED", "Supplier", supplier.id, req.body);
    res.json({ success: true, data: supplier });
  } catch (error) { next(error); }
};

const deleteSupplier = async (req, res, next) => {
  try {
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "Supplier not found");
    // Unlink items before deleting
    await prisma.inventoryItem.updateMany({
      where: { supplierId: req.params.id },
      data: { supplierId: null },
    });
    await prisma.supplier.delete({ where: { id: req.params.id } });
    await writeAudit(req, "SUPPLIER_DELETED", "Supplier", req.params.id);
    res.json({ success: true });
  } catch (error) { next(error); }
};

module.exports = { listSuppliers, createSupplier, updateSupplier, deleteSupplier };
