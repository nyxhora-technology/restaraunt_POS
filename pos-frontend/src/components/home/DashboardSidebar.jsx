import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Tooltip from "../shared/Tooltip";
import { MdOutlineReceiptLong, MdTableRestaurant } from "react-icons/md";
import {
  LuLayoutDashboard,
  LuChartLine,
  LuBookOpen,
  LuPackage,
  LuQrCode,
  LuShieldCheck,
  LuSettings,
  LuChevronLeft,
  LuChevronRight,
  LuLock,
  LuSparkles,
  LuChefHat,
  LuUtensils,
} from "react-icons/lu";

const GlowingInventoryIcon = (props) => (
  <div className="animated-inventory-icon-wrapper" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <LuPackage {...props} className="inventory-base-icon" />
    <LuSparkles className="inventory-star inventory-star-1" />
    <LuSparkles className="inventory-star inventory-star-2" />
    <LuSparkles className="inventory-star inventory-star-3" />
  </div>
);
import useRole from "../../hooks/useRole";
import useFeature from "../../hooks/useFeature";
import {
  MANAGER_ROLES,
  ORDER_ROLES,
  TENANT_ROLES,
} from "../../constants/roles";

const navItems = [
  {
    label: "Analytics",
    path: "/app/analytics",
    icon: LuChartLine,
    roles: MANAGER_ROLES,
    feature: "ANALYTICS_EXTENDED",
  },
  {
    label: "Orders",
    path: "/app/orders",
    icon: MdOutlineReceiptLong,
    roles: ORDER_ROLES,
  },
  {
    label: "Tables",
    path: "/app/tables",
    icon: MdTableRestaurant,
    roles: ORDER_ROLES,
  },
  {
    label: "Menu",
    path: "/app/menu",
    icon: LuBookOpen,
    roles: ORDER_ROLES,
  },
  {
    label: "Inventory",
    path: "/app/inventory",
    icon: GlowingInventoryIcon,
    roles: MANAGER_ROLES,
  },
  {
    label: "QR Menu",
    path: "/app/qr",
    icon: LuQrCode,
    roles: MANAGER_ROLES,
  },
  {
    label: "Admin Workspace",
    path: "/app/dashboard",
    icon: LuShieldCheck,
    roles: MANAGER_ROLES,
  },
  {
    label: "Settings",
    path: "/app/settings",
    icon: LuSettings,
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
  const { hasFeature } = useFeature();
  const dashboardPath = isManagement ? "/app" : "/app/dashboard";
  const visibleNavItems = [
    {
      label: "Dashboard",
      path: dashboardPath,
      aliases: isManagement ? [] : ["/"],
      icon: LuLayoutDashboard,
      roles: TENANT_ROLES,
    },
    ...navItems,
  ].filter((item) => item.roles.includes(role));

  const wrapTooltip = (text, element) => {
    if (!collapsed) return element;
    return (
      <Tooltip content={text} position="right" delay={0.1} className="dashboard-sidebar-tooltip">
        {element}
      </Tooltip>
    );
  };

  return (
    <aside
      className={`dashboard-sidebar ${collapsed ? "is-collapsed" : ""}`}
      aria-label="Sidebar navigation"
    >
      {wrapTooltip(
        restaurantName,
        <button
          type="button"
          onClick={() => navigate("/app")}
          className={`dashboard-brand ${collapsed ? "is-collapsed" : ""}`}
        >
          <span className="dashboard-brand-mark">
            <LuUtensils />
          </span>
          {!collapsed && (
            <span className="dashboard-brand-copy">
              <strong>{restaurantName}</strong>
              <small>Restaurant POS</small>
            </span>
          )}
        </button>
      )}

      <nav className="dashboard-sidebar-nav" aria-label="Dashboard navigation">
        {visibleNavItems.map(({ label, path, aliases = [], icon: Icon, feature }) => {
          const active =
            location.pathname === path || aliases.includes(location.pathname);
          const locked = feature && !hasFeature(feature);
          return wrapTooltip(
            label,
            <button
              type="button"
              key={path}
              onClick={() => navigate(path)}
              className={`dashboard-sidebar-link ${active ? "is-active" : ""}`}
              data-tour={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon />
              {!collapsed && <span>{label}</span>}
              {locked && <LuLock className="dashboard-nav-lock" />}
            </button>
          );
        })}
      </nav>

      {canHandleOrders && wrapTooltip(
        "New Order",
        <button
          type="button"
          onClick={onCreateOrder}
          className="dashboard-create-order"
        >
          <LuChefHat />
          {!collapsed && <span>New Order</span>}
        </button>
      )}

      {wrapTooltip(
        collapsed ? "Expand sidebar" : "Collapse sidebar",
        <button
          type="button"
          onClick={onToggleCollapse}
          className="dashboard-collapse"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <LuChevronRight /> : <LuChevronLeft />}
          {!collapsed && <span>Collapse</span>}
        </button>
      )}
    </aside>
  );
};

export default DashboardSidebar;
