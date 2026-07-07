const prisma = require("../config/prisma");
const { getPlanLimit } = require("../config/planFeatures");

const analytics = async (req, res, next) => {
  try {
    const requestedDays = Number(req.query.days || 30);
    const planDays = getPlanLimit(req.restaurant?.plan || "STARTER", "analytics_days");
    const days = Math.min(requestedDays, planDays ?? requestedDays);
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - days + 1);

    const orders = await prisma.order.findMany({
      where: { restaurantId: req.restaurantId, createdAt: { gte: from } },
      select: {
        createdAt: true,
        orderStatus: true,
        totalWithTax: true,
        paymentMethod: true,
        paymentStatus: true,
        items: { select: { name: true, quantity: true, price: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const dailyMap = new Map();
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    const dishMap = new Map();
    const paymentMap = new Map();
    let completed = 0;
    let cancelled = 0;

    for (let index = 0; index < days; index += 1) {
      const date = new Date(from);
      date.setDate(from.getDate() + index);
      dailyMap.set(date.toISOString().slice(0, 10), 0);
    }

    orders.forEach((order) => {
      heatmap[order.createdAt.getDay()][order.createdAt.getHours()] += 1;
      if (order.orderStatus === "COMPLETED") completed += 1;
      if (["CANCELLED", "REJECTED"].includes(order.orderStatus)) cancelled += 1;
      if (order.paymentStatus === "PAID") {
        const key = order.createdAt.toISOString().slice(0, 10);
        dailyMap.set(key, (dailyMap.get(key) || 0) + order.totalWithTax);
        const method = order.paymentMethod || "Other";
        paymentMap.set(method, (paymentMap.get(method) || 0) + order.totalWithTax);
      }
      if (!["CANCELLED", "REJECTED"].includes(order.orderStatus)) {
        order.items.forEach((item) => {
          dishMap.set(item.name, (dishMap.get(item.name) || 0) + item.price * item.quantity);
        });
      }
    });

    res.json({
      success: true,
      data: {
        days,
        revenue: [...dailyMap].map(([date, amount]) => ({ date, amount })),
        topDishes: [...dishMap].map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount).slice(0, 7),
        heatmap,
        paymentSplit: [...paymentMap].map(([method, amount]) => ({ method, amount })),
        completion: {
          completed,
          cancelled,
          rate: completed + cancelled
            ? Math.round((completed / (completed + cancelled)) * 100)
            : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { analytics };
