const crypto = require("crypto");
const { hashPassword } = require("better-auth/crypto");
const prisma = require("../config/prisma");
const auth = require("../config/auth");
const config = require("../config/config");
const createHttpError = require("http-errors");
const { sendEmail } = require("../config/email");
const { writeAudit } = require("../utils/audit");
const {
  generateReferralCode,
  REFERRAL_EXPIRY_DAYS,
  REFERRER_REWARD_DAYS,
  REFEREE_REWARD_DAYS,
} = require("./referralController");

const registerRestaurant = async (req, res, next) => {
  try {
    if (req.user.role === "SUPER_ADMIN") {
      throw createHttpError(400, "Platform admins cannot register a restaurant");
    }
    if (req.user.restaurantId) {
      throw createHttpError(409, "You are already assigned to a restaurant");
    }

    const { name, address, city, phone, email, description, currency, referralCode } = req.body;
    const slugBase =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "restaurant";
    const slug = `${slugBase}-${crypto.randomBytes(3).toString("hex")}`;

    // Resolve referral code before transaction (read-only)
    let referrer = null;
    if (referralCode) {
      const referring = await prisma.restaurant.findUnique({
        where: { referralCode },
        select: { id: true, status: true, ownerId: true, owner: { select: { name: true, email: true } } },
      });
      if (
        referring &&
        referring.status === "APPROVED" &&
        referring.ownerId !== req.user.id // prevent self-referral
      ) {
        // Check referee hasn't already been referred
        const alreadyReferred = await prisma.referral.findUnique({
          where: { refereeId: req.user.id },
        });
        if (!alreadyReferred) referrer = referring;
      }
    }

    const restaurant = await prisma.$transaction(async (tx) => {
      const freshUser = await tx.user.findUnique({ where: { id: req.user.id } });
      if (!freshUser || freshUser.restaurantId) {
        throw createHttpError(409, "User is already assigned to a restaurant");
      }

      const created = await tx.restaurant.create({
        data: {
          name,
          slug,
          address,
          city,
          phone,
          email,
          description,
          currency: currency || "INR",
          ownerId: req.user.id,
          status: "PENDING",
          referredById: referrer ? referrer.ownerId : null,
        },
      });
      await tx.user.update({
        where: { id: req.user.id },
        data: { role: "OWNER", restaurantId: created.id },
      });

      // Create the referral record if a valid referrer was found
      if (referrer) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFERRAL_EXPIRY_DAYS);
        await tx.referral.create({
          data: {
            referrerId: referrer.ownerId,
            refereeId: req.user.id,
            status: "PENDING",
            referrerRewardDays: REFERRER_REWARD_DAYS,
            refereeRewardDays: REFEREE_REWARD_DAYS,
            expiresAt,
          },
        });
      }

      return created;
    });

    req.restaurantId = restaurant.id;
    req.user.role = "OWNER";
    await writeAudit(req, "RESTAURANT_REGISTERED", "Restaurant", restaurant.id, {
      referredBy: referrer?.ownerId || null,
    });

    const adminSubject = referrer
      ? `New restaurant pending approval (referred by ${referrer.owner.name})`
      : "New restaurant pending approval";
    if (config.superAdminEmail) {
      await sendEmail({
        to: config.superAdminEmail,
        subject: adminSubject,
        html: `<p>${name} has submitted a restaurant application.${
          referrer ? ` Referred by <strong>${referrer.owner.name}</strong>.` : ""
        }</p>`,
      }).catch((error) => console.error("Registration email failed:", error.message));
    }

    res.status(201).json({
      success: true,
      data: restaurant,
      message: "Restaurant registration submitted for approval",
      referralApplied: !!referrer,
    });
  } catch (error) {
    next(error);
  }
};


const getMyRestaurant = async (req, res, next) => {
  try {
    if (!req.user.restaurantId) {
      return res.json({ success: true, data: null });
    }
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: req.user.restaurantId,
        OR: [{ ownerId: req.user.id }, { staff: { some: { id: req.user.id } } }],
      },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        _count: { select: { staff: true, tables: true, menuItems: true, orders: true } },
      },
    });
    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

const updateMyRestaurant = async (req, res, next) => {
  try {
    // SECURITY: Explicitly allowlist updatable fields to prevent mass assignment.
    // Fields like status, plan, slug, ownerId, restaurantId must never be
    // writable by the restaurant owner through this endpoint.
    const { name, address, city, phone, email, description, logo, currency } = req.body;
    const safeData = {};
    if (name !== undefined) safeData.name = name;
    if (address !== undefined) safeData.address = address;
    if (city !== undefined) safeData.city = city;
    if (phone !== undefined) safeData.phone = phone;
    if (email !== undefined) safeData.email = email;
    if (description !== undefined) safeData.description = description;
    if (logo !== undefined) safeData.logo = logo;
    if (currency !== undefined) safeData.currency = currency;

    const restaurant = await prisma.restaurant.update({
      where: { id: req.restaurantId },
      data: safeData,
    });
    await writeAudit(req, "RESTAURANT_UPDATED", "Restaurant", restaurant.id, safeData);
    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

const listStaff = async (req, res, next) => {
  try {
    const staff = await prisma.user.findMany({
      where: { restaurantId: req.restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

const inviteStaff = async (req, res, next) => {
  try {
    const { name, email, phone, role } = req.body;
    if (req.user.role === "MANAGER" && role === "MANAGER") {
      throw createHttpError(403, "Managers can only create cashier, kitchen, or waiter staff");
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    // ── Re-hire path: user exists and is a free agent (not employed anywhere) ──
    if (existing) {
      if (existing.restaurantId && existing.restaurantId !== req.restaurantId) {
        throw createHttpError(
          409,
          "This person is currently employed at another restaurant. They must be removed first."
        );
      }
      if (existing.restaurantId === req.restaurantId) {
        throw createHttpError(409, "This person is already a member of your team.");
      }
      // Free agent → re-assign to this restaurant
      const staff = await prisma.user.update({
        where: { id: existing.id },
        data: { role, restaurantId: req.restaurantId, mustChangePassword: false },
        select: { id: true, name: true, email: true, phone: true, role: true },
      });
      await writeAudit(req, "STAFF_REHIRED", "User", staff.id, { role: staff.role });
      await sendEmail({
        to: email,
        subject: `You've joined ${req.restaurant.name}`,
        html: `<p>Hi ${existing.name},</p><p>You have been added to <strong>${req.restaurant.name}</strong> as <strong>${role}</strong>. Sign in at any time to access your workspace.</p>`,
      }).catch((err) => console.error("Re-hire email failed:", err.message));
      return res.status(200).json({
        success: true,
        data: staff,
        message: "Staff member re-assigned to your restaurant.",
      });
    }

    // ── New user path: create account with temporary password ──────────────────
    const temporaryPassword = createTemporaryPassword();
    const result = await auth.api.signUpEmail({
      body: { name, email, password: temporaryPassword, phone },
    });
    const userId = result?.user?.id;
    if (!userId) throw createHttpError(500, "Staff account creation failed");

    const staff = await prisma.user.update({
      where: { id: userId },
      data: { phone, role, restaurantId: req.restaurantId, mustChangePassword: true },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    await writeAudit(req, "STAFF_INVITED", "User", staff.id, { role: staff.role });
    await sendEmail({
      to: email,
      subject: `You were invited to ${req.restaurant.name}`,
      html: `<p>Your account is ready.</p><p>Temporary password: <strong>${temporaryPassword}</strong></p><p>Sign in and change your password immediately.</p>`,
    }).catch((error) => console.error("Invite email failed:", error.message));

    res.status(201).json({
      success: true,
      data: staff,
      temporaryPassword,
      message: "Staff account created. Share the temporary password securely.",
    });
  } catch (error) {
    next(error);
  }
};

const createTemporaryPassword = () => `${crypto.randomBytes(9).toString("base64url")}aA1!`;

const resetStaffPassword = async (req, res, next) => {
  try {
    const staff = await prisma.user.findFirst({
      where: {
        id: req.params.userId,
        restaurantId: req.restaurantId,
      },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
    if (!staff) throw createHttpError(404, "Staff member not found");
    if (staff.role === "OWNER") {
      throw createHttpError(403, "The restaurant owner password cannot be reset here");
    }

    const temporaryPassword = createTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const credentialAccount = await prisma.account.findFirst({
      where: { userId: staff.id, providerId: "credential" },
      select: { id: true },
    });

    await prisma.$transaction([
      credentialAccount
        ? prisma.account.update({
            where: { id: credentialAccount.id },
            data: { password: passwordHash },
          })
        : prisma.account.create({
            data: {
              userId: staff.id,
              providerId: "credential",
              accountId: staff.id,
              password: passwordHash,
            },
          }),
      prisma.user.update({
        where: { id: staff.id },
        data: { mustChangePassword: true },
      }),
      prisma.session.deleteMany({ where: { userId: staff.id } }),
    ]);

    await writeAudit(req, "STAFF_PASSWORD_RESET", "User", staff.id, { role: staff.role });
    await sendEmail({
      to: staff.email,
      subject: `Your ${req.restaurant.name} password was reset`,
      html: `<p>Your temporary password has been reset.</p><p>Temporary password: <strong>${temporaryPassword}</strong></p><p>Sign in and change your password immediately.</p>`,
    }).catch((error) => console.error("Password reset email failed:", error.message));

    res.json({
      success: true,
      data: staff,
      temporaryPassword,
      message: "Temporary password reset. Share it securely with the staff member.",
    });
  } catch (error) {
    next(error);
  }
};

const removeStaff = async (req, res, next) => {
  try {
    const staff = await prisma.user.findFirst({
      where: {
        id: req.params.userId,
        restaurantId: req.restaurantId,
      },
    });
    if (!staff) throw createHttpError(404, "Staff member not found");
    if (staff.role === "OWNER") {
      throw createHttpError(403, "The restaurant owner cannot be removed");
    }
    if (
      req.user.role === "MANAGER" &&
      !["KITCHEN", "CASHIER", "WAITER"].includes(staff.role)
    ) {
      throw createHttpError(403, "Managers cannot remove owner or manager accounts");
    }

    // Preserve role so re-hire UX shows their last known title
    // Only unlink from this restaurant — account remains active as a free agent
    await prisma.$transaction([
      prisma.user.update({
        where: { id: staff.id },
        data: { restaurantId: null },
      }),
      // Revoke all active sessions so they are immediately signed out
      prisma.session.deleteMany({ where: { userId: staff.id } }),
    ]);
    await writeAudit(req, "STAFF_REMOVED", "User", staff.id, { previousRole: staff.role });
    res.json({ success: true, message: "Staff member removed and signed out" });
  } catch (error) {
    next(error);
  }
};

const changeFirstPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (currentPassword === newPassword) {
      throw createHttpError(400, "New password must be different from the temporary password");
    }

    // Find the credential account for this user
    const account = await prisma.account.findFirst({
      where: { userId: req.user.id, providerId: "credential" },
    });
    if (!account || !account.password) {
      throw createHttpError(400, "No password account found for this user");
    }

    // Verify the current (temporary) password using Better Auth's internal ctx
    // We do this via a direct fetch to the auth endpoint so cookies are handled correctly
    const backendUrl = config.backendUrl || `http://localhost:${config.port || 8000}`;
    const cookieHeader = req.headers.cookie || "";

    const changeRes = await fetch(`${backendUrl}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
        Origin: req.headers.origin || config.frontendUrl, // Required by Better Auth CSRF protection
      },
      body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: false }),
    });

    if (!changeRes.ok) {
      const errBody = await changeRes.json().catch(() => ({}));
      const message = errBody?.message || errBody?.error || "Incorrect current password";
      throw createHttpError(changeRes.status === 400 ? 400 : 401, message);
    }

    // Clear the mustChangePassword flag
    await prisma.user.update({
      where: { id: req.user.id },
      data: { mustChangePassword: false },
    });

    await writeAudit(req, "PASSWORD_CHANGED", "User", req.user.id);
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    next(error.status ? error : createHttpError(400, error.message || "Password change failed"));
  }
};


module.exports = {
  registerRestaurant,
  getMyRestaurant,
  updateMyRestaurant,
  listStaff,
  inviteStaff,
  resetStaffPassword,
  removeStaff,
  changeFirstPassword,
};
