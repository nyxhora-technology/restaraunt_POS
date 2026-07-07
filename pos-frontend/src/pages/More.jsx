import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdInventory2,
  MdOutlineAdminPanelSettings,
  MdOutlineMenuBook,
  MdOutlineReceiptLong,
  MdOutlineSettings,
  MdQrCode2,
  MdTableRestaurant,
  MdOutlineAnalytics,
} from "react-icons/md";
import useRole from "../hooks/useRole";
import {
  MANAGER_ROLES,
  ORDER_ROLES,
  TENANT_ROLES,
} from "../constants/roles";

const moreItems = [
  {
    label: "Admin Workspace",
    description: "Metrics, payments, staff, menu, inventory, QR, and tables.",
    path: "/app/dashboard",
    icon: MdOutlineAdminPanelSettings,
    roles: MANAGER_ROLES,
  },
  {
    label: "Orders",
    description: "Review live orders and open order details.",
    path: "/app/orders",
    icon: MdOutlineReceiptLong,
    roles: ORDER_ROLES,
  },
  {
    label: "Tables",
    description: "Open table layout and start dine-in orders.",
    path: "/app/tables",
    icon: MdTableRestaurant,
    roles: ORDER_ROLES,
  },
  {
    label: "Menu",
    description: "Create orders and browse available dishes.",
    path: "/app/menu",
    icon: MdOutlineMenuBook,
    roles: ORDER_ROLES,
  },
  {
    label: "Inventory",
    description: "Track stock, alerts, restock, and item links.",
    path: "/app/inventory",
    icon: MdInventory2,
    roles: MANAGER_ROLES,
  },
  {
    label: "QR Menu",
    description: "Generate guest menu QR codes and table links.",
    path: "/app/qr",
    icon: MdQrCode2,
    roles: MANAGER_ROLES,
  },
  {
    label: "Analytics",
    description: "View sales, orders, and performance metrics.",
    path: "/app/analytics",
    icon: MdOutlineAnalytics,
    roles: MANAGER_ROLES,
  },
  {
    label: "Settings",
    description: "Account security and restaurant profile.",
    path: "/app/settings",
    icon: MdOutlineSettings,
    roles: TENANT_ROLES,
  },
];

const More = () => {
  const navigate = useNavigate();
  const { role } = useRole();
  const visibleItems = moreItems.filter((item) => item.roles.includes(role));

  useEffect(() => {
    document.title = "POS | More";
  }, []);

  return (
    <section className="more-page">
      <div className="more-hero">
        <div>
          <span>More</span>
          <h1>Workspace menu</h1>
          <p>All operational areas in one consistent navigation surface.</p>
        </div>
      </div>

      <div className="more-grid">
        {visibleItems.map(({ label, description, path, icon: Icon }) => (
          <button
            type="button"
            key={path}
            className="more-card"
            onClick={() => navigate(path)}
          >
            <span>
              <Icon />
            </span>
            <div>
              <strong>{label}</strong>
              <small>{description}</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default More;
