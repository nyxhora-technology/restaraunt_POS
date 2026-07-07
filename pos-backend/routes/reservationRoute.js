const express = require("express");
const { z } = require("zod");
const controller = require("../controllers/reservationController");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { requireFeature } = require("../middlewares/requireFeature");
const { validate } = require("../middlewares/validate");

const router = express.Router();
const input = z.object({
  tableId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20),
  reservedAt: z.string().datetime(),
  partySize: z.coerce.number().int().min(1).max(100),
  notes: z.string().trim().max(500).optional().nullable(),
});

router.use(
  requireTenant,
  requireRole("OWNER", "MANAGER"),
  requireFeature("RESERVATIONS"),
);
router.get(
  "/",
  validate(z.object({ from: z.string().datetime().optional() }), "query"),
  controller.listReservations,
);
router.post("/", validate(input), controller.createReservation);
router.patch("/:id", validate(input.partial()), controller.updateReservation);
router.delete("/:id", controller.deleteReservation);

module.exports = router;
