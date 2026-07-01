/**
 * Single source of truth for all roles in the system.
 * Must stay in sync with the backend Role enum in schema.prisma.
 */

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  WAITER: "WAITER",
  KITCHEN: "KITCHEN",
};

/** Roles that belong to a restaurant tenant (not platform-level) */
export const TENANT_ROLES = [
  ROLES.OWNER,
  ROLES.MANAGER,
  ROLES.CASHIER,
  ROLES.WAITER,
  ROLES.KITCHEN,
];

/** Roles that can manage the restaurant (write access to menu, tables, etc.) */
export const MANAGER_ROLES = [ROLES.OWNER, ROLES.MANAGER];

/** Roles that can create and view orders */
export const ORDER_ROLES = [
  ROLES.OWNER,
  ROLES.MANAGER,
  ROLES.CASHIER,
  ROLES.WAITER,
];

/** Roles that can view kitchen / order queue */
export const KITCHEN_ROLES = [ROLES.OWNER, ROLES.MANAGER, ROLES.KITCHEN];
