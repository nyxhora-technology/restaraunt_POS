const express = require("express");
const { z } = require("zod");
const {
  registerRestaurant,
  getMyRestaurant,
  updateMyRestaurant,
  listStaff,
  inviteStaff,
  resetStaffPassword,
  removeStaff,
  changeFirstPassword,
} = require("../controllers/restaurantController");
const { requireAuth } = require("../middlewares/requireAuth");
const { requireTenant } = require("../middlewares/requireTenant");
const { requireRole } = require("../middlewares/requireRole");
const { validate } = require("../middlewares/validate");
const { checkPlanLimit } = require("../middlewares/checkPlanLimit");

const router = express.Router();
const profileFields = {
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(254),
  description: z.string().trim().max(1000).optional(),
  logo: z.string().url().max(1000).optional(),
  // currency was previously missing — caused currency updates to be silently stripped
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AUD"]).optional(),
};

router.post(
  "/register",
  requireAuth,
  validate(z.object({ ...profileFields, referralCode: z.string().max(60).optional() }).omit({ logo: true })),
  registerRestaurant,
);
router.get("/context", requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      restaurantId: req.user.restaurantId,
      mustChangePassword: req.user.mustChangePassword,
    },
  });
});
router.get("/me", requireAuth, getMyRestaurant);
router.put(
  "/me",
  requireTenant,
  requireRole("OWNER"),
  validate(z.object(profileFields).partial()),
  updateMyRestaurant,
);
router.get("/staff", requireTenant, requireRole("OWNER", "MANAGER"), listStaff);
router.post(
  "/staff/invite",
  requireTenant,
  requireRole("OWNER", "MANAGER"),
  checkPlanLimit("staff_seats"),
  validate(
    z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().toLowerCase().email(),
      phone: z.string().trim().min(7).max(20).optional(),
      role: z.enum(["MANAGER", "KITCHEN", "CASHIER", "WAITER"]),
    }),
  ),
  inviteStaff,
);
router.post(
  "/staff/:userId/reset-password",
  requireTenant,
  requireRole("OWNER"),
  validate(z.object({})),
  resetStaffPassword,
);
router.delete(
  "/staff/:userId",
  requireTenant,
  requireRole("OWNER", "MANAGER"),
  removeStaff,
);

// Force-change temp password — requires auth only (not tenant check)
router.post(
  "/staff/change-password",
  requireAuth,
  validate(
    z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(128),
    })
  ),
  changeFirstPassword,
);

module.exports = router;
