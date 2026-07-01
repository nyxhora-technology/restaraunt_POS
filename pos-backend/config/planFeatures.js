/**
 * Plan feature definitions.
 * Each plan lists the feature keys it unlocks.
 * Higher plans include all lower plan features.
 */
const PLAN_FEATURES = {
  STARTER: ["CORE_POS"],
  PROFESSIONAL: ["CORE_POS", "INVENTORY", "QR_MENU"],
  ENTERPRISE: ["CORE_POS", "INVENTORY", "QR_MENU", "ADVANCED_ANALYTICS"],
};

const PLAN_LABELS = {
  STARTER: { label: "Starter", color: "#6b7280" },
  PROFESSIONAL: { label: "Professional", color: "#02ca3a" },
  ENTERPRISE: { label: "Enterprise", color: "#f59e0b" },
};

const FEATURE_LABELS = {
  INVENTORY: { name: "Inventory Management", requiredPlan: "PROFESSIONAL" },
  QR_MENU: { name: "QR Digital Menu", requiredPlan: "PROFESSIONAL" },
  ADVANCED_ANALYTICS: { name: "Advanced Analytics", requiredPlan: "ENTERPRISE" },
};

const planAllowsFeature = (plan, feature) =>
  (PLAN_FEATURES[plan] || []).includes(feature);

module.exports = { PLAN_FEATURES, PLAN_LABELS, FEATURE_LABELS, planAllowsFeature };
