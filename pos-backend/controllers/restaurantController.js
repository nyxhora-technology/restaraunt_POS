const crypto = require("crypto");
const prisma = require("../config/prisma");
const auth = require("../config/auth");
const config = require("../config/config");
const createHttpError = require("http-errors");
const { sendEmail } = require("../config/email");
const { writeAudit } = require("../utils/audit");

const registerRestaurant = async (req, res, next) => {
  try {
    if (req.user.role === "SUPER_ADMIN") {
      throw createHttpError(400, "Platform admins cannot register a restaurant");
    }
    if (req.user.restaurantId) {
      throw createHttpError(409, "You are already assigned to a restaurant");
    }

    const { name, address, city, phone, email, description, currency } = req.body;
    const slugBase =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "restaurant";
    const slug = `${slugBase}-${crypto.randomBytes(3).toString("hex")}`;

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
        },
      });
      await tx.user.update({
        where: { id: req.user.id },
        data: { role: "OWNER", restaurantId: created.id },
      });
      return created;
    });

    req.restaurantId = restaurant.id;
    req.user.role = "OWNER";
    await writeAudit(req, "RESTAURANT_REGISTERED", "Restaurant", restaurant.id);
    if (config.superAdminEmail) {
      await sendEmail({
        to: config.superAdminEmail,
        subject: "New restaurant pending approval",
        html: `<p>${name} has submitted a restaurant application.</p>`,
      }).catch((error) => console.error("Registration email failed:", error.message));
    }

    res.status(201).json({
      success: true,
      data: restaurant,
      message: "Restaurant registration submitted for approval",
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
    const restaurant = await prisma.restaurant.update({
      where: { id: req.restaurantId },
      data: req.body,
    });
    await writeAudit(req, "RESTAURANT_UPDATED", "Restaurant", restaurant.id, req.body);
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
    if (existing) throw createHttpError(409, "A user with this email already exists");

    const temporaryPassword = `${crypto.randomBytes(9).toString("base64url")}aA1!`;
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
      html: `<p>Your account is ready.</p><p>Temporary password: <strong>${temporaryPassword}</strong></p><p>Sign in and change it immediately.</p>`,
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

    await prisma.user.update({
      where: { id: staff.id },
      data: { restaurantId: null, role: "CASHIER" },
    });
    await writeAudit(req, "STAFF_REMOVED", "User", staff.id);
    res.json({ success: true, message: "Staff member removed" });
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
  removeStaff,
  changeFirstPassword,
};
