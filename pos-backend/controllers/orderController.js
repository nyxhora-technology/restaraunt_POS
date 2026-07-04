const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { getIo } = require("../config/socket");
const { writeAudit } = require("../utils/audit");
const {
  processOrderConsumption,
  reverseOrderConsumption,
} = require("./inventoryController");

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const orderInclude = {
  items: true,
  table: { include: { area: true } },
  tableAssignments: {
    include: { table: { include: { area: true } } },
    orderBy: { assignedAt: "asc" },
  },
  payment: true,
};

const emitOrder = (restaurantId, event, order) => {
  getIo()
    .to(`restaurant:${restaurantId}`)
    .emit(event, {
      id: order.id,
      orderNo: order.orderNo,
      orderStatus: order.orderStatus,
      tableId: order.tableId,
      tableIds:
        order.tableAssignments?.map((assignment) => assignment.tableId) || [],
    });
};

const serializeOrderForRole = (order, role) => {
  if (role !== "KITCHEN") return order;

  const sanitized = { ...order };
  [
    "subtotal",
    "taxRate",
    "tax",
    "totalWithTax",
    "paymentStatus",
    "paymentMethod",
    "razorpayOrderId",
    "razorpayPaymentId",
    "payment",
  ].forEach((field) => delete sanitized[field]);
  sanitized.items = (order.items || []).map(({ price, ...item }) => item);

  delete sanitized.customerName;
  delete sanitized.customerPhone;
  delete sanitized.guests;

  return sanitized;
};

const addOrder = async (req, res, next) => {
  const startedAt = req.requestStartedAt || Date.now();
  try {
    const {
      orderType,
      tableId,
      tableIds,
      customerName,
      customerPhone,
      guests,
      kitchenNote,
      items,
    } = req.body;
    const isDineIn = orderType === "DINE_IN";
    const requestedTableIds = isDineIn
      ? [...new Set(tableIds?.length ? tableIds : tableId ? [tableId] : [])]
      : [];
    const uniqueItemIds = [...new Set(items.map((item) => item.menuItemId))];

    const [tables, menuItems] = await Promise.all([
      isDineIn
        ? prisma.table.findMany({
            where: {
              id: { in: requestedTableIds },
              restaurantId: req.restaurantId,
            },
            include: { area: true },
          })
        : Promise.resolve([]),
      prisma.menuItem.findMany({
        where: {
          id: { in: uniqueItemIds },
          restaurantId: req.restaurantId,
          available: true,
        },
        include: { variants: true },
      }),
    ]);

    if (isDineIn && tables.length !== requestedTableIds.length) {
      throw createHttpError(404, "One or more tables were not found");
    }
    if (
      isDineIn &&
      tables.some(
        (table) =>
          !table.isActive ||
          table.currentOrderId ||
          table.status !== "AVAILABLE",
      )
    ) {
      throw createHttpError(409, "One or more tables are no longer available");
    }
    if (isDineIn) {
      const totalCapacity = tables.reduce((sum, table) => sum + table.seats, 0);
      if (guests > totalCapacity) {
        throw createHttpError(
          400,
          `Party size exceeds the selected capacity of ${totalCapacity}`,
        );
      }
      if (tables.length === 1 && guests < tables[0].minSeats) {
        throw createHttpError(
          400,
          `This table requires at least ${tables[0].minSeats} guests`,
        );
      }
      if (tables.length > 1) {
        const [firstTable] = tables;
        const canCombine = tables.every(
          (table) =>
            table.isCombinable &&
            table.areaId &&
            table.areaId === firstTable.areaId &&
            table.combinationGroup &&
            table.combinationGroup === firstTable.combinationGroup,
        );
        if (!canCombine) {
          throw createHttpError(
            400,
            "Combined tables must share a dining area and combination group",
          );
        }
      }
    }
    if (menuItems.length !== uniqueItemIds.length) {
      throw createHttpError(
        400,
        "One or more menu items are unavailable or invalid",
      );
    }

    const menuById = new Map(menuItems.map((item) => [item.id, item]));
    const normalizedItems = items.map((item) => {
      const menuItem = menuById.get(item.menuItemId);
      let price = Number(menuItem.price);
      let variantLabel = null;
      let variantId = null;

      if (item.variantId) {
        const variant = menuItem.variants.find((v) => v.id === item.variantId);
        if (!variant || !variant.available) {
          throw createHttpError(
            400,
            "One or more selected variants are unavailable or invalid",
          );
        }
        price = Number(variant.price);
        variantLabel = variant.label;
        variantId = variant.id;
      }

      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        price,
        quantity: item.quantity,
        note: item.note,
        variantId,
        variantLabel,
      };
    });
    const subtotal = roundMoney(
      normalizedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
    );
    const taxRate = 5;
    const tax = roundMoney((subtotal * taxRate) / 100);
    const totalWithTax = roundMoney(subtotal + tax);

    const order = await prisma.$transaction(
      async (tx) => {
        const latest = await tx.order.aggregate({
          where: { restaurantId: req.restaurantId },
          _max: { orderNo: true },
        });
        const created = await tx.order.create({
          data: {
            restaurantId: req.restaurantId,
            orderType,
            tableId: isDineIn ? requestedTableIds[0] : null,
            orderNo: (latest._max.orderNo || 0) + 1,
            customerName,
            customerPhone,
            guests,
            kitchenNote,
            subtotal,
            taxRate,
            tax,
            totalWithTax,
            items: { create: normalizedItems },
            tableAssignments: isDineIn
              ? {
                  create: requestedTableIds.map((assignedTableId) => ({
                    tableId: assignedTableId,
                  })),
                }
              : undefined,
          },
        });
        if (isDineIn) {
          const occupied = await tx.table.updateMany({
            where: {
              id: { in: requestedTableIds },
              restaurantId: req.restaurantId,
              isActive: true,
              currentOrderId: null,
              status: "AVAILABLE",
            },
            data: { status: "OCCUPIED", currentOrderId: created.id },
          });
          if (occupied.count !== requestedTableIds.length) {
            throw createHttpError(
              409,
              "One or more tables were claimed by another order",
            );
          }
        }
        const tableById = new Map(tables.map((table) => [table.id, table]));
        return {
          ...created,
          items: normalizedItems,
          table: isDineIn ? tableById.get(requestedTableIds[0]) : null,
          tableAssignments: requestedTableIds.map((assignedTableId) => ({
            orderId: created.id,
            tableId: assignedTableId,
            table: tableById.get(assignedTableId),
          })),
          payment: null,
        };
      },
      { isolationLevel: "Serializable" },
    );

    emitOrder(req.restaurantId, "order:new", order);
    const durationMs = Date.now() - startedAt;
    res.setHeader("Server-Timing", `order-create;dur=${durationMs}`);
    res.status(201).json({
      success: true,
      data: serializeOrderForRole(order, req.user.role),
    });

    // Auditing is already best-effort in writeAudit. Do not delay the cashier's
    // response by another remote database round trip.
    void writeAudit(req, "ORDER_CREATED", "Order", order.id, {
      orderNo: order.orderNo,
      totalWithTax,
      tableIds: requestedTableIds,
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
      include: orderInclude,
    });
    if (!order) throw createHttpError(404, "Order not found");
    res.json({
      success: true,
      data: serializeOrderForRole(order, req.user.role),
    });
  } catch (error) {
    next(error);
  }
};

const buildOrderWhere = (restaurantId, query) => {
  const where = { restaurantId };
  if (query.status) where.orderStatus = query.status;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }
  return where;
};

const getOrders = async (req, res, next) => {
  try {
    const { page, limit, sortBy = "createdAt", sortOrder = "desc" } = req.query;
    const where = buildOrderWhere(req.restaurantId, req.query);
    const validSortFields = ["createdAt", "totalAmount"];
    const actualSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const actualSortOrder = sortOrder === "asc" ? "asc" : "desc";

    const [data, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { [actualSortBy]: actualSortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    res.json({
      success: true,
      data: data.map((order) => serializeOrderForRole(order, req.user.role)),
      pagination: { page, limit, total },
    });
  } catch (error) {
    next(error);
  }
};

const getKitchenOrders = async (req, res, next) => {
  try {
    const data = await prisma.order.findMany({
      where: {
        restaurantId: req.restaurantId,
        orderStatus: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY"] },
      },
      include: {
        items: true,
        table: { include: { area: true } },
        tableAssignments: {
          include: { table: { include: { area: true } } },
          orderBy: { assignedAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({
      success: true,
      data: data.map((order) => serializeOrderForRole(order, "KITCHEN")),
    });
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const restaurantId = req.restaurantId;

    const [
      ordersToday,
      ordersYesterday,
      completedToday,
      paidOrdersToday,
      pending,
      preparing,
      ready,
      unpaidOrders,
      tableStatuses,
      totalTables,
      revenueToday,
      revenueYesterday,
      popularDishGroups,
    ] = await prisma.$transaction([
      prisma.order.count({
        where: { restaurantId, createdAt: { gte: todayStart } },
      }),
      prisma.order.count({
        where: {
          restaurantId,
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
      }),
      prisma.order.count({
        where: {
          restaurantId,
          createdAt: { gte: todayStart },
          orderStatus: "COMPLETED",
        },
      }),
      prisma.payment.count({
        where: { restaurantId, createdAt: { gte: todayStart } },
      }),
      prisma.order.count({
        where: { restaurantId, orderStatus: "PENDING" },
      }),
      prisma.order.count({
        where: {
          restaurantId,
          orderStatus: { in: ["ACCEPTED", "PREPARING"] },
        },
      }),
      prisma.order.count({
        where: { restaurantId, orderStatus: "READY" },
      }),
      prisma.order.count({
        where: {
          restaurantId,
          paymentStatus: { in: ["UNPAID", "PARTIAL"] },
          orderStatus: { notIn: ["REJECTED", "CANCELLED", "COMPLETED"] },
        },
      }),
      prisma.table.groupBy({
        by: ["status"],
        where: { restaurantId },
        _count: { _all: true },
      }),
      prisma.table.count({ where: { restaurantId } }),
      prisma.payment.aggregate({
        where: { restaurantId, createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          restaurantId,
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
        _sum: { amount: true },
      }),
      prisma.orderItem.groupBy({
        by: ["menuItemId", "name"],
        where: {
          order: {
            restaurantId,
            orderStatus: { notIn: ["REJECTED", "CANCELLED"] },
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 7,
      }),
    ]);

    const popularMenuItems = popularDishGroups.length
      ? await prisma.menuItem.findMany({
          where: {
            restaurantId,
            id: { in: popularDishGroups.map((dish) => dish.menuItemId) },
          },
          select: { id: true, image: true, available: true },
        })
      : [];
    const menuItemById = new Map(
      popularMenuItems.map((item) => [item.id, item]),
    );
    const tableCountByStatus = Object.fromEntries(
      tableStatuses.map((entry) => [entry.status, entry._count._all]),
    );
    const todayRevenue = Number(revenueToday._sum.amount || 0);
    const yesterdayRevenue = Number(revenueYesterday._sum.amount || 0);

    res.json({
      success: true,
      data: {
        restaurantName: req.restaurant.name,
        ordersToday,
        ordersYesterday,
        revenueToday: todayRevenue,
        revenueYesterday: yesterdayRevenue,
        averageOrderValue: paidOrdersToday
          ? roundMoney(todayRevenue / paidOrdersToday)
          : 0,
        activeTables: tableCountByStatus.OCCUPIED || 0,
        availableTables: tableCountByStatus.AVAILABLE || 0,
        reservedTables: tableCountByStatus.RESERVED || 0,
        cleaningTables: tableCountByStatus.CLEANING || 0,
        totalTables,
        pending,
        preparing,
        ready,
        unpaidOrders,
        completed: completedToday,
        popularDishes: popularDishGroups.map((dish) => ({
          id: dish.menuItemId,
          name: dish.name,
          image: menuItemById.get(dish.menuItemId)?.image || null,
          available: menuItemById.get(dish.menuItemId)?.available ?? false,
          quantityOrdered: dish._sum.quantity || 0,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

const allowedTransitions = {
  OWNER: {
    PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
    ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "CANCELLED"],
    SERVED: ["CANCELLED"],
  },
  MANAGER: {
    PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
    ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "CANCELLED"],
    SERVED: ["CANCELLED"],
  },
  KITCHEN: {
    PENDING: ["ACCEPTED", "REJECTED"],
    ACCEPTED: ["PREPARING", "READY"],
    PREPARING: ["READY"],
  },
  CASHIER: {
    PENDING: ["CANCELLED"],
    READY: ["SERVED"],
  },
  WAITER: {
    PENDING: ["CANCELLED"],
    READY: ["SERVED"],
  },
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "Order not found");

    const nextStatus = req.body.orderStatus;
    if (
      !allowedTransitions[req.user.role]?.[existing.orderStatus]?.includes(
        nextStatus,
      )
    ) {
      throw createHttpError(
        409,
        `${req.user.role} cannot move ${existing.orderStatus} to ${nextStatus}`,
      );
    }

    const data = { orderStatus: nextStatus };
    if (nextStatus === "ACCEPTED") data.kitchenAcceptedAt = new Date();
    if (nextStatus === "READY") data.kitchenReadyAt = new Date();
    if (req.body.kitchenNote !== undefined)
      data.kitchenNote = req.body.kitchenNote;

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: existing.id },
        data,
        include: orderInclude,
      });
      if (existing.tableId && ["REJECTED", "CANCELLED"].includes(nextStatus)) {
        await tx.table.updateMany({
          where: {
            restaurantId: req.restaurantId,
            currentOrderId: existing.id,
          },
          data: { status: "AVAILABLE", currentOrderId: null },
        });
      }
      return updated;
    });

    if (nextStatus === "SERVED" && existing.orderStatus !== "SERVED") {
      // Background async inventory deduction – triggered when order is served
      processOrderConsumption(req.restaurantId, order.id, order.items).catch(
        (err) => {
          console.error("Failed to deduct inventory for order", order.id, err);
        },
      );
    }

    // ARCH-1 fix: If a SERVED order is cancelled, reverse the inventory deduction
    if (nextStatus === "CANCELLED" && existing.orderStatus === "SERVED") {
      reverseOrderConsumption(req.restaurantId, order.id, order.items).catch(
        (err) => {
          console.error(
            "Failed to reverse inventory for cancelled order",
            order.id,
            err,
          );
        },
      );
    }

    await writeAudit(req, `ORDER_${nextStatus}`, "Order", order.id, {
      from: existing.orderStatus,
    });
    emitOrder(req.restaurantId, "order:updated", order);
    res.json({
      success: true,
      data: serializeOrderForRole(order, req.user.role),
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderItems = async (req, res, next) => {
  try {
    const { items } = req.body;
    const uniqueItemIds = [...new Set(items.map((item) => item.menuItemId))];

    const existingOrder = await prisma.order.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
      include: { items: true },
    });

    if (!existingOrder) throw createHttpError(404, "Order not found");
    if (
      ["COMPLETED", "CANCELLED", "REJECTED"].includes(existingOrder.orderStatus)
    ) {
      throw createHttpError(400, "Cannot modify items for this order status");
    }
    if (existingOrder.paymentStatus === "PAID") {
      throw createHttpError(400, "Cannot modify items for a paid order");
    }

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: uniqueItemIds },
        restaurantId: req.restaurantId,
      },
      include: { variants: true },
    });

    if (menuItems.length !== uniqueItemIds.length) {
      throw createHttpError(400, "One or more menu items are invalid");
    }

    const menuById = new Map(menuItems.map((item) => [item.id, item]));
    const existingBySelection = new Map(
      existingOrder.items.map((item) => [
        `${item.menuItemId}:${item.variantId || "base"}`,
        item,
      ]),
    );
    const normalizedItems = items.map((item) => {
      const menuItem = menuById.get(item.menuItemId);
      const existingItem = existingBySelection.get(
        `${item.menuItemId}:${item.variantId || "base"}`,
      );

      // Prices and labels already accepted on an order are immutable snapshots.
      // Menu changes only apply to lines newly added to the order.
      if (existingItem) {
        return {
          menuItemId: existingItem.menuItemId,
          name: existingItem.name,
          price: Number(existingItem.price),
          quantity: item.quantity,
          note: item.note,
          variantId: existingItem.variantId,
          variantLabel: existingItem.variantLabel,
        };
      }

      if (!menuItem.available) {
        throw createHttpError(400, `${menuItem.name} is no longer available`);
      }

      let price = Number(menuItem.price);
      let variantLabel = null;
      let variantId = null;

      if (item.variantId) {
        const variant = menuItem.variants.find((v) => v.id === item.variantId);
        if (!variant || !variant.available) {
          throw createHttpError(
            400,
            "One or more selected variants are unavailable or invalid",
          );
        }
        price = Number(variant.price);
        variantLabel = variant.label;
        variantId = variant.id;
      }

      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        price,
        quantity: item.quantity,
        note: item.note,
        variantId,
        variantLabel,
      };
    });

    const subtotal = roundMoney(
      normalizedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
    );
    const taxRate = existingOrder.taxRate;
    const tax = roundMoney((subtotal * taxRate) / 100);
    const totalWithTax = roundMoney(subtotal + tax);

    const order = await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: { orderId: existingOrder.id },
      });

      return await tx.order.update({
        where: { id: existingOrder.id },
        data: {
          subtotal,
          tax,
          totalWithTax,
          items: { create: normalizedItems },
        },
        include: orderInclude,
      });
    });

    await writeAudit(req, "ORDER_ITEMS_UPDATED", "Order", order.id, {
      orderNo: order.orderNo,
      totalWithTax,
    });

    emitOrder(req.restaurantId, "order:updated", order);
    res.json({
      success: true,
      data: serializeOrderForRole(order, req.user.role),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/order/usage
 * Returns this month's order count vs the plan limit.
 * Used by the frontend to render the usage bar.
 */
const getOrderUsage = async (req, res, next) => {
  try {
    const { getPlanLimit } = require("../config/planFeatures");
    const restaurantId = req.restaurant?.id;
    const plan = req.restaurant?.plan || "STARTER";

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const ordersThisMonth = await prisma.order.count({
      where: { restaurantId, createdAt: { gte: startOfMonth, lte: endOfMonth } },
    });

    const limit = getPlanLimit(plan, "orders_per_month");
    const percentage = limit ? Math.min(100, Math.round((ordersThisMonth / limit) * 100)) : 0;

    res.json({
      success: true,
      data: {
        plan,
        ordersThisMonth,
        limit,           // null = unlimited
        percentage,      // 0-100; 0 when unlimited
        unlimited: limit === null,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addOrder,
  getOrderById,
  getOrders,
  getKitchenOrders,
  getDashboard,
  updateOrderStatus,
  updateOrderItems,
  getOrderUsage,
};
