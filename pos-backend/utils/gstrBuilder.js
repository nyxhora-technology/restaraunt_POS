/**
 * gstrBuilder.js
 *
 * Assembles GSTN-compatible GSTR-1 JSON and CSV strings
 * from the aggregated tax summary data.
 *
 * GSTR-1 schema reference: GSTN API v4.1 (May 2025 onwards)
 * Restaurants are purely B2C (supply to unregistered consumers).
 * Tables used: b2cs (T7), hsn (T12 - B2C), doc_det (T13).
 *
 * VAT on alcohol is deliberately EXCLUDED from GSTR-1 JSON —
 * it is a state excise matter and must be filed separately.
 */

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Indian state codes (01-38) — official GSTN list
const STATE_CODES = {
  "01": "Jammu and Kashmir",       "02": "Himachal Pradesh",
  "03": "Punjab",                   "04": "Chandigarh",
  "05": "Uttarakhand",              "06": "Haryana",
  "07": "Delhi",                    "08": "Rajasthan",
  "09": "Uttar Pradesh",            "10": "Bihar",
  "11": "Sikkim",                   "12": "Arunachal Pradesh",
  "13": "Nagaland",                 "14": "Manipur",
  "15": "Mizoram",                  "16": "Tripura",
  "17": "Meghalaya",                "18": "Assam",
  "19": "West Bengal",              "20": "Jharkhand",
  "21": "Odisha",                   "22": "Chhattisgarh",
  "23": "Madhya Pradesh",           "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",              "28": "Andhra Pradesh",
  "29": "Karnataka",                "30": "Goa",
  "31": "Lakshadweep",              "32": "Kerala",
  "33": "Tamil Nadu",               "34": "Puducherry",
  "35": "Andaman and Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh (new)",     "38": "Ladakh",
};

/**
 * Build the b2cs array (Table 7 — B2C Small Supplies).
 * One entry per (tax rate, state code) combination.
 * Only includes GST items (type GST or INCLUDED).
 */
function buildB2CS(summary, stateCode = "27") {
  return summary
    .filter((row) => row.taxableValue > 0)
    .map((row) => ({
      sply_ty: "INTRA",
      pos: stateCode,
      rt: round2((row.cgstRate + row.sgstRate) * 2), // total GST rate
      txval: round2(row.taxableValue),
      camt: round2(row.cgstTotal),
      samt: round2(row.sgstTotal),
      iamt: 0,
      csamt: 0,
    }));
}

/**
 * Build the hsn.data array (Table 12 — HSN Summary for B2C).
 * Groups by HSN/SAC code and sums taxable value + tax amounts.
 */
function buildHsn(summary) {
  // Group by hsnCode
  const groups = {};
  for (const row of summary) {
    const code = row.hsnCode || "9963"; // default SAC for restaurant service
    if (!groups[code]) {
      groups[code] = {
        hsn_sc: code,
        desc: code === "9963"
          ? "Restaurant / catering services"
          : code.startsWith("22")
          ? "Beverages / packaged drinks"
          : "Food item",
        uqc: "OTH",
        qty: 0,
        val: 0,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      };
    }
    groups[code].val = round2(groups[code].val + row.taxableValue);
    groups[code].txval = round2(groups[code].txval + row.taxableValue);
    groups[code].camt = round2(groups[code].camt + row.cgstTotal);
    groups[code].samt = round2(groups[code].samt + row.sgstTotal);
  }
  return Object.values(groups);
}

/**
 * Build the doc_det array (Table 13 — Document Summary, mandatory from May 2025).
 */
function buildDocDet(invoiceRange) {
  const from = String(invoiceRange.from || 1);
  const to = String(invoiceRange.to || 1);
  const totnum = invoiceRange.total || 0;
  const cancel = invoiceRange.cancelled || 0;
  return [
    {
      doc_num: 1,
      doc_typ: "Invoices",
      from,
      to,
      totnum,
      cancel,
      net_issue: totnum - cancel,
    },
  ];
}

/**
 * Assembles the complete GSTR-1 JSON object.
 */
function buildGstr1Json({ gstin, period, summary, invoiceRange, stateCode }) {
  const b2cs = buildB2CS(summary, stateCode);
  const hsnData = buildHsn(summary);
  const docDet = buildDocDet(invoiceRange);

  return {
    gstin,
    ret_period: period, // format: "MMYYYY" e.g. "072026"
    b2cs: b2cs.length > 0 ? b2cs : undefined,
    hsn: hsnData.length > 0 ? { data: hsnData } : undefined,
    doc_det: docDet,
  };
}

/**
 * Build a CSV string for the accountant.
 * Includes VAT as a separate section (NOT in GSTR-1 JSON).
 */
function buildGstrCsv({ period, gstin, summary, vatSummary }) {
  const lines = [];
  const month = `${period.slice(0, 2)}/${period.slice(2)}`;

  lines.push(`GSTR-1 Export — ${month}`);
  lines.push(`GSTIN,${gstin || "NOT SET"}`);
  lines.push(``);
  lines.push(`Section,HSN/SAC Code,Description,Tax Rate (%),Taxable Value (INR),CGST (INR),SGST (INR),Total GST (INR),Orders`);

  for (const row of summary) {
    const rate = round2((row.cgstRate + row.sgstRate) * 2);
    lines.push(
      [
        "B2C GST",
        row.hsnCode || "9963",
        row.hsnCode === "9963" || !row.hsnCode ? "Restaurant service" : "Packaged goods",
        rate,
        round2(row.taxableValue),
        round2(row.cgstTotal),
        round2(row.sgstTotal),
        round2(row.cgstTotal + row.sgstTotal),
        row.orders || "",
      ].join(",")
    );
  }

  if (vatSummary && vatSummary.totalVatCollected > 0) {
    lines.push(``);
    lines.push(`--- Alcohol VAT (NOT in GSTR-1 — file with State Excise) ---`);
    lines.push(`Section,Description,VAT Amount (INR),Note`);
    lines.push(
      `State VAT,Alcohol / Liquor,${round2(vatSummary.totalVatCollected)},File separately with state excise authority`
    );
  }

  return lines.join("\n");
}

module.exports = {
  buildGstr1Json,
  buildGstrCsv,
  STATE_CODES,
};
