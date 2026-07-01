const crypto = require("crypto");
const Razorpay = require("razorpay");
const config = require("../config/config");
const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { getIo } = require("../config/socket");
const { writeAudit } = require("../utils/audit");

const getRazorpay = () => {
  if (!config.razorpayKeyId || !config.razorpaySecretKey) {
    throw createHttpError(503, "Online payments are not configured");
  }
  return new Razorpay({
    key_id: config.razorpayKeyId,
    key_secret: config.razorpaySecretKey,
  });
};

const safeEqual = (left, right) => {
  const a = Buffer.from(left || "", "utf8");
  const b = Buffer.from(right || "", "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const completePayment = async ({
  order,
  paymentId,
  status,
  method,
  email,
  contact,
}) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: { orderId: order.id },
    });
    if (existing) return existing;

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentId,
        amount: Number(order.totalWithTax),
        currency: "INR",
        status,
        method,
        email,
        contact,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paymentMethod: method,
        razorpayPaymentId: method === "ONLINE" ? paymentId : undefined,
        orderStatus: "COMPLETED",
      },
    });
    if (order.tableId) {
      await tx.table.updateMany({
        where: {
          restaurantId: order.restaurantId,
          currentOrderId: order.id,
        },
        data: { status: "AVAILABLE", currentOrderId: null },
      });
    }
    return payment;
  });

const createOrder = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.body.orderId,
        restaurantId: req.restaurantId,
        paymentStatus: "UNPAID",
        orderStatus: { in: ["READY", "SERVED"] },
      },
    });
    if (!order) throw createHttpError(404, "Payable order not found");

    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(Number(order.totalWithTax) * 100),
      currency: "INR",
      receipt: `pos_${order.orderNo}_${Date.now()}`,
      notes: {
        restaurantId: req.restaurantId,
        orderId: order.id,
      },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: razorpayOrder.id },
    });
    res.json({
      success: true,
      data: razorpayOrder,
      keyId: config.razorpayKeyId,
    });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;
    const expected = crypto
      .createHmac("sha256", config.razorpaySecretKey || "")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (!safeEqual(expected, razorpay_signature)) {
      throw createHttpError(400, "Payment signature verification failed");
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: req.restaurantId,
        razorpayOrderId: razorpay_order_id,
      },
    });
    if (!order) throw createHttpError(404, "Order not found");

    const remotePayment =
      await getRazorpay().payments.fetch(razorpay_payment_id);
    if (
      remotePayment.order_id !== razorpay_order_id ||
      Number(remotePayment.amount) !==
        Math.round(Number(order.totalWithTax) * 100) ||
      !["authorized", "captured"].includes(remotePayment.status)
    ) {
      throw createHttpError(400, "Payment details do not match the order");
    }

    const payment = await completePayment({
      order,
      paymentId: razorpay_payment_id,
      status: remotePayment.status,
      method: "ONLINE",
      email: remotePayment.email,
      contact: remotePayment.contact,
    });
    await writeAudit(req, "PAYMENT_COMPLETED", "Payment", payment.id, {
      orderId: order.id,
      method: "ONLINE",
    });
    getIo().to(`restaurant:${req.restaurantId}`).emit("order:completed", {
      orderId: order.id,
      payment,
    });
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

const recordCashPayment = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        restaurantId: req.restaurantId,
        paymentStatus: "UNPAID",
        orderStatus: { in: ["READY", "SERVED"] },
      },
    });
    if (!order) throw createHttpError(404, "Payable order not found");

    const payment = await completePayment({
      order,
      paymentId: `cash_${crypto.randomUUID()}`,
      status: "paid",
      method: "CASH",
    });
    await writeAudit(req, "PAYMENT_COMPLETED", "Payment", payment.id, {
      orderId: order.id,
      method: "CASH",
    });
    getIo().to(`restaurant:${req.restaurantId}`).emit("order:completed", {
      orderId: order.id,
      payment,
    });
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

const getPaymentHistory = async (req, res, next) => {
  try {
    const data = await prisma.payment.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        order: {
          include: {
            items: true,
            table: { include: { area: true } },
            tableAssignments: {
              include: { table: { include: { area: true } } },
              orderBy: { assignedAt: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const recordReceiptPrint = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        restaurantId: req.restaurantId,
        paymentStatus: "PAID",
      },
      include: { payment: true },
    });
    if (!order?.payment) {
      throw createHttpError(404, "Paid order receipt not found");
    }

    await writeAudit(
      req,
      "PAYMENT_RECEIPT_PRINT_REQUESTED",
      "Payment",
      order.payment.id,
      {
        orderId: order.id,
        orderNo: order.orderNo,
        copyType: req.body.copyType,
        paymentId: order.payment.paymentId,
      },
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const webHookVerification = async (req, res, next) => {
  try {
    if (!config.razorpayWebhookSecret) {
      throw createHttpError(503, "Webhook is not configured");
    }
    if (!Buffer.isBuffer(req.body)) {
      throw createHttpError(400, "Raw webhook body is required");
    }
    const signature = req.headers["x-razorpay-signature"];
    const expected = crypto
      .createHmac("sha256", config.razorpayWebhookSecret)
      .update(req.body)
      .digest("hex");
    if (!safeEqual(expected, signature)) {
      throw createHttpError(400, "Invalid webhook signature");
    }

    const event = JSON.parse(req.body.toString("utf8"));
    if (event.event === "payment.captured") {
      const remote = event.payload.payment.entity;
      const orderId = remote.notes?.orderId;
      const restaurantId = remote.notes?.restaurantId;
      if (orderId && restaurantId) {
        const order = await prisma.order.findFirst({
          where: {
            id: orderId,
            restaurantId,
            razorpayOrderId: remote.order_id,
          },
        });
        if (
          order &&
          Number(remote.amount) === Math.round(Number(order.totalWithTax) * 100)
        ) {
          const payment = await completePayment({
            order,
            paymentId: remote.id,
            status: remote.status,
            method: "ONLINE",
            email: remote.email,
            contact: remote.contact,
          });
          getIo().to(`restaurant:${restaurantId}`).emit("order:completed", {
            orderId,
            payment,
          });
        }
      }
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  recordCashPayment,
  getPaymentHistory,
  recordReceiptPrint,
  webHookVerification,
};
