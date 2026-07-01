import { useSelector } from "react-redux";

const roleDashboard = {
  OWNER: {
    availableTabs: [
      "Metrics",
      "Orders",
      "Payments",
      "Staff",
      "Menu",
      "Inventory",
      "QR Menu",
      "Tables",
    ],
    defaultTab: "Metrics",
    canViewFinance: true,
    canViewPayments: true,
    canViewPaymentHistory: true,
    canManageStaff: true,
    canManageMenu: true,
    canCreateTable: true,
    canUpdateTable: true,
    canDeleteTable: true,
    isKitchen: false,
  },
  MANAGER: {
    availableTabs: [
      "Metrics",
      "Orders",
      "Payments",
      "Staff",
      "Menu",
      "Inventory",
      "QR Menu",
      "Tables",
    ],
    defaultTab: "Metrics",
    canViewFinance: true,
    canViewPayments: true,
    canViewPaymentHistory: true,
    canManageStaff: true,
    canManageMenu: true,
    canCreateTable: true,
    canUpdateTable: true,
    canDeleteTable: false,
    isKitchen: false,
  },
  CASHIER: {
    availableTabs: ["Orders", "Payments", "Tables"],
    defaultTab: "Orders",
    canViewFinance: false,
    canViewPayments: true,
    canViewPaymentHistory: false,
    canManageStaff: false,
    canManageMenu: false,
    canCreateTable: false,
    canUpdateTable: false,
    canDeleteTable: false,
    isKitchen: false,
  },
  KITCHEN: {
    availableTabs: ["Orders"],
    defaultTab: "Orders",
    canViewFinance: false,
    canViewPayments: false,
    canViewPaymentHistory: false,
    canManageStaff: false,
    canManageMenu: false,
    canCreateTable: false,
    canUpdateTable: false,
    canDeleteTable: false,
    isKitchen: true,
  },
  WAITER: {
    availableTabs: ["Orders", "Tables"],
    defaultTab: "Orders",
    canViewFinance: false,
    canViewPayments: false,
    canViewPaymentHistory: false,
    canManageStaff: false,
    canManageMenu: false,
    canCreateTable: false,
    canUpdateTable: false,
    canDeleteTable: false,
    isKitchen: false,
  },
};

const fallback = roleDashboard.WAITER;

const useRoleDashboard = () => {
  const role = useSelector((state) => state.user.role);
  const config = roleDashboard[role] || fallback;
  return { role, ...config };
};

export default useRoleDashboard;
