const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { sendEmail } = require("../config/email");
const { writeAudit } = require("../utils/audit");
const { getIo } = require("../config/socket");
const { generateReferralCode } = require("./referralController");

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

    // Generate referral code on first approval
    let referralCodeUpdate = {};
    if (status === "APPROVED") {
      const existing = await prisma.restaurant.findUnique({
        where: { id: req.params.id },
        select: { slug: true, referralCode: true },
      });
      if (existing && !existing.referralCode) {
        const code = await generateReferralCode(existing.slug);
        referralCodeUpdate = { referralCode: code };
      }
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
        ...referralCodeUpdate,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    await writeAudit(req, `RESTAURANT_${status}`, "Restaurant", restaurant.id, {
      rejectionReason,
    });

    // ── Referral reward logic: fires only on APPROVED ─────────────────────────
    if (status === "APPROVED" && restaurant.referredById) {
      const referral = await prisma.referral.findUnique({
        where: { refereeId: restaurant.ownerId },
      });

      if (referral && referral.status === "PENDING" && new Date() < referral.expiresAt) {
        // Mark referral completed and credit both sides atomically
        await prisma.$transaction([
          prisma.referral.update({
            where: { id: referral.id },
            data: { status: "COMPLETED", rewardGiven: true, completedAt: new Date() },
          }),
          // Credit the referrer's restaurant
          prisma.restaurant.update({
            where: { ownerId: referral.referrerId },
            data: { creditDays: { increment: referral.referrerRewardDays } },
          }),
          // Credit the new (referee) restaurant
          prisma.restaurant.update({
            where: { id: restaurant.id },
            data: { creditDays: { increment: referral.refereeRewardDays } },
          }),
        ]);

        // Fetch referrer info for emails
        const referrerRestaurant = await prisma.restaurant.findUnique({
          where: { ownerId: referral.referrerId },
          select: { name: true, owner: { select: { name: true, email: true } } },
        });

        // Email referrer
        if (referrerRestaurant?.owner?.email) {
          await sendEmail({
            to: referrerRestaurant.owner.email,
            subject: `🎉 Your referral earned you ${referral.referrerRewardDays} free days!`,
            html: `<p>Hi ${referrerRestaurant.owner.name},</p>
<p>Great news! <strong>${restaurant.name}</strong>, a restaurant you referred, just got approved on our platform.</p>
<p>As promised, we've credited <strong>${referral.referrerRewardDays} free days</strong> to your account.</p>
<p>Keep sharing your referral link to earn more!</p>`,
          }).catch((err) => console.error("Referrer reward email failed:", err.message));
        }

        // Email referee (new restaurant owner)
        if (restaurant.owner?.email) {
          await sendEmail({
            to: restaurant.owner.email,
            subject: `🎁 Welcome bonus: ${referral.refereeRewardDays} free days added to your account`,
            html: `<p>Hi ${restaurant.owner.name},</p>
<p>Congratulations — <strong>${restaurant.name}</strong> has been approved!</p>
<p>Because you signed up through a referral, we've added <strong>${referral.refereeRewardDays} free days</strong> to your account as a welcome bonus.</p>
<p>Enjoy your workspace!</p>`,
          }).catch((err) => console.error("Referee reward email failed:", err.message));
        }
      } else if (referral && referral.status === "PENDING" && new Date() >= referral.expiresAt) {
        // Referral expired — mark it
        await prisma.referral.update({
          where: { id: referral.id },
          data: { status: "EXPIRED" },
        }).catch(() => {});
      }
    }

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
