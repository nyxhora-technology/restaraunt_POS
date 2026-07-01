const { PLAN_FEATURES, planAllowsFeature } = require("../config/planFeatures");
const createHttpError = require("http-errors");
const config = require("../config/config");

/**
 * Middleware factory that gates a route behind a plan feature.
 * Usage: requireFeature('INVENTORY') or requireFeature('QR_MENU')
 */
const requireFeature = (feature) => (req, _res, next) => {
  if (config.devUnlockFeatures) return next();

  const plan = req.restaurant?.plan || "STARTER";
  if (!planAllowsFeature(plan, feature)) {
    return next(
      createHttpError(403, `This feature requires a higher subscription plan`, {
        code: "UPGRADE_REQUIRED",
        feature,
        currentPlan: plan,
        requiredPlan: Object.keys(PLAN_FEATURES).find((p) =>
          (PLAN_FEATURES[p] || []).includes(feature)
        ),
      })
    );
  }
  next();
};

module.exports = { requireFeature };
