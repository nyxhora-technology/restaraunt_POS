import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MdOutlineAdminPanelSettings,
  MdOutlineDashboard,
  MdInventory2,
  MdOutlineMenuBook,
  MdQrCode2,
  MdOutlineReceiptLong,
  MdOutlineRoomService,
  MdOutlineSettings,
  MdRestaurant,
  MdTableRestaurant,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import useRole from "../../hooks/useRole";
import {
  MANAGER_ROLES,
  ORDER_ROLES,
  TENANT_ROLES,
} from "../../constants/roles";

const navItems = [
  {
    label: "Orders",
    path: "/orders",
    icon: MdOutlineReceiptLong,
    roles: ORDER_ROLES,
  },
  {
    label: "Tables",
    path: "/tables",
    aliases: ["/table"],
    icon: MdTableRestaurant,
    roles: ORDER_ROLES,
  },
  {
    label: "Menu",
    path: "/menu",
    icon: MdOutlineMenuBook,
    roles: ORDER_ROLES,
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: MdInventory2,
    roles: MANAGER_ROLES,
  },
  {
    label: "QR Menu",
    path: "/qr",
    icon: MdQrCode2,
    roles: MANAGER_ROLES,
  },
  {
    label: "Admin Workspace",
    path: "/dashboard",
    icon: MdOutlineAdminPanelSettings,
    roles: MANAGER_ROLES,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: MdOutlineSettings,
    roles: TENANT_ROLES,
  },
];

const DashboardSidebar = ({
  restaurantName,
  collapsed,
  onToggleCollapse,
  onCreateOrder,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isManagement, canHandleOrders } = useRole();
  const dashboardPath = isManagement ? "/" : "/dashboard";
  const visibleNavItems = [
    {
      label: "Dashboard",
      path: dashboardPath,
      aliases: isManagement ? [] : ["/"],
      icon: MdOutlineDashboard,
      roles: TENANT_ROLES,
    },
    ...navItems,
  ].filter((item) => item.roles.includes(role));

  return (
    <aside className={`dashboard-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <button
        type="button"
        className="dashboard-brand"
        onClick={() => navigate(dashboardPath)}
        title={collapsed ? restaurantName : undefined}
      >
        <span className="dashboard-brand-mark">
          <MdRestaurant />
        </span>
        {!collapsed && (
          <span className="dashboard-brand-copy">
            <strong>{restaurantName || "Restaurant"}</strong>
            <small>Restaurant POS</small>
          </span>
        )}
      </button>

      <nav className="dashboard-sidebar-nav" aria-label="Dashboard navigation">
        {visibleNavItems.map(({ label, path, aliases = [], icon: Icon }) => {
          const active =
            location.pathname === path || aliases.includes(location.pathname);
          return (
            <button
              type="button"
              key={path}
              onClick={() => navigate(path)}
              className={`dashboard-sidebar-link ${active ? "is-active" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {canHandleOrders && (
        <button
          type="button"
          onClick={onCreateOrder}
          className="dashboard-create-order"
          title={collapsed ? "New Order" : undefined}
        >
          <MdOutlineRoomService />
          {!collapsed && <span>New Order</span>}
        </button>
      )}

      <button
        type="button"
        onClick={onToggleCollapse}
        className="dashboard-collapse"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <MdChevronRight /> : <MdChevronLeft />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
};

export default DashboardSidebar;
