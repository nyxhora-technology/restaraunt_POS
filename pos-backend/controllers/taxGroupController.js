/**
 * taxGroupController.js
 *
 * Manages reusable TaxGroup records per restaurant.
 * Supports full CRUD + one-click seeding of standard Indian GST profiles.
 */

const prisma = require("../config/prisma");
const createHttpError = require("http-errors");
const { writeAudit } = require("../utils/audit");
const { INDIA_STATE_VAT_PRESETS } = require("../utils/indiaStateTaxPresets");

// ─── Default tax group seeds (standard Indian restaurant setup) ───────────────

/**
 * Returns the default tax group seed data for a restaurant.
 * These are seeded automatically when a restaurant is first approved.
 * Owners can edit/delete these after seeding.
 */
const DEFAULT_SEEDS = [
  {
    name: "GST 5% (Food)",
    type: "GST",
    cgst: 2.5,
    sgst: 2.5,
    igst: 5,
    vatRate: 0,
    hsnSacCode: "996331",
    isDefault: true,
    isSystem: true,
  },
  {
    name: "GST 18% (Hotel/AC)",
    type: "GST",
    cgst: 9,
    sgst: 9,
    igst: 18,
    vatRate: 0,
    hsnSacCode: "996331",
    isDefault: false,
    isSystem: true,
  },
  {
    name: "GST 12% (Packaged Food)",
    type: "GST",
    cgst: 6,
    sgst: 6,
    igst: 12,
    vatRate: 0,
    hsnSacCode: "21069099",
    isDefault: false,
    isSystem: true,
  },
  {
    name: "MRP Incl. 18% (Packaged Drinks)",
    type: "INCLUDED",
    cgst: 9,
    sgst: 9,
    igst: 18,
    vatRate: 0,
    hsnSacCode: "22021090",
    isDefault: false,
    isSystem: true,
  },
  {
    name: "MRP Incl. 5% (Water/Exempt Pack.)",
    type: "INCLUDED",
    cgst: 2.5,
    sgst: 2.5,
    igst: 5,
    vatRate: 0,
    hsnSacCode: "22011010",
    isDefault: false,
    isSystem: true,
  },
  {
    name: "Exempt (No Tax)",
    type: "EXEMPT",
    cgst: 0,
    sgst: 0,
    igst: 0,
    vatRate: 0,
    isDefault: false,
    isSystem: true,
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Seeds default tax groups for a restaurant if none exist yet.
 * Safe to call multiple times — uses upsert to avoid duplicates.
 * @param {string} restaurantId
 * @param {import('@prisma/client').PrismaClient} [tx] - optional transaction client
 */
async function seedDefaultTaxGroups(restaurantId, tx = prisma) {
  const existing = await tx.taxGroup.count({ where: { restaurantId } });
  if (existing > 0) return; // already seeded

  await tx.taxGroup.createMany({
    data: DEFAULT_SEEDS.map((seed) => ({ ...seed, restaurantId })),
    skipDuplicates: true,
  });
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/tax-groups
 * List all tax groups for the authenticated restaurant.
 */
const listTaxGroups = async (req, res, next) => {
  try {
    const groups = await prisma.taxGroup.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    res.json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tax-groups/state-presets
 * Returns all India state VAT presets for the UI dropdown.
 */
const listStatePresets = async (req, res, next) => {
  try {
    res.json({ success: true, data: INDIA_STATE_VAT_PRESETS });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tax-groups
 * Create a new tax group.
 */
const createTaxGroup = async (req, res, next) => {
  try {
    const {
      name,
      type,
      cgst = 0,
      sgst = 0,
      igst = 0,
      vatRate = 0,
      stateName,
      hsnSacCode,
      isDefault = false,
    } = req.body;

    // Validate type-specific fields
    if (type === "GST" || type === "INCLUDED") {
      if (cgst < 0 || sgst < 0) {
        throw createHttpError(400, "CGST and SGST must be non-negative");
      }
    }
    if (type === "VAT" && vatRate <= 0) {
      throw createHttpError(400, "VAT rate must be greater than 0 for VAT type");
    }

    // If setting as default, clear existing default first
    if (isDefault) {
      await prisma.taxGroup.updateMany({
        where: { restaurantId: req.restaurantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const group = await prisma.taxGroup.create({
      data: {
        restaurantId: req.restaurantId,
        name,
        type,
        cgst: Number(cgst),
        sgst: Number(sgst),
        igst: Number(igst),
        vatRate: Number(vatRate),
        stateName: stateName || null,
        hsnSacCode: hsnSacCode || null,
        isDefault,
        isSystem: false,
      },
    });

    await writeAudit(req, "TAX_GROUP_CREATED", "TaxGroup", group.id, { name, type });
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    if (error.code === "P2002") {
      return next(createHttpError(409, `A tax group named "${req.body.name}" already exists`));
    }
    next(error);
  }
};

/**
 * PUT /api/tax-groups/:id
 * Update an existing tax group.
 */
const updateTaxGroup = async (req, res, next) => {
  try {
    const existing = await prisma.taxGroup.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
    });
    if (!existing) throw createHttpError(404, "Tax group not found");

    const {
      name,
      type,
      cgst,
      sgst,
      igst,
      vatRate,
      stateName,
      hsnSacCode,
      isDefault,
    } = req.body;

    // If updating type on a system group, restrict to rate changes only (name + rates OK)
    // but don't allow changing the fundamental type to prevent misconfiguration
    if (existing.isSystem && type && type !== existing.type) {
      throw createHttpError(
        400,
        "Cannot change the tax type of a system-seeded group. Create a new group instead."
      );
    }

    // Clear old default if this group is being set as default
    if (isDefault === true && !existing.isDefault) {
      await prisma.taxGroup.updateMany({
        where: { restaurantId: req.restaurantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const safeData = {};
    if (name !== undefined) safeData.name = name;
    if (type !== undefined && !existing.isSystem) safeData.type = type;
    if (cgst !== undefined) safeData.cgst = Number(cgst);
    if (sgst !== undefined) safeData.sgst = Number(sgst);
    if (igst !== undefined) safeData.igst = Number(igst);
    if (vatRate !== undefined) safeData.vatRate = Number(vatRate);
    if (stateName !== undefined) safeData.stateName = stateName;
    if (hsnSacCode !== undefined) safeData.hsnSacCode = hsnSacCode;
    if (isDefault !== undefined) safeData.isDefault = Boolean(isDefault);

    const group = await prisma.taxGroup.update({
      where: { id: existing.id },
      data: safeData,
    });

    await writeAudit(req, "TAX_GROUP_UPDATED", "TaxGroup", group.id, safeData);
    res.json({ success: true, data: group });
  } catch (error) {
    if (error.code === "P2002") {
      return next(createHttpError(409, `A tax group named "${req.body.name}" already exists`));
    }
    next(error);
  }
};

/**
 * DELETE /api/tax-groups/:id
 * Delete a tax group. Blocked if menu items use it.
 */
const deleteTaxGroup = async (req, res, next) => {
  try {
    const existing = await prisma.taxGroup.findFirst({
      where: { id: req.params.id, restaurantId: req.restaurantId },
      include: { _count: { select: { menuItems: true } } },
    });
    if (!existing) throw createHttpError(404, "Tax group not found");

    if (existing._count.menuItems > 0) {
      throw createHttpError(
        409,
        `This tax group is assigned to ${existing._count.menuItems} menu item(s). ` +
          "Reassign them first before deleting."
      );
    }

    await prisma.taxGroup.delete({ where: { id: existing.id } });
    await writeAudit(req, "TAX_GROUP_DELETED", "TaxGroup", existing.id, {
      name: existing.name,
    });
    res.json({ success: true, message: "Tax group deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tax-groups/seed-defaults
 * Owner-initiated re-seed of default tax groups. Only adds missing ones.
 */
const seedDefaults = async (req, res, next) => {
  try {
    // Count existing system seeds
    const existing = await prisma.taxGroup.findMany({
      where: { restaurantId: req.restaurantId },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((g) => g.name));

    const toCreate = DEFAULT_SEEDS.filter((s) => !existingNames.has(s.name)).map(
      (s) => ({ ...s, restaurantId: req.restaurantId })
    );

    if (toCreate.length === 0) {
      return res.json({
        success: true,
        message: "All default tax groups already exist",
        created: 0,
      });
    }

    await prisma.taxGroup.createMany({ data: toCreate, skipDuplicates: true });
    await writeAudit(req, "TAX_GROUPS_SEEDED", "TaxGroup", req.restaurantId, {
      count: toCreate.length,
    });

    res.json({
      success: true,
      message: `${toCreate.length} default tax group(s) created`,
      created: toCreate.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listTaxGroups,
  listStatePresets,
  createTaxGroup,
  updateTaxGroup,
  deleteTaxGroup,
  seedDefaults,
  seedDefaultTaxGroups, // exported for use in restaurantController on approval
};
