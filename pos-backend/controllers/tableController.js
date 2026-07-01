const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { getIo } = require("../config/socket");
const { writeAudit } = require("../utils/audit");

const tableInclude = {
  area: true,
  currentOrder: {
    select: {
      id: true,
      orderNo: true,
      customerName: true,
      guests: true,
      orderStatus: true,
      createdAt: true,
    },
  },
};

const allowedStatusTransitions = {
  AVAILABLE: new Set(["RESERVED", "CLEANING", "OUT_OF_SERVICE"]),
  RESERVED: new Set(["AVAILABLE", "CLEANING", "OUT_OF_SERVICE"]),
  CLEANING: new Set(["AVAILABLE", "OUT_OF_SERVICE"]),
  OUT_OF_SERVICE: new Set(["AVAILABLE", "CLEANING"]),
  OCCUPIED: new Set(),
};

const emitTable = (restaurantId, table) => {
  getIo().to(`restaurant:${restaurantId}`).emit("table:updated", table);
};

const emitDiningArea = (restaurantId, area) => {
  getIo().to(`restaurant:${restaurantId}`).emit("dining-area:updated", area);
};

const normalizeCode = (value) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const normalizeLabel = (value) => value.trim().toUpperCase();
const normalizeCombinationGroup = (value) => value.trim().toUpperCase();

const findActiveArea = async (restaurantId, areaId) => {
  if (areaId) {
    const area = await prisma.diningArea.findFirst({
      where: { id: areaId, restaurantId, isActive: true },
    });
    if (!area) throw createHttpError(400, "Dining area is invalid or inactive");
    return area;
  }

  const existing = await prisma.diningArea.findFirst({
    where: { restaurantId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (existing) return existing;

  return prisma.diningArea.create({
    data: {
      restaurantId,
      name: "Main Dining",
      code: "MAIN",
      floor: "Ground Floor",
      climate: "AC",
      experience: "STANDARD",
      sortOrder: 0,
    },
  });
};

const addDiningArea = async (req, res, next) => {
  try {
    const area = await prisma.diningArea.create({
      data: {
        ...req.body,
        code: normalizeCode(req.body.code),
        restaurantId: req.restaurantId,
      },
    });
    await writeAudit(req, "DINING_AREA_CREATED", "DiningArea", area.id);
    emitDiningArea(req.restaurantId, area);
    res.status(201).json({ success: true, data: area });
  } catch (error) {
    next(error);
  }
};

const getDiningAreas = async (req, res, next) => {
  try {
    const areas = await prisma.diningArea.findMany({
      where: {
        restaurantId: req.restaurantId,
        ...(req.query.includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: {
            tables: { where: { isActive: true } },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json({ success: true, data: areas });
  } catch (error) {
    next(error);
  }
};

const updateDiningArea = async (req, res, next) => {
  try {
    const existing = await prisma.diningArea.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
      include: {
        _count: {
          select: {
            tables: { where: { isActive: true } },
          },
        },
      },
    });
    if (!existing) throw createHttpError(404, "Dining area not found");
    if (req.body.isActive === false && existing._count.tables > 0) {
      throw createHttpError(
        409,
        "Move or archive active tables before archiving this dining area",
      );
    }

    const data = { ...req.body };
    if (data.code) data.code = normalizeCode(data.code);
    const area = await prisma.diningArea.update({
      where: { id: existing.id },
      data,
    });
    await writeAudit(req, "DINING_AREA_UPDATED", "DiningArea", area.id, data);
    emitDiningArea(req.restaurantId, area);
    res.json({ success: true, data: area });
  } catch (error) {
    next(error);
  }
};

const archiveDiningArea = async (req, res, next) => {
  req.body = { isActive: false };
  return updateDiningArea(req, res, next);
};

const addTable = async (req, res, next) => {
  try {
    const area = await findActiveArea(req.restaurantId, req.body.areaId);
    const label = normalizeLabel(req.body.label || `T-${req.body.tableNo}`);
    const table = await prisma.table.create({
      data: {
        ...req.body,
        areaId: area.id,
        label,
        combinationGroup: req.body.isCombinable
          ? normalizeCombinationGroup(req.body.combinationGroup)
          : null,
        restaurantId: req.restaurantId,
      },
      include: tableInclude,
    });
    await writeAudit(req, "TABLE_CREATED", "Table", table.id, {
      areaId: area.id,
      label,
    });
    emitTable(req.restaurantId, table);
    res.status(201).json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

const getTables = async (req, res, next) => {
  try {
    const tables = await prisma.table.findMany({
      where: {
        restaurantId: req.restaurantId,
        ...(req.query.includeInactive ? {} : { isActive: true }),
        ...(req.query.areaId ? { areaId: req.query.areaId } : {}),
        ...(req.query.status ? { status: req.query.status } : {}),
        ...(req.query.minSeats ? { seats: { gte: req.query.minSeats } } : {}),
      },
      include: tableInclude,
      orderBy: [{ tableNo: "asc" }],
    });
    res.json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
};

const updateTable = async (req, res, next) => {
  try {
    const existing = await prisma.table.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "Table not found");

    if (req.body.areaId) {
      await findActiveArea(req.restaurantId, req.body.areaId);
    }

    const nextMinSeats = req.body.minSeats ?? existing.minSeats;
    const nextSeats = req.body.seats ?? existing.seats;
    if (nextMinSeats > nextSeats) {
      throw createHttpError(
        400,
        "Minimum seats cannot exceed maximum capacity",
      );
    }

    if (
      existing.currentOrderId &&
      (req.body.isActive === false ||
        (req.body.status && req.body.status !== "OCCUPIED"))
    ) {
      throw createHttpError(
        409,
        "Complete or cancel the active order before changing table availability",
      );
    }

    if (req.body.status && req.body.status !== existing.status) {
      if (!allowedStatusTransitions[existing.status]?.has(req.body.status)) {
        throw createHttpError(
          409,
          `Table cannot move from ${existing.status} to ${req.body.status}`,
        );
      }
    }

    const data = { ...req.body };
    if (data.label) data.label = normalizeLabel(data.label);
    const nextIsCombinable = data.isCombinable ?? existing.isCombinable;
    const nextCombinationGroup =
      data.combinationGroup ?? existing.combinationGroup;
    if (nextIsCombinable && !nextCombinationGroup) {
      throw createHttpError(
        400,
        "A combination group is required for combinable tables",
      );
    }
    data.combinationGroup = nextIsCombinable
      ? normalizeCombinationGroup(nextCombinationGroup)
      : null;
    if (data.isActive === false) data.status = "OUT_OF_SERVICE";
    if (data.isActive === true && existing.isActive === false && !data.status) {
      data.status = "AVAILABLE";
    }

    const table = await prisma.table.update({
      where: { id: existing.id },
      data,
      include: tableInclude,
    });
    await writeAudit(req, "TABLE_UPDATED", "Table", table.id, data);
    emitTable(req.restaurantId, table);
    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

const archiveTable = async (req, res, next) => {
  try {
    const existing = await prisma.table.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "Table not found");
    if (existing.currentOrderId) {
      throw createHttpError(409, "Complete or cancel the active order first");
    }

    const table = await prisma.table.update({
      where: { id: existing.id },
      data: { isActive: false, status: "OUT_OF_SERVICE" },
      include: tableInclude,
    });
    await writeAudit(req, "TABLE_ARCHIVED", "Table", table.id);
    emitTable(req.restaurantId, table);
    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addDiningArea,
  getDiningAreas,
  updateDiningArea,
  archiveDiningArea,
  addTable,
  getTables,
  updateTable,
  deleteTable: archiveTable,
};
