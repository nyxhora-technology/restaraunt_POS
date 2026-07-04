const createHttpError = require("http-errors");
const prisma = require("../config/prisma");
const { getPlanLimit } = require("../config/planFeatures");
const config = require("../config/config");

/**
 * Middleware factory that enforces hard plan limits (not feature gates).
 *
 * Usage:
 *   checkPlanLimit("orders_per_month")   — counted automatically via DB query
 *   checkPlanLimit("menu_items")         — counted automatically
 *   checkPlanLimit("staff_seats")        — counted automatically
 *   checkPlanLimit("tables")             — counted automatically
 *
 * SUPER_ADMIN role always bypasses.
 * devUnlockFeatures bypasses in non-production (dev/staging convenience).
 */
const checkPlanLimit = (resource) => async (req, _res, next) => {
  try {
    // Bypass in dev if unlocked, and always bypass for super admin
    if (config.devUnlockFeatures) return next();
    if (req.user?.role === "SUPER_ADMIN") return next();

    const restaurantId = req.restaurant?.id;
    const plan = req.restaurant?.plan || "STARTER";
    const limit = getPlanLimit(plan, resource);

    // null = unlimited on this plan
    if (limit === null) return next();

    let currentCount = 0;

    switch (resource) {
      case "orders_per_month": {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        currentCount = await prisma.order.count({
          where: {
            restaurantId,
            createdAt: { gte: startOfMonth },
          },
        });
        break;
      }

      case "menu_items": {
        currentCount = await prisma.menuItem.count({ where: { restaurantId } });
        break;
      }

      case "tables": {
        currentCount = await prisma.table.count({ where: { restaurantId } });
        break;
      }

      case "staff_seats": {
        // Count total users attached to this restaurant (staff + owner)
        currentCount = await prisma.user.count({
          where: {
            OR: [{ restaurantId }, { ownedRestaurant: { id: restaurantId } }],
          },
        });
        break;
      }

      default:
        return next();
    }

    if (currentCount >= limit) {
      const messages = {
        orders_per_month: `You've reached your ${limit} order/month limit on the Starter plan. Upgrade to Professional for unlimited orders.`,
        menu_items: `You've reached the ${limit} menu item limit on the Starter plan. Upgrade to add more items.`,
        tables: `You've reached the ${limit} table limit on the Starter plan. Upgrade to add more tables.`,
        staff_seats: `You've reached the ${limit} staff seat limit on the Starter plan. Upgrade to invite more team members.`,
      };

      return next(
        createHttpError(403, messages[resource] || "Plan limit reached", {
          code: "PLAN_LIMIT_REACHED",
          resource,
          currentCount,
          limit,
          currentPlan: plan,
        })
      );
    }

    // Attach usage info so the controller can include it in the response
    req.planUsage = { resource, currentCount, limit, plan };
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { checkPlanLimit };
