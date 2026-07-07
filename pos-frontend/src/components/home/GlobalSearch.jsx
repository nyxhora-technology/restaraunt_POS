import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  MdClose,
  MdOutlineDashboard,
  MdInventory2,
  MdMoreHoriz,
  MdOutlineMenuBook,
  MdOutlineReceiptLong,
  MdQrCode2,
  MdSearch,
  MdSettings,
  MdTableRestaurant,
} from "react-icons/md";
import { getMenu, getOrders, getTables } from "../../https";
import { getOrderTableLabel } from "../tables/tableOptions";
import useRole from "../../hooks/useRole";
import {
  MANAGER_ROLES,
  ORDER_ROLES,
  TENANT_ROLES,
} from "../../constants/roles";

const navigationItems = [
  {
    label: "Dashboard",
    detail: "Overview and metrics",
    path: "/app/dashboard",
    icon: MdOutlineDashboard,
    roles: TENANT_ROLES,
  },
  {
    label: "Orders",
    detail: "View all orders",
    path: "/app/orders",
    icon: MdOutlineReceiptLong,
    roles: ORDER_ROLES,
  },
  {
    label: "Tables",
    detail: "Manage restaurant tables",
    path: "/app/tables",
    icon: MdTableRestaurant,
    roles: ORDER_ROLES,
  },
  {
    label: "Menu",
    detail: "Browse menu items",
    path: "/app/menu",
    icon: MdOutlineMenuBook,
    roles: ORDER_ROLES,
  },
  {
    label: "Inventory",
    detail: "Stock, alerts, and restock actions",
    path: "/app/inventory",
    icon: MdInventory2,
    roles: MANAGER_ROLES,
  },
  {
    label: "QR Menu",
    detail: "Generate and manage guest QR menus",
    path: "/app/qr",
    icon: MdQrCode2,
    roles: MANAGER_ROLES,
  },
  {
    label: "Settings",
    detail: "Account and restaurant settings",
    path: "/app/settings",
    icon: MdSettings,
    roles: TENANT_ROLES,
  },
  {
    label: "More",
    detail: "All workspace sections",
    path: "/app/more",
    icon: MdMoreHoriz,
    roles: TENANT_ROLES,
  },
];

const GlobalSearch = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { role, isManagement, canHandleOrders } = useRole();
  const ordersQuery = useQuery({
    queryKey: ["orders", "global-search"],
    queryFn: () => getOrders({ limit: 20 }),
    enabled: isOpen && canHandleOrders,
  });
  const tablesQuery = useQuery({
    queryKey: ["tables"],
    queryFn: () => getTables(),
    enabled: isOpen && canHandleOrders,
  });
  const menuQuery = useQuery({
    queryKey: ["menu"],
    queryFn: getMenu,
    enabled: isOpen && canHandleOrders,
  });

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const navigation = navigationItems
      .filter((item) => item.roles.includes(role))
      .filter((item) =>
        `${item.label} ${item.detail}`.toLowerCase().includes(term),
      )
      .map((item) => ({
        ...item,
        path:
          item.label === "Dashboard" && isManagement ? "/" : item.path,
        type: "Navigation",
      }));
    if (!term) return navigation;

    const orders = (ordersQuery.data?.data.data || [])
      .filter((order) =>
        [
          order.orderNo,
          order.customerName,
          order.customerPhone,
          getOrderTableLabel(order, ""),
          order.orderStatus,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(term),
        ),
      )
      .map((order) => ({
        label: `Order #${order.orderNo || String(order.id).slice(-6)}`,
        detail: `${order.customerName || "Guest"} · ${order.orderStatus}`,
        path: "/app/orders",
        icon: MdOutlineReceiptLong,
        type: "Order",
      }));
    const tables = (tablesQuery.data?.data.data || [])
      .filter((table) =>
        `${table.label || `table ${table.tableNo}`} ${table.area?.name || ""} ${
          table.status
        }`
          .toLowerCase()
          .includes(term),
      )
      .map((table) => ({
        label: table.label || `Table ${table.tableNo}`,
        detail: `${table.area?.name || "Main Dining"} · ${table.status} · ${
          table.seats
        } seats`,
        path: "/app/tables",
        icon: MdTableRestaurant,
        type: "Table",
      }));
    const menuItems = (menuQuery.data?.data.data || [])
      .flatMap((category) =>
        (category.menuItems || []).map((item) => ({
          ...item,
          categoryName: category.name,
        })),
      )
      .filter((item) =>
        `${item.name} ${item.categoryName}`.toLowerCase().includes(term),
      )
      .map((item) => ({
        label: item.name,
        detail: `${item.categoryName} · ₹${item.price}`,
        path: "/app/menu",
        icon: MdOutlineMenuBook,
        type: "Menu item",
      }));

    return [...navigation, ...orders, ...tables, ...menuItems].slice(0, 10);
  }, [
    isManagement,
    menuQuery.data,
    ordersQuery.data,
    query,
    role,
    tablesQuery.data,
  ]);

  if (!isOpen) return null;

  const selectResult = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      className="dashboard-command-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="dashboard-command"
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
      >
        <div className="dashboard-command-input">
          <MdSearch />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
            }}
            placeholder="Search orders, customers, tables, menu..."
          />
          <button type="button" onClick={onClose} aria-label="Close search">
            <MdClose />
          </button>
        </div>

        <div className="dashboard-command-results">
          {results.length ? (
            results.map(({ label, detail, path, icon: Icon, type }, index) => (
              <button
                type="button"
                key={`${type}-${label}-${index}`}
                onClick={() => selectResult(path)}
              >
                <span className="dashboard-command-icon">
                  <Icon />
                </span>
                <span className="dashboard-command-copy">
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
                <span className="dashboard-command-type">{type}</span>
              </button>
            ))
          ) : (
            <div className="dashboard-command-empty">
              No matching orders, customers, tables, or menu items.
            </div>
          )}
        </div>
        <footer>
          <span>Searches live restaurant data</span>
          <kbd>Esc</kbd>
          <span>to close</span>
        </footer>
      </section>
    </div>
  );
};

export default GlobalSearch;
