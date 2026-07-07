import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  MdCheckCircleOutline,
  MdDownload,
  MdLockOutline,
  MdOutlineAccessTime,
  MdOutlineReceiptLong,
  MdSearch,
  MdTaskAlt,
} from "react-icons/md";
import OrderCard from "../components/orders/OrderCard";
import OrderDetailsModal from "../components/orders/OrderDetailsModal";
import { getOrderTableLabel } from "../components/tables/tableOptions";
import useDashboardPreferences from "../hooks/useDashboardPreferences";
import useFeature from "../hooks/useFeature";
import { exportOrders, getOrders } from "../https";

const saveDownload = (response, fallbackName) => {
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    response.headers["content-disposition"]?.match(/filename="([^"]+)"/)?.[1] ||
    fallbackName;
  link.click();
  URL.revokeObjectURL(url);
};

const Orders = () => {
  const [status, setStatus] = useState("all");
  const [timeline, setTimeline] = useState("3hours");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { theme } = useDashboardPreferences();
  const { hasExport, plan } = useFeature();
  const analyticsDays =
    plan === "STARTER" ? 7 : plan === "PROFESSIONAL" ? 90 : 365;
  const availableTimelines = [
    ["all", "All time", plan !== "ENTERPRISE"],
    ["plan", `Last ${analyticsDays} days`, false],
    ["3hours", "Last 3 hours", false],
    ["today", "Today", false],
    ["yesterday", "Yesterday", false],
    ["thisWeek", "This week", false],
  ];

  const getTimelineParams = () => {
    if (timeline === "all") return {};
    const now = new Date();
    let from;
    let to;
    if (timeline === "plan") {
      from = new Date(
        now.getTime() - analyticsDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      to = now.toISOString();
    } else if (timeline === "3hours") {
      from = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
      to = now.toISOString();
    } else if (timeline === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      from = start.toISOString();
      to = now.toISOString();
    } else if (timeline === "yesterday") {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      from = start.toISOString();
      to = end.toISOString();
    } else if (timeline === "thisWeek") {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      from = start.toISOString();
      to = now.toISOString();
    }
    return { from, to };
  };

  const handleExport = async () => {
    if (!hasExport) {
      enqueueSnackbar("CSV export is included with Professional.", {
        variant: "info",
      });
      return;
    }
    try {
      saveDownload(
        await exportOrders(getTimelineParams()),
        `orders-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch {
      enqueueSnackbar("Order export could not be generated.", {
        variant: "error",
      });
    }
  };

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    return () => {
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, [theme]);

  const {
    data: resData,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["orders", timeline],
    queryFn: () => getOrders(getTimelineParams()),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (isError) {
      enqueueSnackbar("Orders could not be loaded.", { variant: "error" });
    }
  }, [isError]);

  const orders = useMemo(() => resData?.data.data || [], [resData]);
  const statusCounts = useMemo(
    () => ({
      active: orders.filter((order) =>
        ["PENDING", "ACCEPTED", "PREPARING"].includes(order.orderStatus),
      ).length,
      ready: orders.filter((order) => order.orderStatus === "READY").length,
      completed: orders.filter((order) => order.orderStatus === "COMPLETED")
        .length,
    }),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        status === "all" ||
        (status === "progress" &&
          ["PENDING", "ACCEPTED", "PREPARING"].includes(order.orderStatus)) ||
        (status === "ready" && order.orderStatus === "READY") ||
        (status === "completed" && order.orderStatus === "COMPLETED");
      if (!matchesStatus) return false;
      if (!query) return true;
      return [
        order.orderNo,
        order.customerName,
        order.customerPhone,
        order.orderType,
        order.orderStatus,
        getOrderTableLabel(order, ""),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [orders, search, status]);

  const summary = [
    {
      label: "Orders in view",
      value: orders.length,
      note: `Current ${timeline === "3hours" ? "3-hour" : "time"} window`,
      icon: MdOutlineReceiptLong,
    },
    {
      label: "In progress",
      value: statusCounts.active,
      note: "Pending or in the kitchen",
      icon: MdOutlineAccessTime,
    },
    {
      label: "Ready",
      value: statusCounts.ready,
      note: "Waiting to be served",
      icon: MdTaskAlt,
    },
    {
      label: "Completed",
      value: statusCounts.completed,
      note: "Closed in this window",
      icon: MdCheckCircleOutline,
    },
  ];

  return (
    <section
      className={`dashboard-shell theme-${theme} operations-page orders-workspace-page`}
    >
      <header className="analytics-header operations-page-header">
        <div>
          <p className="analytics-eyebrow">Order operations</p>
          <h1>Orders</h1>
          <p>
            Find active tickets, follow kitchen progress, and review completed
            service.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className={`pro-action-button ${!hasExport ? "is-locked" : ""}`}
          title={
            !hasExport
              ? "CSV export requires Professional"
              : "Export visible orders to CSV"
          }
        >
          {hasExport ? <MdDownload /> : <MdLockOutline />}
          Export CSV
          {!hasExport && <span>PRO</span>}
        </button>
      </header>

      <section className="operations-summary-grid" aria-label="Order summary">
        {summary.map(({ label, value, note, icon: Icon }) => (
          <article key={label}>
            <div>
              <span>{label}</span>
              <strong>{isLoading ? "—" : value}</strong>
              <small>{note}</small>
            </div>
            <i>
              <Icon />
            </i>
          </article>
        ))}
      </section>

      <section className="orders-control-panel">
        <div className="orders-control-primary">
          <label className="operations-search">
            <MdSearch />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, customer, phone or table"
            />
          </label>
          <div
            className="analytics-range orders-status-filter"
            aria-label="Order status"
          >
            {[
              ["all", "All"],
              ["progress", "In progress"],
              ["ready", "Ready"],
              ["completed", "Completed"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={status === value ? "is-active" : ""}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="orders-control-timeline">
          <div>
            <strong>History</strong>
            <small>
              {analyticsDays}-day access
              {plan === "STARTER" && " · 90 days with Professional"}
            </small>
          </div>
          <div className="analytics-range orders-timeline-filter">
            {availableTimelines.map(([value, label, capped]) => (
              <button
                key={value}
                type="button"
                disabled={capped}
                onClick={() => setTimeline(value)}
                className={timeline === value ? "is-active" : ""}
                title={
                  capped
                    ? `Your plan includes ${analyticsDays} days of order history`
                    : undefined
                }
              >
                {capped && <MdLockOutline />}
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="orders-results-heading">
        <div>
          <strong>{filteredOrders.length}</strong>
          <span>{filteredOrders.length === 1 ? "order" : "orders"}</span>
        </div>
        {(search || status !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("all");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading && orders.length === 0 ? (
        <div className="operations-loading-state">Loading orders…</div>
      ) : filteredOrders.length > 0 ? (
        <div className="orders-workspace-grid">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => setSelectedOrder(order)}
            />
          ))}
        </div>
      ) : (
        <div className="operations-empty-state">
          <span>
            <MdOutlineReceiptLong />
          </span>
          <h2>
            {orders.length
              ? "No orders match these filters"
              : "No orders in this window"}
          </h2>
          <p>
            {orders.length
              ? "Try another status, date range, customer, or table."
              : "New tickets will appear here as soon as service begins."}
          </p>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </section>
  );
};

export default Orders;
