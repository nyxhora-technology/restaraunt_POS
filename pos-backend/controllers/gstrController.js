/**
 * gstrController.js
 *
 * Handles GSTR analytics and export endpoints.
 * GET /api/analytics/gstr        — monthly summary JSON
 * GET /api/analytics/gstr/json   — downloadable GSTR-1 JSON file
 * GET /api/analytics/gstr/csv    — downloadable CSV for accountant
 */

const prisma = require("../config/prisma");
const { buildGstr1Json, buildGstrCsv, STATE_CODES } = require("../utils/gstrBuilder");
const dayjs = require("dayjs");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Parses ?month=YYYY-MM query param. Defaults to previous month.
 */
function parseMonth(query) {
  const raw = query?.month;
  let d;
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    d = dayjs(raw + "-01");
  } else {
    d = dayjs().subtract(1, "month").startOf("month");
  }
  const start = d.startOf("month").toDate();
  const end = d.endOf("month").toDate();
  const period = d.format("MMYYYY"); // GSTN format: "072026"
  return { start, end, period, label: d.format("MMMM YYYY") };
}

/**
 * Core aggregation — groups paid OrderItems by CGST/SGST rate + HSN code.
 * Returns GST rows and VAT total separately.
 */
async function aggregateTaxByMonth(restaurantId, start, end) {
  // Raw aggregation using groupBy on OrderItem
  const gstRows = await prisma.orderItem.groupBy({
    by: ["cgstRate", "sgstRate", "hsnCode"],
    where: {
      order: {
        restaurantId,
        paymentStatus: "PAID",
        createdAt: { gte: start, lte: end },
      },
      taxType: { in: ["GST", "INCLUDED"] },
    },
    _sum: {
      cgstAmt: true,
      sgstAmt: true,
      taxAmt: true,
    },
    _count: { orderId: true },
    // taxable value = price * quantity for items that are NOT MRP (tax on top)
    // For MRP items the taxableValue = lineTotal - taxAmt
  });

  // We also need taxable value per group — aggregate separately
  // (Prisma groupBy _sum doesn't support expressions, so we pull totals another way)
  const taxableRows = await Promise.all(
    gstRows.map(async (row) => {
      const agg = await prisma.orderItem.aggregate({
        where: {
          order: {
            restaurantId,
            paymentStatus: "PAID",
            createdAt: { gte: start, lte: end },
          },
          taxType: { in: ["GST", "INCLUDED"] },
          cgstRate: row.cgstRate,
          sgstRate: row.sgstRate,
          hsnCode: row.hsnCode,
        },
        _sum: { price: true, quantity: true },
      });

      // Taxable value = sum(price * quantity) - sum(taxAmt)  [for GST on top]
      // For INCLUDED items taxable value = gross - tax_back_calculated
      // We approximate as lineTotal minus tax for both types
      const grossApprox = (agg._sum.price || 0) * 1; // note: price is per-unit
      // More accurate: fetch and sum manually
      const items = await prisma.orderItem.findMany({
        where: {
          order: {
            restaurantId,
            paymentStatus: "PAID",
            createdAt: { gte: start, lte: end },
          },
          taxType: { in: ["GST", "INCLUDED"] },
          cgstRate: row.cgstRate,
          sgstRate: row.sgstRate,
          hsnCode: row.hsnCode,
        },
        select: { price: true, quantity: true, taxAmt: true },
      });

      const gross = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
      const tax = items.reduce((s, i) => s + Number(i.taxAmt), 0);
      const taxableValue = round2(gross - tax);

      return {
        cgstRate: Number(row.cgstRate),
        sgstRate: Number(row.sgstRate),
        hsnCode: row.hsnCode || "9963",
        cgstTotal: round2(row._sum.cgstAmt || 0),
        sgstTotal: round2(row._sum.sgstAmt || 0),
        taxTotal: round2(row._sum.taxAmt || 0),
        taxableValue: round2(taxableValue),
        orders: row._count.orderId,
      };
    })
  );

  // VAT total — separate, not in GSTR-1 JSON
  const vatAgg = await prisma.orderItem.aggregate({
    where: {
      order: {
        restaurantId,
        paymentStatus: "PAID",
        createdAt: { gte: start, lte: end },
      },
      taxType: "VAT",
    },
    _sum: { vatAmt: true },
    _count: { orderId: true },
  });

  // Invoice range from Order table
  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      paymentStatus: "PAID",
      createdAt: { gte: start, lte: end },
    },
    select: { orderNo: true },
    orderBy: { orderNo: "asc" },
  });
  const cancelledCount = await prisma.order.count({
    where: {
      restaurantId,
      orderStatus: "CANCELLED",
      createdAt: { gte: start, lte: end },
    },
  });

  const invoiceRange = {
    from: orders[0]?.orderNo ?? 1,
    to: orders[orders.length - 1]?.orderNo ?? 1,
    total: orders.length,
    cancelled: cancelledCount,
  };

  return {
    summary: taxableRows,
    vatSummary: {
      totalVatCollected: round2(vatAgg._sum.vatAmt || 0),
      orders: vatAgg._count.orderId || 0,
    },
    invoiceRange,
  };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/gstr?month=YYYY-MM
 * Returns the monthly GST summary for display in Analytics.
 */
const getGstrSummary = async (req, res, next) => {
  try {
    const { start, end, period, label } = parseMonth(req.query);
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurantId },
      select: { gstin: true, stateCode: true, name: true },
    });

    const { summary, vatSummary, invoiceRange } = await aggregateTaxByMonth(
      req.restaurantId,
      start,
      end
    );

    const totalTaxableValue = round2(summary.reduce((s, r) => s + r.taxableValue, 0));
    const totalCgst = round2(summary.reduce((s, r) => s + r.cgstTotal, 0));
    const totalSgst = round2(summary.reduce((s, r) => s + r.sgstTotal, 0));
    const totalGst = round2(totalCgst + totalSgst);

    res.json({
      success: true,
      data: {
        period,
        label,
        gstin: restaurant?.gstin || null,
        stateCode: restaurant?.stateCode || null,
        stateName: STATE_CODES[restaurant?.stateCode] || null,
        summary,
        vatSummary,
        invoiceRange,
        totals: { totalTaxableValue, totalCgst, totalSgst, totalGst },
        gstinMissing: !restaurant?.gstin,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/gstr/json?month=YYYY-MM
 * Streams a downloadable GSTR-1 JSON file.
 */
const downloadGstrJson = async (req, res, next) => {
  try {
    const { start, end, period, label } = parseMonth(req.query);
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurantId },
      select: { gstin: true, stateCode: true },
    });

    if (!restaurant?.gstin) {
      return res
        .status(400)
        .json({ success: false, message: "GSTIN not configured. Set it in Settings before exporting." });
    }

    const { summary, invoiceRange } = await aggregateTaxByMonth(
      req.restaurantId,
      start,
      end
    );

    const json = buildGstr1Json({
      gstin: restaurant.gstin,
      period,
      summary,
      invoiceRange,
      stateCode: restaurant.stateCode || "27",
    });

    const filename = `GSTR1_${period}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(json, null, 2));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/gstr/csv?month=YYYY-MM
 * Streams a downloadable CSV file for the accountant.
 */
const downloadGstrCsv = async (req, res, next) => {
  try {
    const { start, end, period } = parseMonth(req.query);
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurantId },
      select: { gstin: true },
    });

    const { summary, vatSummary } = await aggregateTaxByMonth(
      req.restaurantId,
      start,
      end
    );

    const csv = buildGstrCsv({
      period,
      gstin: restaurant?.gstin || "NOT SET",
      summary,
      vatSummary,
    });

    const filename = `GST_Report_${period}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = { getGstrSummary, downloadGstrJson, downloadGstrCsv };
