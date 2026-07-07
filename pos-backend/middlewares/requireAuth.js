const createHttpError = require("http-errors");
const auth = require("../config/auth");
const prisma = require("../config/prisma");
const config = require("../config/config");

const PASSWORD_CHANGE_ALLOWED_PATHS = [
  "/api/restaurant/context",
  "/api/restaurant/staff/change-password",
];

const isPasswordChangeAllowedPath = (req) =>
  req.originalUrl?.startsWith("/api/auth/") ||
  PASSWORD_CHANGE_ALLOWED_PATHS.some((path) => req.originalUrl?.startsWith(path));

const loadRequestUser = async (req) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) throw createHttpError(401, "Unauthorized");

  // Better Auth already loads the user with the session. Its configured
  // additional fields include role and restaurantId, so querying User again
  // adds a full remote database round trip to every authenticated request.
  let user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    phone: session.user.phone || null,
    role: session.user.role,
    restaurantId: session.user.restaurantId || null,
    mustChangePassword: session.user.mustChangePassword ?? false,
  };
  if (!user.role) throw createHttpError(401, "User session is incomplete");

  if (
    config.superAdminEmail &&
    user.email.toLowerCase() === config.superAdminEmail &&
    user.role !== "SUPER_ADMIN"
  ) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "SUPER_ADMIN", restaurantId: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        restaurantId: true,
        mustChangePassword: true,
      },
    });
  }

  if (user.mustChangePassword && !isPasswordChangeAllowedPath(req)) {
    throw createHttpError(403, "Password change required before continuing");
  }

  req.session = session.session;
  req.user = user;
  return user;
};

const requireAuth = async (req, _res, next) => {
  try {
    await loadRequestUser(req);
    next();
  } catch (error) {
    next(error.status ? error : createHttpError(401, "Unauthorized"));
  }
};

module.exports = { requireAuth, loadRequestUser };
