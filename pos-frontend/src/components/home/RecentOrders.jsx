import React, { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  MdMoreVert,
  MdReceiptLong,
  MdSearch,
  MdShoppingBag,
  MdTableRestaurant,
  MdUnfoldMore,
  MdVisibility,
} from "react-icons/md";
import OrderDetailsModal from "../orders/OrderDetailsModal";
import OrderCelebration from "../shared/OrderCelebration";
import { getOrders } from "../../https/index";
import { getOrderTableLabel } from "../tables/tableOptions";
import CustomSelect from "../shared/CustomSelect";

const inProgressStatuses = ["PENDING", "PREPARING"];

const statusLabels = {
  PENDING: "Pending",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  // Legacy: some older orders may still carry ACCEPTED status
  ACCEPTED: "Accepted",
};

const RecentOrders = ({ search = "" }) => {
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState(search);
  const [status, setStatus] = useState("all");
  const [limit, setLimit] = useState(
    () => Number(localStorage.getItem("dashboard_order_limit")) || 20,
  );
  const [sortDirection, setSortDirection] = useState("desc");
  const [sortBy, setSortBy] = useState("time");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);
  const previousOrdersRef = React.useRef({});

  const {
    data: resData,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["orders", "recent", limit],
    queryFn: () => getOrders({ limit }),
    placeholderData: keepPreviousData,
  });
  const orders = resData?.data.data || [];
  const normalizedSearch = localSearch.trim().toLowerCase();
  const filteredOrders = orders
    .filter((order) => {
      const matchesSearch = [
        order.customerName,
        order.customerPhone,
        String(order.orderNo),
        getOrderTableLabel(order, ""),
        order.orderStatus,
        order.orderType,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedSearch),
      );
      const matchesStatus =
        status === "all" ||
        (status === "progress" &&
          inProgressStatuses.includes(order.orderStatus)) ||
        order.orderStatus === status;
      return matchesSearch && matchesStatus;
    })
    .sort((left, right) => {
      if (sortBy === "status") {
        const diff = (left.orderStatus || "").localeCompare(
          right.orderStatus || "",
        );
        return sortDirection === "asc" ? diff : -diff;
      }
      const difference =
        new Date(left.createdAt || 0).getTime() -
        new Date(right.createdAt || 0).getTime();
      return sortDirection === "asc" ? difference : -difference;
    });

  // Peak-End Rule: Detect when an order is completed to fire the celebration
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const newOrderState = {};
    orders.forEach((order) => {
      newOrderState[order.id] = order.orderStatus;
      const oldStatus = previousOrdersRef.current[order.id];
      if (
        oldStatus &&
        oldStatus !== "COMPLETED" &&
        order.orderStatus === "COMPLETED"
      ) {
        setCompletedOrder(order.orderNo || order.id);
      }
    });
    previousOrdersRef.current = newOrderState;
  }, [orders]);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [openMenuId]);

  const formatTime = (value) => {
    if (!value) return "—";
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  };

  return (
    <section className="dashboard-panel dashboard-recent-orders">
      <div className="dashboard-panel-header">
        <h2>Recent Orders</h2>
        <div className="dashboard-panel-actions">
          <label className="dashboard-order-search">
            <MdSearch />
            <input
              type="search"
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="Search by customer, order ID, or table..."
            />
          </label>
          <div className="w-36">
            <CustomSelect
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "all", label: "All statuses" },
                { value: "progress", label: "In progress" },
                { value: "READY", label: "Ready" },
                { value: "COMPLETED", label: "Completed" },
              ]}
            />
          </div>
          <div className="w-32">
            <CustomSelect
              value={limit}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLimit(val);
                localStorage.setItem("dashboard_order_limit", val);
              }}
              options={[
                { value: 10, label: "10 Orders" },
                { value: 20, label: "20 Orders" },
                { value: 50, label: "50 Orders" },
                { value: 100, label: "100 Orders" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="dashboard-table-wrap">
        <table className="dashboard-orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Type / Table</th>
              <th>Items</th>
              <th>
                <button
                  type="button"
                  className="dashboard-time-sort"
                  onClick={() => {
                    if (sortBy === "status")
                      setSortDirection((v) => (v === "desc" ? "asc" : "desc"));
                    else {
                      setSortBy("status");
                      setSortDirection("asc");
                    }
                  }}
                  aria-label="Sort by status"
                >
                  Status <MdUnfoldMore />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="dashboard-time-sort"
                  onClick={() => {
                    if (sortBy === "time")
                      setSortDirection((v) => (v === "desc" ? "asc" : "desc"));
                    else {
                      setSortBy("time");
                      setSortDirection("desc");
                    }
                  }}
                  aria-label={`Sort time ${
                    sortDirection === "desc" ? "oldest first" : "newest first"
                  }`}
                >
                  Time <MdUnfoldMore />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order, index) => (
              <tr key={order.id} onClick={() => setSelectedOrder(order)}>
                <td className="dashboard-order-number">
                  #ORD-
                  {order.orderNo
                    ? String(order.orderNo).padStart(4, "0")
                    : String(order.id).slice(-4).toUpperCase()}
                </td>
                <td>
                  <span className="dashboard-customer">
                    <span className="dashboard-customer-initial">
                      {(order.customerName || "G")
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                    {order.customerName || "Guest"}
                  </span>
                </td>
                <td>
                  <span
                    className={`dashboard-order-type-tag ${
                      order.orderType === "TAKEAWAY"
                        ? "is-takeaway"
                        : "is-dine-in"
                    }`}
                  >
                    {order.orderType === "TAKEAWAY" ? (
                      <>
                        <MdShoppingBag /> Takeaway
                      </>
                    ) : (
                      <>
                        <MdTableRestaurant />
                        {getOrderTableLabel(order)}
                      </>
                    )}
                  </span>
                </td>
                <td>
                  {(order.items || []).reduce(
                    (total, item) => total + Number(item.quantity || 1),
                    0,
                  )}
                </td>
                <td>
                  <span
                    className="dashboard-status"
                    data-status={order.orderStatus}
                  >
                    {statusLabels[order.orderStatus] ||
                      order.orderStatus?.replaceAll("_", " ") ||
                      "Unknown"}
                  </span>
                </td>
                <td className="dashboard-order-actions-cell">
                  <span className="dashboard-order-time">
                    {formatTime(order.createdAt)}
                    <button
                      type="button"
                      aria-label={`More options for order ${order.orderNo}`}
                      aria-expanded={openMenuId === order.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId((value) =>
                          value === order.id ? null : order.id,
                        );
                      }}
                    >
                      <MdMoreVert />
                    </button>
                  </span>
                  {openMenuId === order.id && (
                    <div
                      className={`dashboard-order-menu ${
                        index >= 3 ? "opens-up" : ""
                      }`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrder(order);
                          setOpenMenuId(null);
                        }}
                      >
                        <MdVisibility /> View details
                      </button>
                      <button type="button" onClick={() => navigate("/app/orders")}>
                        <MdReceiptLong /> Open all orders
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading && (
          <div className="dashboard-panel-state">Loading recent orders…</div>
        )}
        {isError && (
          <div className="dashboard-panel-state is-error">
            Could not load recent orders.
          </div>
        )}
        {!isLoading && !isError && filteredOrders.length === 0 && (
          <div className="dashboard-panel-state">
            {normalizedSearch || status !== "all"
              ? "No matching orders"
              : "No orders available"}
          </div>
        )}
      </div>

      {!isLoading && !isError && filteredOrders.length > 0 && (
        <button
          type="button"
          onClick={() => navigate("/app/orders")}
          className="dashboard-orders-footer"
        >
          View all orders <span>→</span>
        </button>
      )}

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          orderId={selectedOrder.id}
        />
      )}

      {completedOrder && (
        <OrderCelebration
          orderNo={completedOrder}
          onComplete={() => setCompletedOrder(null)}
        />
      )}
    </section>
  );
};

export default RecentOrders;
