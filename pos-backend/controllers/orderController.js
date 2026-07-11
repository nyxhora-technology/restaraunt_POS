const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { getStartOfDay, getStartOfMonth, getStartOfYesterday, dayjs } = require("../utils/dateUtils");
const { getIo } = require("../config/socket");
const { writeAudit } = require("../utils/audit");
const { calcOrderTotals } = require("../utils/taxCalc");
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
    "cgstTotal",
    "sgstTotal",
    "igstTotal",
    "vatTotal",
    "taxTotal",
    "discountType",
    "discountValue",
    "discountAmt",
    "taxRate",
    "tax",
    "totalWithTax",
    "paymentStatus",
    "paymentMethod",
    "razorpayOrderId",
    "razorpayPaymentId",
    "payment",
  ].forEach((field) => delete sanitized[field]);
  sanitized.items = (order.items || []).map(({ price, cgstAmt, sgstAmt, vatAmt, taxAmt, ...item }) => item);

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
            include: {
              area: true,
              reservations: {
                where: {
                  reservedAt: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 2 * 60 * 60 * 1000),
                  },
                },
                take: 1,
              },
            },
          })
        : Promise.resolve([]),
      prisma.menuItem.findMany({
        where: {
          id: { in: uniqueItemIds },
          restaurantId: req.restaurantId,
          available: true,
        },
        include: { variants: true, taxGroup: true },
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
    if (isDineIn && tables.some((table) => table.reservations?.length)) {
      throw createHttpError(
        409,
        "One or more tables have a reservation within the next two hours",
      );
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
        taxGroup: menuItem.taxGroup || null,  // attach for calcOrderTotals
        hsnCode: menuItem.hsnCode || null,
        sacCode: menuItem.sacCode || null,
        isMrpItem: menuItem.isMrpItem || false,
      };
    });

    // — Discount (optional, all roles can apply) —
    const discount = req.body.discount || null; // { type: "FLAT"|"PERCENT", value: number }

    // — Per-item tax + order totals —
    const totals = calcOrderTotals(normalizedItems, discount);

    // Build the OrderItem create payloads with per-item tax snapshots
    const orderItemsPayload = normalizedItems.map((item, idx) => {
      const bd = totals.itemBreakdowns[idx];
      const tg = item.taxGroup;
      return {
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        note: item.note || null,
        variantId: item.variantId || null,
        variantLabel: item.variantLabel || null,
        // Tax snapshot
        taxGroupName: tg ? tg.name : null,
        taxType: bd.taxType,
        cgstRate: bd.cgstRate,
        sgstRate: bd.sgstRate,
        igstRate: bd.igstRate,
        vatRate: bd.vatRate,
        cgstAmt: bd.cgstAmt,
        sgstAmt: bd.sgstAmt,
        igstAmt: bd.igstAmt,
        vatAmt: bd.vatAmt,
        taxAmt: bd.taxAmt,
        isMrpItem: item.isMrpItem,
        hsnCode: item.hsnCode || null,
        sacCode: item.sacCode || null,
      };
    });

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
            subtotal: totals.subtotal,
            cgstTotal: totals.cgstTotal,
            sgstTotal: totals.sgstTotal,
            igstTotal: totals.igstTotal,
            vatTotal: totals.vatTotal,
            taxTotal: totals.taxTotal,
            discountType: discount?.type || null,
            discountValue: discount?.value ? Number(discount.value) : null,
            discountAmt: totals.discountAmt,
            totalWithTax: totals.totalWithTax,
            items: { create: orderItemsPayload },
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

    void writeAudit(req, "ORDER_CREATED", "Order", order.id, {
      orderNo: order.orderNo,
      subtotal: totals.subtotal,
      discountAmt: totals.discountAmt,
      taxTotal: totals.taxTotal,
      totalWithTax: totals.totalWithTax,
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
    const { getPlanLimit } = require("../config/planFeatures");
    const analyticsDays = getPlanLimit(
      req.restaurant?.plan || "STARTER",
      "analytics_days",
    );
    const cappedQuery = { ...req.query };
    if (analyticsDays !== null) {
      const earliestAllowed = new Date(
        Date.now() - analyticsDays * 24 * 60 * 60 * 1000,
      );
      if (
        !cappedQuery.from ||
        new Date(cappedQuery.from).getTime() < earliestAllowed.getTime()
      ) {
        cappedQuery.from = earliestAllowed.toISOString();
        res.set("X-Analytics-Capped", "true");
      }
    }
    const where = buildOrderWhere(req.restaurantId, cappedQuery);
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
    const tz = req.restaurant?.timezone || "Asia/Kolkata";
    const todayStart = getStartOfDay(tz);
    const yesterdayStart = getStartOfYesterday(tz);
    const sevenDaysAgo = dayjs.tz(new Date(), tz).subtract(6, "day").startOf("day").toDate();
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
      recentOrdersList,
      recentPaymentsList,
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
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.payment.findMany({
        where: { restaurantId, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, amount: true },
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

    const sparklines = {
      revenue: Array(7).fill(0),
      orders: Array(7).fill(0),
      labels: Array(7).fill(""),
    };

    const currentDayjs = dayjs.tz(new Date(), tz).startOf("day");
    for (let i = 0; i < 7; i++) {
      const d = currentDayjs.subtract(6 - i, "day");
      sparklines.labels[i] = d.format("MMM D");
    }

    recentOrdersList.forEach((order) => {
      const orderDay = dayjs.tz(order.createdAt, tz).startOf("day");
      const diff = currentDayjs.diff(orderDay, "day");
      const index = 6 - diff;
      if (index >= 0 && index < 7) {
        sparklines.orders[index] += 1;
      }
    });

    recentPaymentsList.forEach((payment) => {
      const paymentDay = dayjs.tz(payment.createdAt, tz).startOf("day");
      const diff = currentDayjs.diff(paymentDay, "day");
      const index = 6 - diff;
      if (index >= 0 && index < 7) {
        sparklines.revenue[index] += Number(payment.amount || 0);
      }
    });

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
        sparklines,
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
    PENDING: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "CANCELLED"],
    SERVED: ["CANCELLED"],
  },
  MANAGER: {
    PENDING: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "CANCELLED"],
    SERVED: ["CANCELLED"],
  },
  KITCHEN: {
    PENDING: ["PREPARING"],
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
    if (nextStatus === "PREPARING" && !existing.kitchenAcceptedAt) data.kitchenAcceptedAt = new Date();
    if (nextStatus === "READY") data.kitchenReadyAt = new Date();
    if (req.body.kitchenNote !== undefined)
      data.kitchenNote = req.body.kitchenNote;

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: existing.id },
        data,
        include: orderInclude,
      });
      if (existing.tableId && ["REJECTED", "CANCELLED", "COMPLETED"].includes(nextStatus)) {
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
      include: { variants: true, taxGroup: true },
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
          // Preserve existing tax snapshot for lines that were already priced
          taxGroup: null, // snapshot preserved below via existingItem fields
          _preservedSnapshot: existingItem,
          hsnCode: existingItem.hsnCode || null,
          sacCode: existingItem.sacCode || null,
          isMrpItem: existingItem.isMrpItem || false,
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
        taxGroup: menuItem.taxGroup || null,
        hsnCode: menuItem.hsnCode || null,
        sacCode: menuItem.sacCode || null,
        isMrpItem: menuItem.isMrpItem || false,
      };
    });

    // Build a diff of changed quantities so the kitchen gets precise info
    const prevByKey = new Map(
      existingOrder.items.map((item) => [
        `${item.menuItemId}:${item.variantId || "base"}`,
        item,
      ]),
    );
    const nextByKey = new Map(
      normalizedItems.map((item) => [
        `${item.menuItemId}:${item.variantId || "base"}`,
        item,
      ]),
    );
    const changedItems = [];
    for (const [key, next] of nextByKey.entries()) {
      const prev = prevByKey.get(key);
      if (!prev) {
        changedItems.push({ name: next.name, oldQty: 0, newQty: next.quantity, change: "added" });
      } else if (prev.quantity !== next.quantity) {
        changedItems.push({ name: next.name, oldQty: prev.quantity, newQty: next.quantity, change: "modified" });
      }
    }
    for (const [key, prev] of prevByKey.entries()) {
      if (!nextByKey.has(key)) {
        changedItems.push({ name: prev.name, oldQty: prev.quantity, newQty: 0, change: "removed" });
      }
    }

    // Preserve existing discount on the order when recalculating
    const existingDiscount = existingOrder.discountType
      ? { type: existingOrder.discountType, value: existingOrder.discountValue }
      : null;

    const totals = calcOrderTotals(normalizedItems, existingDiscount);

    // Build OrderItem payloads with tax snapshots
    const orderItemsPayload = normalizedItems.map((item, idx) => {
      const bd = totals.itemBreakdowns[idx];
      const snap = item._preservedSnapshot;
      return {
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        note: item.note || null,
        variantId: item.variantId || null,
        variantLabel: item.variantLabel || null,
        // For preserved lines, keep their original tax snapshot
        taxGroupName: snap ? snap.taxGroupName : (item.taxGroup ? item.taxGroup.name : null),
        taxType: snap ? snap.taxType : bd.taxType,
        cgstRate: snap ? snap.cgstRate : bd.cgstRate,
        sgstRate: snap ? snap.sgstRate : bd.sgstRate,
        igstRate: snap ? snap.igstRate : bd.igstRate,
        vatRate: snap ? snap.vatRate : bd.vatRate,
        cgstAmt: bd.cgstAmt, // always recalculated since qty may change
        sgstAmt: bd.sgstAmt,
        igstAmt: bd.igstAmt,
        vatAmt: bd.vatAmt,
        taxAmt: bd.taxAmt,
        isMrpItem: item.isMrpItem || (snap ? snap.isMrpItem : false),
        hsnCode: item.hsnCode || (snap ? snap.hsnCode : null),
        sacCode: item.sacCode || (snap ? snap.sacCode : null),
      };
    });

    const order = await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: { orderId: existingOrder.id },
      });

      return await tx.order.update({
        where: { id: existingOrder.id },
        data: {
          subtotal: totals.subtotal,
          cgstTotal: totals.cgstTotal,
          sgstTotal: totals.sgstTotal,
          igstTotal: totals.igstTotal,
          vatTotal: totals.vatTotal,
          taxTotal: totals.taxTotal,
          discountAmt: totals.discountAmt,
          totalWithTax: totals.totalWithTax,
          items: { create: orderItemsPayload },
        },
        include: orderInclude,
      });
    });

    await writeAudit(req, "ORDER_ITEMS_UPDATED", "Order", order.id, {
      orderNo: order.orderNo,
      totalWithTax,
    });

    emitOrder(req.restaurantId, "order:updated", order);

    // Separate event so kitchen display can distinguish item changes from status changes
    if (changedItems.length > 0) {
      getIo()
        .to(`restaurant:${req.restaurantId}`)
        .emit("order:items-updated", {
          id: order.id,
          orderNo: order.orderNo,
          changedItems,
        });
    }

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

    const tz = req.restaurant?.timezone || "Asia/Kolkata";
    const now = dayjs().tz(tz);
    const startOfMonth = getStartOfMonth(tz);
    const endOfMonth = now.endOf("month").toDate();

    const [ordersThisMonth, menuItems, tables, staffSeats] = await prisma.$transaction([
      prisma.order.count({
        where: { restaurantId, createdAt: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.menuItem.count({ where: { restaurantId } }),
      prisma.table.count({ where: { restaurantId, isActive: true } }),
      prisma.user.count({
        where: {
          OR: [{ restaurantId }, { ownedRestaurant: { id: restaurantId } }],
        },
      }),
    ]);

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
        resources: {
          menu_items: { used: menuItems, limit: getPlanLimit(plan, "menu_items") },
          tables: { used: tables, limit: getPlanLimit(plan, "tables") },
          staff_seats: { used: staffSeats, limit: getPlanLimit(plan, "staff_seats") },
        },
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
