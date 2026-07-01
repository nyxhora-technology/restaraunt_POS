const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { writeAudit } = require("../utils/audit");
const config = require("../config/config");
const { planAllowsFeature } = require("../config/planFeatures");

// ─── Public (no auth) ────────────────────────────────────────────────────────

/**
 * GET /api/qr/public/:slug
 * Returns the full live menu for a restaurant identified by a QR code slug.
 * Publicly accessible — no authentication required.
 */
const getPublicMenu = async (req, res, next) => {
  try {
    const qr = await prisma.qrCode.findUnique({
      where: { slug: req.params.slug },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            logo: true,
            description: true,
            city: true,
            status: true,
            plan: true,
            currency: true,
          },
        },
        table: {
          select: {
            tableNo: true,
            label: true,
            area: { select: { name: true } },
          },
        },
      },
    });

    if (!qr) throw createHttpError(404, "Menu not found");
    if (!qr.enabled)
      throw createHttpError(410, "This menu QR code is currently disabled");
    if (qr.restaurant.status !== "APPROVED") {
      throw createHttpError(404, "Menu not found");
    }
    if (
      !config.devUnlockFeatures &&
      !planAllowsFeature(qr.restaurant.plan, "QR_MENU")
    ) {
      throw createHttpError(403, "QR menu requires the Professional plan");
    }

    // Increment scan count (fire-and-forget)
    prisma.qrCode
      .update({ where: { id: qr.id }, data: { scanCount: { increment: 1 } } })
      .catch(() => {});

    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId: qr.restaurant.id },
      select: {
        id: true,
        name: true,
        menuItems: {
          where: { available: true },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image: true,
            isVeg: true,
            variants: {
              where: { available: true },
              select: {
                id: true,
                label: true,
                price: true,
              },
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    // Only return categories that have at least one available item
    const filtered = categories.filter((c) => c.menuItems.length > 0);
    const publicRestaurant = {
      name: qr.restaurant.name,
      logo: qr.restaurant.logo,
      description: qr.restaurant.description,
      city: qr.restaurant.city,
      currency: qr.restaurant.currency,
    };

    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json({
      success: true,
      data: {
        capabilities: { ordering: false },
        restaurant: publicRestaurant,
        table: qr.table || null,
        label: qr.label,
        categories: filtered,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Authenticated (tenant) ───────────────────────────────────────────────────

const listQrCodes = async (req, res, next) => {
  try {
    const codes = await prisma.qrCode.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        table: { select: { id: true, tableNo: true, label: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, data: codes });
  } catch (error) {
    next(error);
  }
};

const createQrCode = async (req, res, next) => {
  try {
    const { label, tableId } = req.body;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurantId },
      select: { slug: true },
    });

    // Build a unique slug: "<restaurant-slug>-<sanitized-label>-<random>"
    const sanitized = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const rand = Math.random().toString(36).slice(2, 7);
    const slug = `${restaurant.slug}-${sanitized}-${rand}`;

    if (tableId) {
      const table = await prisma.table.findFirst({
        where: { id: tableId, restaurantId: req.restaurantId },
      });
      if (!table) throw createHttpError(404, "Table not found");
    }

    const qr = await prisma.qrCode.create({
      data: {
        restaurantId: req.restaurantId,
        label,
        tableId: tableId || null,
        slug,
      },
      include: {
        table: { select: { id: true, tableNo: true, label: true } },
      },
    });

    await writeAudit(req, "QR_CODE_CREATED", "QrCode", qr.id, { label, slug });
    res.status(201).json({ success: true, data: qr });
  } catch (error) {
    next(error);
  }
};

const updateQrCode = async (req, res, next) => {
  try {
    const { label, enabled } = req.body;
    const existing = await prisma.qrCode.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "QR code not found");

    const qr = await prisma.qrCode.update({
      where: { id: req.params.id },
      data: {
        ...(label !== undefined && { label }),
        ...(enabled !== undefined && { enabled }),
      },
      include: {
        table: { select: { id: true, tableNo: true, label: true } },
      },
    });
    await writeAudit(req, "QR_CODE_UPDATED", "QrCode", qr.id, req.body);
    res.json({ success: true, data: qr });
  } catch (error) {
    next(error);
  }
};

const deleteQrCode = async (req, res, next) => {
  try {
    const existing = await prisma.qrCode.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "QR code not found");
    await prisma.qrCode.delete({ where: { id: req.params.id } });
    await writeAudit(req, "QR_CODE_DELETED", "QrCode", req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicMenu,
  listQrCodes,
  createQrCode,
  updateQrCode,
  deleteQrCode,
};
