# India GST Tax System — How It Works in This POS

> **Who should read this?**
> Restaurant owners, managers, and developers working on this system.
> No prior knowledge of tax law required for the first half — the technical section is clearly marked.

---

## Part 1 — India's Tax System for Restaurants (Plain English)

### What is GST?

GST (Goods and Services Tax) is India's unified indirect tax that replaced multiple old taxes (VAT, service tax, octroi, etc.) on **1 July 2017**.

The government collects it at every point of sale. The end customer pays it, and the business collects it on behalf of the government and deposits it monthly.

**Key idea:** GST is not a cost to the business — it's collected from the customer and passed on. The restaurant's job is to:
1. Charge the correct GST rate
2. Record it accurately per bill
3. Pay it to the government monthly (via GSTR-1 filing by the 11th)

---

### How GST is Split

GST is always split **50/50** between the Central and State governments:

| What you see | What it means |
|---|---|
| **CGST** | Central GST → goes to Government of India |
| **SGST** | State GST → goes to your State Government |
| **IGST** | Integrated GST → applies only for inter-state sales (not relevant for dine-in restaurants) |

**Example:** A dish costs ₹100 with 5% GST.
- Customer pays ₹105
- Of the ₹5 tax: ₹2.50 → Central Govt (CGST), ₹2.50 → State Govt (SGST)

---

### GST Rates for Restaurants

India has different GST slabs for different restaurant types. Your POS handles all of them:

| Restaurant Type | GST Rate | CGST | SGST | Notes |
|---|---|---|---|---|
| Non-AC / small restaurant | **5%** | 2.5% | 2.5% | Most common for small eateries. Cannot claim input tax credit. |
| AC restaurant or hotel restaurant | **18%** | 9% | 9% | Applies if your restaurant has AC seating. |
| Packaged/labelled food sold | **5–12%** | varies | varies | Pre-packaged items sold across the counter |
| Bakery items | **5–18%** | varies | varies | Depends on whether prepared in-house or packaged |
| Non-alcoholic beverages (Coke, Pepsi, packaged water) | **18% (incl.)** | 9% | 9% | Tax is already inside the MRP — see below |
| Exempt items | **0%** | 0% | 0% | Fresh vegetables, basic food items |

> ⚠️ **Important 2023 rule:** Restaurants serving food in an AC room AND also having a liquor licence are taxed at **18%** (not 5%) on the food too. Always confirm your category with your CA.

---

### The MRP Problem — Packaged Drinks

This is one of the most confusing things for restaurant owners.

When you sell a **packaged product** (a Coke can, a beer can, bottled water), the price printed on it is the **MRP (Maximum Retail Price)**. By law:
- You **cannot charge more than MRP**
- The MRP **already includes the GST** inside it

So if a Coke can has MRP ₹40 with 18% GST, you don't charge ₹40 + 18% tax = ₹47.20. You charge exactly **₹40**, and the ₹40 includes the tax.

**How to extract the tax from the MRP:**

```
GST inside = MRP × Rate / (100 + Rate)
Taxable base = MRP - GST inside

Example: Coke MRP ₹40, 18% GST
GST = 40 × 18 / 118 = ₹6.10
Taxable base = 40 - 6.10 = ₹33.90
CGST = ₹3.05, SGST = ₹3.05
```

This POS does this automatically when you mark an item as **"MRP Inclusive"**.

---

### Alcohol — VAT, Not GST

**Alcohol is NOT under GST.** This is a common misconception.

Alcoholic beverages (beer, wine, spirits) are taxed under **State Excise + VAT**, which is different in every state:

| State | Beer VAT | Wine VAT | Spirits VAT |
|---|---|---|---|
| Maharashtra | 20% | 100% | 300% |
| Goa | 12% | 12% | 25% |
| Karnataka | 20% | 20% | 80% |
| Delhi | 20% | 25% | 65% |
| Kerala | 15% | 30% | 210% |
| Tamil Nadu | 39% | 39% | 39% |
| Rajasthan | 30% | 35% | 65% |
| Gujarat | — | — | — (Dry state) |
| Bihar | — | — | — (Dry state) |
| Manipur | — | — | — (Dry state) |

This POS stores alcohol VAT rates as a **VAT Tax Group** (separate from GST). The VAT amounts appear on the bill and in the CSV export for your CA, but they are **excluded from the GSTR-1 filing** because the government handles alcohol tax through a completely separate system.

---

### The Discount Rule

By Indian GST law (Section 15(3) of the CGST Act), discounts are applied **before calculating tax**:

```
Wrong way (illegal): ₹100 × 18% = ₹118 → apply 10% discount → ₹106.20
Correct way (legal): ₹100 - 10% = ₹90 → ₹90 × 18% = ₹106.20
```

Numerically they come out the same on a single item, but the taxable value reported to the government must be the post-discount amount. This POS does this correctly.

---

### GSTR-1 — What It Is and What You Need to Do

**GSTR-1** is a monthly statement of all outward sales you made. For a restaurant:
- Due by the **11th of every month** (for the previous month)
- Filed on the **GST Portal** (gst.gov.in)
- Contains: total sales grouped by tax rate, HSN/SAC codes, and invoice count

**You (as a restaurant) are purely B2C** — you sell to end consumers, not to other businesses. This simplifies things enormously:
- You don't need to capture customers' GSTINs
- All sales go into the **B2CS (B2C Small)** table in GSTR-1
- From May 2025, you also need to fill **Table 12 (HSN Summary)** and **Table 13 (Invoice count)**

**How filing works in practice:**
1. At end of month, go to **Analytics → GST Report** in this POS
2. Download the **GSTR-1 JSON file**
3. Open the **GST Offline Tool** (free download from gst.gov.in)
4. Import the JSON into the tool
5. Review and upload to the GST portal
6. Or send the JSON to your CA — they'll do it for you

> **We do NOT file directly** to the GST portal. Direct filing requires becoming a GSP (GST Suvidha Provider) — a separate legal registration with GSTN. Petpooja, Posist, and all major restaurant POS systems also generate a JSON file for the accountant to upload. That's exactly what this system does.

---

### HSN / SAC Codes

Every product/service sold in India must have a code from the government's classification list:

| Type | Code | Description |
|---|---|---|
| Restaurant service (food cooked and served) | **9963** | SAC (Service Accounting Code) |
| Outdoor catering | **996334** | SAC |
| Packaged beverages (Coke, Pepsi, beer cans) | **2202** | HSN (Harmonized System of Nomenclature) |
| Packaged food (chips, namkeen) | **2106** | HSN |
| Bottled water | **2201** | HSN |

These codes appear on the invoice and in the GSTR-1 HSN summary. This POS lets you assign an HSN/SAC code to each menu item (or to each Tax Group). If an item has no HSN code, the system defaults to `9963` (restaurant service).

---

## Part 2 — How This POS Implements It

### The Tax Group System

Instead of setting a tax rate on every single menu item individually, this POS uses **Tax Groups** — reusable tax profiles that you create once and assign to many items.

**Example Tax Groups:**

| Name | Type | Rate | Used for |
|---|---|---|---|
| GST 5% (Food) | GST | 5% (2.5+2.5) | Dine-in food dishes |
| GST 18% (Hotel/AC) | GST | 18% (9+9) | If you have AC seating |
| MRP Incl. 18% (Packaged Drinks) | INCLUDED | 18% | Coke, Pepsi, juice cans |
| Alcohol VAT - Maharashtra | VAT | 20% | Beer, wine (Maharashtra) |
| Exempt | EXEMPT | 0% | Items with no tax |

**Manage Tax Groups:** Settings → Taxes

---

### Tax Types in Detail

#### Type: `GST`
Standard GST charged **on top of** the menu price.

```
Customer sees: ₹100 + ₹5 GST = ₹105
Bill shows: Base ₹100 | CGST 2.5% ₹2.50 | SGST 2.5% ₹2.50 | Total ₹105
```

#### Type: `INCLUDED` (MRP Items)
Tax is **already inside the price**. Used for packaged products sold at MRP.

```
Customer sees: ₹40 (that's it — no extra tax added)
Bill shows: MRP ₹40 | CGST* ₹3.05 | SGST* ₹3.05 | Base ₹33.90
            * extracted from MRP, not added on top
```

Enable this by checking **"MRP Inclusive (Packaged)"** on the menu item.

#### Type: `VAT`
State VAT charged **on top of** the price. Used for alcohol.

```
Customer sees: ₹200 (beer) + ₹40 VAT (20%) = ₹240
Bill shows: Base ₹200 | VAT 20% ₹40 | Total ₹240
```

#### Type: `EXEMPT`
No tax at all. Shown on bill as ₹0.

---

### How Tax Flows Through an Order

```
1. WAITER adds items to order
        ↓
2. SYSTEM reads taxGroup attached to each MenuItem
        ↓
3. Discount applied FIRST (if any) → discountFactor = postDiscount / preDiscount
        ↓
4. calcItemTax() runs per item:
   - GST/VAT: tax = taxBase × rate
   - INCLUDED (MRP): tax = MRP × rate / (100 + rate) [back-calc]
        ↓
5. calcOrderTotals() sums up: CGST, SGST, VAT, Grand Total
        ↓
6. ORDER SAVED: all tax amounts snapshot to OrderItem columns
   (cgstAmt, sgstAmt, vatAmt, taxAmt, cgstRate, sgstRate, hsnCode, etc.)
        ↓
7. BILL PRINTED: Invoice.jsx reads the snapshot, shows breakdown
        ↓
8. PAYMENT: order marked PAID
        ↓
9. GSTR EXPORT: at month end, analytics/gstr aggregates all
   paid OrderItems → builds GSTR-1 JSON
```

**Why snapshot at step 6?** If you change a tax rate next month, old invoices must still show the rate that was in effect when the customer paid. The snapshot preserves this history.

---

### Database Schema — Tax-Related Fields

```
TaxGroup
├── id, name, restaurantId
├── type        — "GST" | "VAT" | "INCLUDED" | "EXEMPT"
├── cgst        — CGST % (e.g. 2.5)
├── sgst        — SGST % (e.g. 2.5)
├── igst        — IGST % (usually cgst + sgst)
├── vatRate     — VAT % for alcohol (e.g. 20)
├── hsnSacCode  — e.g. "9963" or "2202"
├── isDefault   — auto-selected for new menu items
└── isSystem    — pre-seeded by system, can't be deleted

MenuItem
├── taxGroupId  → TaxGroup (FK)
├── isMrpItem   — true = price is MRP inclusive of tax
└── hsnCode     — item-level override of HSN (optional)

OrderItem (tax snapshot — permanent record)
├── taxType     — copied from TaxGroup.type at order time
├── cgstRate, sgstRate, igstRate, vatRate
├── cgstAmt, sgstAmt, igstAmt, vatAmt, taxAmt
├── hsnCode     — copied from MenuItem at order time
└── isMrpItem   — copied from MenuItem at order time

Restaurant
├── gstin       — 15-char GSTIN (for GSTR-1 JSON header)
└── stateCode   — 2-digit state code (for Place of Supply field)
```

---

### GSTR-1 JSON Export — Technical Details

**Endpoint:** `GET /api/analytics/gstr/json?month=YYYY-MM`

**File:** `pos-backend/utils/gstrBuilder.js`

The JSON file follows the official GSTN schema (v4.1, updated May 2025):

```json
{
  "gstin": "27AABCU9603R1ZX",
  "ret_period": "072026",
  "b2cs": [
    {
      "sply_ty": "INTRA",
      "pos": "27",
      "rt": 5,
      "txval": 145000.00,
      "camt": 3625.00,
      "samt": 3625.00,
      "iamt": 0,
      "csamt": 0
    }
  ],
  "hsn": {
    "data": [
      {
        "hsn_sc": "9963",
        "desc": "Restaurant / catering services",
        "uqc": "OTH",
        "qty": 0,
        "val": 145000.00,
        "txval": 145000.00,
        "iamt": 0,
        "camt": 3625.00,
        "samt": 3625.00,
        "csamt": 0
      }
    ]
  },
  "doc_det": [
    {
      "doc_num": 1,
      "doc_typ": "Invoices",
      "from": "1001",
      "to": "1498",
      "totnum": 498,
      "cancel": 3,
      "net_issue": 495
    }
  ]
}
```

| JSON field | Source in DB |
|---|---|
| `gstin` | `Restaurant.gstin` |
| `ret_period` | Derived from month query param |
| `b2cs[].txval` | Sum of `OrderItem.price × qty - taxAmt` (taxable value) |
| `b2cs[].camt` | Sum of `OrderItem.cgstAmt` |
| `b2cs[].samt` | Sum of `OrderItem.sgstAmt` |
| `b2cs[].rt` | `(cgstRate + sgstRate) × 2` |
| `b2cs[].pos` | `Restaurant.stateCode` |
| `hsn.data[].hsn_sc` | `OrderItem.hsnCode` (or default `9963`) |
| `doc_det[].totnum` | Count of PAID orders |
| `doc_det[].cancel` | Count of CANCELLED orders |

**What's intentionally excluded from the JSON:**
- **VAT amounts** — alcohol VAT is a state excise matter, not in GST
- **EXEMPT items** — zero tax, not reportable as GST

**Both are included in the CSV** for the accountant's reference.

---

### CSV Export

**Endpoint:** `GET /api/analytics/gstr/csv?month=YYYY-MM`

Produces a spreadsheet-ready file with:
- One row per tax rate / HSN code combination
- Separate section for Alcohol VAT (with note to file separately)
- Import-ready for Tally, Busy, Marg, etc.

---

### Key Files Reference

```
pos-backend/
├── utils/
│   ├── taxCalc.js              ← Core tax math (pure functions)
│   ├── gstrBuilder.js          ← Builds GSTR-1 JSON + CSV string
│   └── indiaStateTaxPresets.js ← VAT rates for all 36 states
├── controllers/
│   ├── taxGroupController.js   ← CRUD + seed default tax groups
│   ├── gstrController.js       ← Aggregation + download endpoints
│   └── orderController.js      ← Applies tax snapshot at order save
├── routes/
│   ├── taxGroupRoute.js        ← /api/tax-groups
│   └── gstrRoute.js            ← /api/analytics/gstr
└── prisma/schema.prisma        ← TaxGroup, MenuItem, OrderItem, Restaurant models

pos-frontend/src/
├── pages/
│   ├── Settings.jsx            ← Tax Groups management + GSTIN/state settings
│   └── Analytics.jsx           ← GST Report tab with download buttons
├── components/
│   ├── dashboard/
│   │   ├── MenuModal.jsx       ← Tax Group selector when adding/editing dishes
│   │   └── MenuManagement.jsx  ← Shows tax badge on each dish card
│   └── orders/
│       └── Invoice.jsx         ← Bill printout with CGST/SGST breakdown
```

---

## Part 3 — Owner Checklist

### One-time setup (do this once)

- [ ] Go to **Settings → Taxes** → click "Load Defaults" to auto-create the standard Indian tax groups
- [ ] Go to **Settings → Restaurant Profile** → enter your **GSTIN** (15 characters) and **State Code**
- [ ] Edit each menu item — assign the correct **Tax Group** from the dropdown
- [ ] For packaged drinks (Coke, beer cans), enable **"MRP Inclusive"** on the item

### Monthly (by 11th of each month)

- [ ] Go to **Analytics → GST Report**
- [ ] Select the previous month
- [ ] Verify the CGST and SGST totals match your rough expectation
- [ ] Click **"Download GSTR-1 JSON"**
- [ ] Send JSON to your CA **or** import into GST Offline Tool and upload yourself
- [ ] Also download **CSV** for your own records and for reconciliation

### Things your CA will appreciate

- Separate VAT line in the CSV for alcohol
- HSN/SAC codes printed on every invoice
- Invoice serial number range in the JSON (doc_det table)
- Discount pre-tax (correct per Section 15(3))

---

## Part 4 — Common Questions

**Q: I serve both AC and non-AC customers. Which rate do I use?**
A: If your restaurant has AC seating available (even in part), the entire bill is at 18%. Create two tax groups — use the correct one based on your registration. Ask your CA to confirm how your restaurant is registered.

**Q: My GSTIN starts with state code 29 (Karnataka) but I'm in Bangalore. Is that right?**
A: Yes. Karnataka = 29. The state code in your GSTIN's first two digits must match the state code you set in Settings.

**Q: Do I need GST registration?**
A: If your annual turnover exceeds **₹20 lakhs** (₹10 lakhs in special category states like North-East), GST registration is mandatory. Below that, it's optional. If you're not registered, don't set a GSTIN and disable GST on all items.

**Q: A customer asks for a GST invoice. Can I give them one?**
A: Yes — every bill this system generates shows CGST/SGST breakdown and HSN codes. That IS a valid GST bill. For B2B customers who want to claim input credit, they'll need your GSTIN on the bill — which is already printed if you've set it in Settings.

**Q: The VAT rates for alcohol in the state presets seem high. Are they right?**
A: Yes. India has some of the highest alcohol taxes in the world. Maharashtra wine can be taxed at 100% VAT — that's ₹100 VAT on every ₹100 bottle. Always verify with your state excise office or CA for the exact current rate, as rates change.

---

*Last updated: July 2026 | Applies to India GST law as of Finance Act 2025-26*
