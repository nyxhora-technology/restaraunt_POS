const createHttpError = require("http-errors");
const prisma = require("../config/prisma");
const { loadRequestUser } = require("./requireAuth");

const requireTenant = async (req, _res, next) => {
  try {
    const user = req.user || (await loadRequestUser(req));

    if (user.role === "SUPER_ADMIN") {
      return next(createHttpError(403, "Tenant endpoint is not available to platform admins"));
    }
    if (!user.restaurantId) {
      return next(createHttpError(403, "No restaurant assigned"));
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
    });
    if (!restaurant) return next(createHttpError(403, "Restaurant no longer exists"));
    if (restaurant.status !== "APPROVED") {
      return next(createHttpError(403, `Restaurant is ${restaurant.status}`));
    }

    req.restaurantId = restaurant.id;
    req.restaurant = restaurant;
    next();
  } catch (error) {
    next(error.status ? error : createHttpError(401, "Unauthorized"));
  }
};

module.exports = { requireTenant };
