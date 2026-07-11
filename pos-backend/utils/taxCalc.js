/**
 * taxCalc.js — Restaurant POS Tax Calculation Engine
 *
 * Supports all Indian restaurant tax scenarios:
 *   GST      → CGST + SGST applied on top of (discounted) price
 *   VAT      → State VAT applied on top of price (alcohol)
 *   INCLUDED → Tax already inside MRP, back-calculated
 *   EXEMPT   → No tax at all
 *
 * All functions are pure (no side effects) and work on plain numbers.
 * The discount is always applied BEFORE tax — correct per Indian GST law.
 */

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * Calculate per-line-item tax amounts.
 *
 * @param {object} params
 * @param {number} params.price       - Unit price (MRP for INCLUDED type)
 * @param {number} params.quantity    - Quantity ordered
 * @param {object|null} params.taxGroup  - TaxGroup from DB (or null if unassigned)
 * @param {number} [params.discountFactor=1] - (subtotalAfterDiscount / subtotal) ratio,
 *   applied proportionally to each item's base before computing tax.
 *   Pass 1 (default) for no discount.
 *
 * @returns {{
 *   lineBase: number,   // qty × unit price (gross, pre-discount)
 *   taxBase:  number,   // amount actually taxed (post-discount, excl. tax for GST/VAT)
 *   cgstAmt:  number,
 *   sgstAmt:  number,
 *   igstAmt:  number,
 *   vatAmt:   number,
 *   taxAmt:   number,   // total tax on this line
 *   lineTotal: number,  // what the customer pays for this line (taxBase + taxAmt)
 *   isMrpItem: boolean,
 *   taxType:  string,   // "GST" | "VAT" | "INCLUDED" | "EXEMPT" | "UNASSIGNED"
 *   cgstRate: number,
 *   sgstRate: number,
 *   igstRate: number,
 *   vatRate:  number,
 * }}
 */
function calcItemTax({ price, quantity, taxGroup, discountFactor = 1 }) {
  const lineBase = roundMoney(price * quantity);

  const empty = {
    lineBase,
    taxBase: 0,
    cgstAmt: 0,
    sgstAmt: 0,
    igstAmt: 0,
    vatAmt: 0,
    taxAmt: 0,
    lineTotal: roundMoney(lineBase * discountFactor),
    isMrpItem: false,
    taxType: "UNASSIGNED",
    cgstRate: 0,
    sgstRate: 0,
    igstRate: 0,
    vatRate: 0,
  };

  if (!taxGroup || taxGroup.type === "EXEMPT") {
    return {
      ...empty,
      taxType: taxGroup ? "EXEMPT" : "UNASSIGNED",
      lineTotal: roundMoney(lineBase * discountFactor),
    };
  }

  if (taxGroup.type === "INCLUDED") {
    // MRP: The customer always pays the MRP price (discountFactor has no effect on
    // the price paid, but the tax back-calculation is on the discounted MRP).
    // Per GST rules: for MRP items sold at MRP, price = base + tax already.
    const totalRate = Number(taxGroup.cgst) + Number(taxGroup.sgst);
    const paidAmount = roundMoney(lineBase * discountFactor); // what customer pays
    const taxAmt = totalRate > 0
      ? roundMoney((paidAmount * totalRate) / (100 + totalRate))
      : 0;
    const cgstAmt = roundMoney(taxAmt / 2);
    const sgstAmt = roundMoney(taxAmt - cgstAmt);
    const taxBase = roundMoney(paidAmount - taxAmt);
    return {
      lineBase,
      taxBase,
      cgstAmt,
      sgstAmt,
      igstAmt: 0,
      vatAmt: 0,
      taxAmt,
      lineTotal: paidAmount,
      isMrpItem: true,
      taxType: "INCLUDED",
      cgstRate: Number(taxGroup.cgst),
      sgstRate: Number(taxGroup.sgst),
      igstRate: 0,
      vatRate: 0,
    };
  }

  if (taxGroup.type === "VAT") {
    // Alcohol: VAT is charged ON TOP of discounted price
    const taxBase = roundMoney(lineBase * discountFactor);
    const vatRate = Number(taxGroup.vatRate);
    const vatAmt = roundMoney((taxBase * vatRate) / 100);
    return {
      lineBase,
      taxBase,
      cgstAmt: 0,
      sgstAmt: 0,
      igstAmt: 0,
      vatAmt,
      taxAmt: vatAmt,
      lineTotal: roundMoney(taxBase + vatAmt),
      isMrpItem: false,
      taxType: "VAT",
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      vatRate,
    };
  }

  if (taxGroup.type === "GST") {
    // Standard food / restaurant GST: charged ON TOP of discounted price
    const taxBase = roundMoney(lineBase * discountFactor);
    const cgstRate = Number(taxGroup.cgst);
    const sgstRate = Number(taxGroup.sgst);
    const igstRate = Number(taxGroup.igst);
    const cgstAmt = roundMoney((taxBase * cgstRate) / 100);
    const sgstAmt = roundMoney((taxBase * sgstRate) / 100);
    const igstAmt = roundMoney((taxBase * igstRate) / 100);
    const taxAmt = roundMoney(cgstAmt + sgstAmt + igstAmt);
    return {
      lineBase,
      taxBase,
      cgstAmt,
      sgstAmt,
      igstAmt,
      vatAmt: 0,
      taxAmt,
      lineTotal: roundMoney(taxBase + taxAmt),
      isMrpItem: false,
      taxType: "GST",
      cgstRate,
      sgstRate,
      igstRate,
      vatRate: 0,
    };
  }

  // Unknown type — treat as exempt
  return { ...empty, taxType: "EXEMPT", lineTotal: roundMoney(lineBase * discountFactor) };
}

/**
 * Compute discount amount and the resulting discount factor.
 * Discount is always applied BEFORE tax (per GST law § 15(3)(a)).
 *
 * @param {number} subtotal         - Sum of (price × qty) for all items
 * @param {object|null} discount    - { type: "FLAT"|"PERCENT", value: number } or null
 * @returns {{ discountAmt: number, discountFactor: number, taxableSubtotal: number }}
 */
function applyDiscount(subtotal, discount) {
  if (!discount || !discount.value || discount.value <= 0) {
    return { discountAmt: 0, discountFactor: 1, taxableSubtotal: roundMoney(subtotal) };
  }

  let discountAmt = 0;
  if (discount.type === "FLAT") {
    discountAmt = roundMoney(Math.min(Number(discount.value), subtotal));
  } else if (discount.type === "PERCENT") {
    const pct = Math.min(Number(discount.value), 100);
    discountAmt = roundMoney((subtotal * pct) / 100);
  }

  const taxableSubtotal = roundMoney(subtotal - discountAmt);
  const discountFactor = subtotal > 0 ? taxableSubtotal / subtotal : 1;
  return { discountAmt, discountFactor, taxableSubtotal };
}

/**
 * Compute full order totals given normalized items (with taxGroup attached) and
 * an optional discount.
 *
 * @param {Array<{ price: number, quantity: number, taxGroup: object|null }>} items
 * @param {object|null} discount   - { type: "FLAT"|"PERCENT", value: number }
 * @returns {{
 *   subtotal: number,
 *   discountAmt: number,
 *   discountFactor: number,
 *   taxableSubtotal: number,
 *   cgstTotal: number,
 *   sgstTotal: number,
 *   igstTotal: number,
 *   vatTotal: number,
 *   taxTotal: number,
 *   totalWithTax: number,
 *   itemBreakdowns: Array  // per-item tax breakdown to save in OrderItem
 * }}
 */
function calcOrderTotals(items, discount = null) {
  // 1. Compute gross subtotal (MRP items: their MRP IS the price)
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  );

  // 2. Apply discount to get taxable base
  const { discountAmt, discountFactor, taxableSubtotal } = applyDiscount(subtotal, discount);

  // 3. Per-item tax
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let vatTotal = 0;
  let totalWithTax = 0;

  const itemBreakdowns = items.map((item) => {
    const breakdown = calcItemTax({
      price: Number(item.price),
      quantity: item.quantity,
      taxGroup: item.taxGroup || null,
      discountFactor,
    });
    cgstTotal += breakdown.cgstAmt;
    sgstTotal += breakdown.sgstAmt;
    igstTotal += breakdown.igstAmt;
    vatTotal += breakdown.vatAmt;
    totalWithTax += breakdown.lineTotal;
    return breakdown;
  });

  cgstTotal = roundMoney(cgstTotal);
  sgstTotal = roundMoney(sgstTotal);
  igstTotal = roundMoney(igstTotal);
  vatTotal = roundMoney(vatTotal);
  totalWithTax = roundMoney(totalWithTax);
  const taxTotal = roundMoney(cgstTotal + sgstTotal + igstTotal + vatTotal);

  return {
    subtotal,
    discountAmt,
    discountFactor,
    taxableSubtotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    vatTotal,
    taxTotal,
    totalWithTax,
    itemBreakdowns,
  };
}

module.exports = { calcItemTax, applyDiscount, calcOrderTotals, roundMoney };
