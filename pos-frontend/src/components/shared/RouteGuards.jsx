import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { ROLES } from "../../constants/roles";
import { APP_ROUTES, getAuthRoute } from "../../utils/authRouting";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the correct landing route for a given user after login.
 */
export const getHomeRoute = (user) => {
  if (user.role === ROLES.SUPER_ADMIN) return APP_ROUTES.platform;
  if (!user.restaurant || user.restaurant.status !== "APPROVED")
    return APP_ROUTES.onboarding;
  return ["OWNER", "MANAGER"].includes(user.role)
    ? APP_ROUTES.home
    : APP_ROUTES.dashboard;
};

// ─────────────────────────────────────────────────────────────────────────────
// ProtectedRoute — requires the user to be logged in
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Redirects unauthenticated users to /auth.
 * Returns null while the session check is still in-flight so the router
 * never makes a routing decision before auth state is known.
 */
export function ProtectedRoute({ children }) {
  const { isAuth, isInitializing } = useSelector((state) => state.user);
  const location = useLocation();
  if (isInitializing) return null; // wait — don't redirect yet
  if (!isAuth) return <Navigate to={getAuthRoute(location)} replace />;
  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// TenantRoute — requires auth + an approved restaurant
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds on ProtectedRoute.
 * - SUPER_ADMIN → /platform
 * - No approved restaurant → /onboarding
 */
export function TenantRoute({ children }) {
  const user = useSelector((state) => state.user);
  const location = useLocation();

  if (user.isInitializing) return null; // wait — don't redirect yet
  if (!user.isAuth) return <Navigate to={getAuthRoute(location)} replace />;
  if (user.role === ROLES.SUPER_ADMIN)
    return <Navigate to={APP_ROUTES.platform} replace />;
  if (!user.restaurant || user.restaurant.status !== "APPROVED")
    return <Navigate to={APP_ROUTES.onboarding} replace />;

  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// RoleRoute — TenantRoute + role-based access control
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps TenantRoute and also enforces role-level access.
 *
 * @param {string[]}  allowedRoles  Roles that may access this route.
 * @param {string}    [redirectTo]  Where to send users who fail the role check.
 *                                  Defaults to "/dashboard".
 *
 * @example
 * // Only OWNER and MANAGER can see this page
 * <RoleRoute allowedRoles={["OWNER", "MANAGER"]}>
 *   <AdminPage />
 * </RoleRoute>
 */
export function RoleRoute({
  allowedRoles,
  redirectTo = APP_ROUTES.dashboard,
  children,
}) {
  const role = useSelector((state) => state.user.role);

  return (
    <TenantRoute>
      {allowedRoles.includes(role) ? (
        children
      ) : (
        <Navigate to={redirectTo} replace />
      )}
    </TenantRoute>
  );
}
