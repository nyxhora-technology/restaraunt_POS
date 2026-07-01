const express = require("express");
const { z } = require("zod");
const {
  getAllRestaurants,
  getRestaurant,
  updateRestaurantStatus,
  updateRestaurantPlan,
  getStats,
  getUsers,
} = require("../controllers/adminController");
const { requireAuth } = require("../middlewares/requireAuth");
const { requireRole } = require("../middlewares/requireRole");
const { validate } = require("../middlewares/validate");

const router = express.Router();
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
};

router.use(requireAuth, requireRole("SUPER_ADMIN"));
router.get(
  "/restaurants",
  validate(
    z.object({
      status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
      ...pagination,
    }),
    "query",
  ),
  getAllRestaurants,
);
router.get("/restaurants/:id", getRestaurant);
router.put(
  "/restaurants/:id/status",
  validate(
    z.object({
      status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
      rejectionReason: z.string().trim().min(3).max(500).optional(),
    }),
  ),
  updateRestaurantStatus,
);
router.put(
  "/restaurants/:id/plan",
  validate(
    z.object({
      plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
    }),
  ),
  updateRestaurantPlan,
);
router.get("/stats", getStats);
router.get("/users", validate(z.object(pagination), "query"), getUsers);

module.exports = router;
