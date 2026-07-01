import { useSelector } from "react-redux";
import { ROLES, MANAGER_ROLES, ORDER_ROLES, KITCHEN_ROLES, TENANT_ROLES } from "../constants/roles";

/**
 * Central hook for role-based logic.
 * Use this instead of inline `user.role === "..."` checks in components.
 */
const useRole = () => {
  const role = useSelector((state) => state.user.role);

  return {
    role,

    // ── Role identity ────────────────────────────────────────────────
    isSuperAdmin: role === ROLES.SUPER_ADMIN,
    isOwner: role === ROLES.OWNER,
    isManager: role === ROLES.MANAGER,
    isCashier: role === ROLES.CASHIER,
    isWaiter: role === ROLES.WAITER,
    isKitchen: role === ROLES.KITCHEN,

    // ── Role group helpers ───────────────────────────────────────────
    /** OWNER or MANAGER */
    isManagement: MANAGER_ROLES.includes(role),
    /** OWNER, MANAGER, CASHIER, WAITER */
    canHandleOrders: ORDER_ROLES.includes(role),
    /** OWNER, MANAGER, KITCHEN */
    canViewKitchen: KITCHEN_ROLES.includes(role),
    /** Any restaurant-level role (non-platform) */
    isTenantUser: TENANT_ROLES.includes(role),

    /**
     * Generic role check — use when none of the above flags fit.
     * @param {...string} allowedRoles
     */
    hasRole: (...allowedRoles) => allowedRoles.includes(role),
  };
};

export default useRole;
