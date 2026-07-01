const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { sendEmail } = require("../config/email");
const { writeAudit } = require("../utils/audit");
const { getIo } = require("../config/socket");

const getAllRestaurants = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const where = status ? { status } : {};
    const [data, total] = await prisma.$transaction([
      prisma.restaurant.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true, phone: true } },
          _count: { select: { staff: true, orders: true, menuItems: true, tables: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.restaurant.count({ where }),
    ]);
    res.json({ success: true, data, pagination: { page, limit, total } });
  } catch (error) {
    next(error);
  }
};

const getRestaurant = async (req, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        staff: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { orders: true, payments: true, menuItems: true, tables: true } },
      },
    });
    if (!restaurant) throw createHttpError(404, "Restaurant not found");
    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

const updateRestaurantStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    if (status === "REJECTED" && !rejectionReason) {
      throw createHttpError(400, "Rejection reason is required");
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
      },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    await writeAudit(req, `RESTAURANT_${status}`, "Restaurant", restaurant.id, {
      rejectionReason,
    });
    const subjects = {
      APPROVED: "Your restaurant has been approved",
      REJECTED: "Restaurant application update",
      SUSPENDED: "Your restaurant has been suspended",
    };
    await sendEmail({
      to: restaurant.owner.email,
      subject: subjects[status],
      html: `<p>${restaurant.name} is now <strong>${status}</strong>.</p>${
        rejectionReason ? `<p>Reason: ${rejectionReason}</p>` : ""
      }`,
    }).catch((error) => console.error("Status email failed:", error.message));

    getIo()
      .to("platform:admin")
      .to(`user:${restaurant.ownerId}`)
      .to(`restaurant:${restaurant.id}`)
      .emit("restaurant:status", restaurant);
    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

const getStats = async (_req, res, next) => {
  try {
    const [restaurants, users, orders, revenue] = await prisma.$transaction([
      prisma.restaurant.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.user.count(),
      prisma.order.count(),
      prisma.payment.aggregate({
        where: { status: { in: ["captured", "paid"] } },
        _sum: { amount: true },
      }),
    ]);
    res.json({
      success: true,
      data: {
        restaurants,
        users,
        orders,
        revenue: revenue._sum.amount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          restaurantId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count(),
    ]);
    res.json({ success: true, data, pagination: { page, limit, total } });
  } catch (error) {
    next(error);
  }
};

const updateRestaurantPlan = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id },
      data: { plan },
      select: { id: true, name: true, plan: true, status: true },
    });
    await writeAudit(req, "RESTAURANT_PLAN_UPDATED", "Restaurant", restaurant.id, { plan });
    getIo()
      .to(`restaurant:${restaurant.id}`)
      .emit("restaurant:plan_updated", { plan });
    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRestaurants,
  getRestaurant,
  updateRestaurantStatus,
  updateRestaurantPlan,
  getStats,
  getUsers,
};
