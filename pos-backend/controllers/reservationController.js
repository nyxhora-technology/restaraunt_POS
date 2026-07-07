const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { writeAudit } = require("../utils/audit");

const include = {
  table: { select: { id: true, tableNo: true, label: true, seats: true } },
};

const listReservations = async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date();
    const data = await prisma.reservation.findMany({
      where: { restaurantId: req.restaurantId, reservedAt: { gte: from } },
      include,
      orderBy: { reservedAt: "asc" },
      take: 200,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const createReservation = async (req, res, next) => {
  try {
    const table = await prisma.table.findFirst({
      where: { id: req.body.tableId, restaurantId: req.restaurantId, isActive: true },
    });
    if (!table) throw createHttpError(404, "Table not found");
    const reservedAt = new Date(req.body.reservedAt);
    const collisionStart = new Date(reservedAt.getTime() - 90 * 60 * 1000);
    const collisionEnd = new Date(reservedAt.getTime() + 90 * 60 * 1000);
    const collision = await prisma.reservation.findFirst({
      where: {
        tableId: table.id,
        reservedAt: { gte: collisionStart, lte: collisionEnd },
      },
    });
    if (collision) throw createHttpError(409, "This table already has a nearby reservation");
    const reservation = await prisma.reservation.create({
      data: { ...req.body, reservedAt, restaurantId: req.restaurantId },
      include,
    });
    await writeAudit(req, "RESERVATION_CREATED", "Reservation", reservation.id);
    res.status(201).json({ success: true, data: reservation });
  } catch (error) {
    next(error);
  }
};

const updateReservation = async (req, res, next) => {
  try {
    const existing = await prisma.reservation.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "Reservation not found");
    if (req.body.tableId) {
      const table = await prisma.table.findFirst({
        where: { id: req.body.tableId, restaurantId: req.restaurantId, isActive: true },
      });
      if (!table) throw createHttpError(404, "Table not found");
    }
    const reservation = await prisma.reservation.update({
      where: { id: existing.id },
      data: {
        ...req.body,
        ...(req.body.reservedAt ? { reservedAt: new Date(req.body.reservedAt) } : {}),
      },
      include,
    });
    await writeAudit(req, "RESERVATION_UPDATED", "Reservation", reservation.id);
    res.json({ success: true, data: reservation });
  } catch (error) {
    next(error);
  }
};

const deleteReservation = async (req, res, next) => {
  try {
    const existing = await prisma.reservation.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "Reservation not found");
    await prisma.reservation.delete({ where: { id: existing.id } });
    await writeAudit(req, "RESERVATION_CANCELLED", "Reservation", existing.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listReservations,
  createReservation,
  updateReservation,
  deleteReservation,
};
