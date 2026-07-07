const crypto = require("crypto");
const prisma = require("../config/prisma");
const createHttpError = require("http-errors");

const REFERRAL_EXPIRY_DAYS = 90;
const REFERRER_REWARD_DAYS = 30;
const REFEREE_REWARD_DAYS = 15;

// ── Generate a unique referral code from a restaurant slug ────────────────────
const generateReferralCode = async (slug) => {
  const base = slug.replace(/[^a-z0-9]+/g, "-").slice(0, 14).replace(/-$/, "");
  for (let i = 0; i < 8; i++) {
    const suffix = crypto.randomBytes(2).toString("hex");
    const code = `${base}-${suffix}`;
    const exists = await prisma.restaurant.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  // Fallback: pure random
  return crypto.randomBytes(6).toString("hex");
};

// ── GET /api/referral/me — Referrer stats + code ─────────────────────────────
const getMyReferrals = async (req, res, next) => {
  try {
    let restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurantId },
      select: {
        slug: true,
        referralCode: true,
        creditDays: true,
        status: true,
      },
    });

    if (!restaurant) throw createHttpError(404, "Restaurant not found");
    if (restaurant.status !== "APPROVED") {
      return res.json({
        success: true,
        data: {
          active: false,
          message: "Referral program unlocks after your restaurant is approved.",
          referralCode: null,
          referralLink: null,
          creditDays: 0,
          pending: 0,
          completed: 0,
          expired: 0,
          referrals: [],
        },
      });
    }

    // Lazy-generate referral code for restaurants approved before this feature launched
    if (!restaurant.referralCode) {
      const code = await generateReferralCode(restaurant.slug);
      restaurant = await prisma.restaurant.update({
        where: { id: req.restaurantId },
        data: { referralCode: code },
        select: { slug: true, referralCode: true, creditDays: true, status: true },
      });
    }

    const referrals = await prisma.referral.findMany({
      where: { referrerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        referee: {
          select: { name: true, email: true },
        },
      },
    });

    const counts = { PENDING: 0, COMPLETED: 0, EXPIRED: 0 };
    referrals.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const referralLink = `${frontendUrl}/join?ref=${restaurant.referralCode}`;

    res.json({
      success: true,
      data: {
        active: true,
        referralCode: restaurant.referralCode,
        referralLink,
        creditDays: restaurant.creditDays,
        pending: counts.PENDING,
        completed: counts.COMPLETED,
        expired: counts.EXPIRED,
        rewardsPerReferral: {
          youGet: REFERRER_REWARD_DAYS,
          theyGet: REFEREE_REWARD_DAYS,
        },
        referrals: referrals.map((r) => ({
          id: r.id,
          refereeName: r.referee.name,
          refereeEmail: r.referee.email,
          status: r.status,
          expiresAt: r.expiresAt,
          completedAt: r.completedAt,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/referral/validate/:code — Check if a code is valid (public) ─────
const validateReferralCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const restaurant = await prisma.restaurant.findUnique({
      where: { referralCode: code },
      select: {
        id: true,
        name: true,
        status: true,
        owner: { select: { id: true, name: true } },
      },
    });

    if (!restaurant || restaurant.status !== "APPROVED") {
      return res.json({ success: true, data: { valid: false } });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        referredByName: restaurant.owner.name,
        referredByRestaurant: restaurant.name,
        youGet: REFEREE_REWARD_DAYS,
        theyGet: REFERRER_REWARD_DAYS,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyReferrals,
  validateReferralCode,
  generateReferralCode,
  REFERRAL_EXPIRY_DAYS,
  REFERRER_REWARD_DAYS,
  REFEREE_REWARD_DAYS,
};
