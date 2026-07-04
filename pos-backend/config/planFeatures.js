/**
 * Plan feature definitions.
 * Each plan lists the feature keys it unlocks.
 * Higher plans include all lower plan features.
 */
const PLAN_FEATURES = {
  STARTER: ["CORE_POS"],
  PROFESSIONAL: ["CORE_POS", "INVENTORY", "QR_MENU", "STAFF_INVITE", "ANALYTICS_EXTENDED", "EXPORT"],
  ENTERPRISE: ["CORE_POS", "INVENTORY", "QR_MENU", "STAFF_INVITE", "ANALYTICS_EXTENDED", "EXPORT", "ADVANCED_ANALYTICS"],
};

/**
 * Hard limits per plan.
 * null = unlimited.
 * SUPER_ADMIN bypass is handled separately in requirePlanLimit middleware.
 */
const PLAN_LIMITS = {
  STARTER: {
    orders_per_month: 300,
    menu_items: 30,
    tables: 10,
    staff_seats: 3,   // owner counts as 1, so owner + 2 staff
    qr_codes: 0,
    analytics_days: 7,
  },
  PROFESSIONAL: {
    orders_per_month: null,   // unlimited
    menu_items: null,
    tables: null,
    staff_seats: 10,
    qr_codes: 50,
    analytics_days: 90,
  },
  ENTERPRISE: {
    orders_per_month: null,
    menu_items: null,
    tables: null,
    staff_seats: null,
    qr_codes: null,
    analytics_days: 365,
  },
};

const PLAN_LABELS = {
  STARTER: { label: "Starter", color: "#6b7280" },
  PROFESSIONAL: { label: "Professional", color: "#02ca3a" },
  ENTERPRISE: { label: "Enterprise", color: "#f59e0b" },
};

const FEATURE_LABELS = {
  INVENTORY: { name: "Inventory Management", requiredPlan: "PROFESSIONAL" },
  QR_MENU: { name: "QR Digital Menu", requiredPlan: "PROFESSIONAL" },
  STAFF_INVITE: { name: "Staff Invitations", requiredPlan: "PROFESSIONAL" },
  ANALYTICS_EXTENDED: { name: "Extended Analytics", requiredPlan: "PROFESSIONAL" },
  EXPORT: { name: "Data Export", requiredPlan: "PROFESSIONAL" },
  ADVANCED_ANALYTICS: { name: "Advanced Analytics", requiredPlan: "ENTERPRISE" },
};

const planAllowsFeature = (plan, feature) =>
  (PLAN_FEATURES[plan] || []).includes(feature);

/**
 * Returns the limit value for a resource on a given plan.
 * Returns null if unlimited.
 */
const getPlanLimit = (plan, resource) =>
  (PLAN_LIMITS[plan] || PLAN_LIMITS.STARTER)[resource] ?? null;

module.exports = {
  PLAN_FEATURES,
  PLAN_LIMITS,
  PLAN_LABELS,
  FEATURE_LABELS,
  planAllowsFeature,
  getPlanLimit,
};
