/**
 * indiaStateTaxPresets.js
 *
 * State-wise alcohol VAT / Excise Duty approximate rates for India (2026).
 * These are used as presets in the Tax Settings UI so owners can pick their
 * state and get the correct starting rate instead of guessing.
 *
 * IMPORTANT: Rates change via state budgets. Always verify with your CA.
 * Rates are the blended effective VAT on beer/wine/spirits for restaurants.
 */

const INDIA_STATE_VAT_PRESETS = [
  // Union Territories
  { state: "Andaman & Nicobar Islands", beerVat: 25, wineVat: 25, spiritsVat: 30 },
  { state: "Chandigarh",                beerVat: 22, wineVat: 22, spiritsVat: 30 },
  { state: "Dadra & Nagar Haveli",      beerVat: 20, wineVat: 20, spiritsVat: 25 },
  { state: "Daman & Diu",               beerVat: 20, wineVat: 20, spiritsVat: 25 },
  { state: "Delhi",                     beerVat: 20, wineVat: 25, spiritsVat: 35 },
  { state: "Jammu & Kashmir",           beerVat: 23, wineVat: 23, spiritsVat: 30 },
  { state: "Ladakh",                    beerVat: 23, wineVat: 23, spiritsVat: 30 },
  { state: "Lakshadweep",               beerVat: 0,  wineVat: 0,  spiritsVat: 0  }, // dry UT
  { state: "Puducherry",                beerVat: 10, wineVat: 15, spiritsVat: 20 },

  // States
  { state: "Andhra Pradesh",            beerVat: 32, wineVat: 32, spiritsVat: 40 },
  { state: "Arunachal Pradesh",         beerVat: 25, wineVat: 25, spiritsVat: 30 },
  { state: "Assam",                     beerVat: 25, wineVat: 25, spiritsVat: 35 },
  { state: "Bihar",                     beerVat: 0,  wineVat: 0,  spiritsVat: 0  }, // prohibition
  { state: "Chhattisgarh",              beerVat: 28, wineVat: 28, spiritsVat: 35 },
  { state: "Goa",                       beerVat: 12, wineVat: 12, spiritsVat: 25 },
  { state: "Gujarat",                   beerVat: 0,  wineVat: 0,  spiritsVat: 0  }, // prohibition
  { state: "Haryana",                   beerVat: 25, wineVat: 25, spiritsVat: 33 },
  { state: "Himachal Pradesh",          beerVat: 27, wineVat: 27, spiritsVat: 35 },
  { state: "Jharkhand",                 beerVat: 26, wineVat: 26, spiritsVat: 35 },
  { state: "Karnataka",                 beerVat: 20, wineVat: 20, spiritsVat: 30 },
  { state: "Kerala",                    beerVat: 15, wineVat: 15, spiritsVat: 30 },
  { state: "Madhya Pradesh",            beerVat: 30, wineVat: 30, spiritsVat: 40 },
  { state: "Maharashtra",               beerVat: 25, wineVat: 25, spiritsVat: 35 },
  { state: "Manipur",                   beerVat: 25, wineVat: 25, spiritsVat: 30 },
  { state: "Meghalaya",                 beerVat: 22, wineVat: 22, spiritsVat: 30 },
  { state: "Mizoram",                   beerVat: 0,  wineVat: 0,  spiritsVat: 0  }, // partial prohibition
  { state: "Nagaland",                  beerVat: 0,  wineVat: 0,  spiritsVat: 0  }, // prohibition
  { state: "Odisha",                    beerVat: 28, wineVat: 28, spiritsVat: 35 },
  { state: "Punjab",                    beerVat: 22, wineVat: 22, spiritsVat: 30 },
  { state: "Rajasthan",                 beerVat: 30, wineVat: 30, spiritsVat: 40 },
  { state: "Sikkim",                    beerVat: 22, wineVat: 22, spiritsVat: 28 },
  { state: "Tamil Nadu",                beerVat: 37, wineVat: 37, spiritsVat: 45 },
  { state: "Telangana",                 beerVat: 30, wineVat: 30, spiritsVat: 40 },
  { state: "Tripura",                   beerVat: 25, wineVat: 25, spiritsVat: 30 },
  { state: "Uttar Pradesh",             beerVat: 25, wineVat: 25, spiritsVat: 35 },
  { state: "Uttarakhand",               beerVat: 27, wineVat: 27, spiritsVat: 35 },
  { state: "West Bengal",               beerVat: 28, wineVat: 28, spiritsVat: 35 },
];

/**
 * Get the preset for a given state name.
 * @param {string} stateName
 * @returns {object|null}
 */
function getStatePreset(stateName) {
  if (!stateName) return null;
  return (
    INDIA_STATE_VAT_PRESETS.find(
      (p) => p.state.toLowerCase() === stateName.toLowerCase()
    ) || null
  );
}

module.exports = { INDIA_STATE_VAT_PRESETS, getStatePreset };
