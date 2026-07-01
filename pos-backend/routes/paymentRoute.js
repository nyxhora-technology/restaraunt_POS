const express = require("express");
const { z } = require("zod");
const {
  createOrder,
  verifyPayment,
  recordCashPayment,
  getPaymentHistory,
  recordReceiptPrint,
} = require("../controllers/paymentController");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { validate } = require("../middlewares/validate");

const router = express.Router();
const paymentRoles = requireRole("OWNER", "MANAGER", "CASHIER");

router.use(requireTenant);
router.get("/history", requireRole("OWNER", "MANAGER"), getPaymentHistory);
router.post(
  "/create-order",
  paymentRoles,
  validate(z.object({ orderId: z.string().min(1) })),
  createOrder,
);
router.post(
  "/verify",
  paymentRoles,
  validate(
    z.object({
      orderId: z.string().min(1),
      razorpay_order_id: z.string().min(1),
      razorpay_payment_id: z.string().min(1),
      razorpay_signature: z.string().min(1),
    }),
  ),
  verifyPayment,
);
router.post("/cash/:orderId", paymentRoles, recordCashPayment);
router.post(
  "/receipt/:orderId/print",
  paymentRoles,
  validate(
    z.object({
      copyType: z.enum(["ORIGINAL", "REPRINT"]),
    }),
  ),
  recordReceiptPrint,
);

module.exports = router;
