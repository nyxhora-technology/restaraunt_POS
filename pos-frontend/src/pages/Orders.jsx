import React, { useState, useEffect } from "react";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/shared/BackButton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrders } from "../https/index";
import { enqueueSnackbar } from "notistack";
import OrderDetailsModal from "../components/orders/OrderDetailsModal";
import useDashboardPreferences from "../hooks/useDashboardPreferences";

const Orders = () => {
  const [status, setStatus] = useState("all");
  const [timeline, setTimeline] = useState("3hours");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { theme } = useDashboardPreferences();

  const getTimelineParams = () => {
    if (timeline === "all") return {};
    const now = new Date();
    let from, to;
    if (timeline === "3hours") {
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
      start.setDate(start.getDate() - start.getDay()); // Sunday
      start.setHours(0, 0, 0, 0);
      from = start.toISOString();
      to = now.toISOString();
    }
    return { from, to };
  };

  useEffect(() => {
    document.title = "POS | Orders";
    document.documentElement.style.colorScheme = theme;
    return () => {
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, [theme]);

  const { data: resData, isError } = useQuery({
    queryKey: ["orders", timeline],
    queryFn: async () => {
      return await getOrders(getTimelineParams());
    },
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }
  const orders = resData?.data.data || [];
  const filteredOrders = orders.filter((order) => {
    if (status === "progress") {
      return ["PENDING", "ACCEPTED", "PREPARING"].includes(order.orderStatus);
    }
    if (status === "ready") return order.orderStatus === "READY";
    if (status === "completed") return order.orderStatus === "COMPLETED";
    return true;
  });

  return (
    <section
      className={`dashboard-shell theme-${theme} flex h-[calc(100vh-5rem)] min-h-0 flex-col overflow-hidden`}
    >
      <div className="flex flex-col gap-4 px-10 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-[var(--dash-text)] text-2xl font-bold tracking-wide">
              Orders
            </h1>
          </div>
          <div className="dashboard-filter-group">
            <button
              onClick={() => setStatus("all")}
              className={`dashboard-filter-button ${
                status === "all" ? "is-active" : ""
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatus("progress")}
              className={`dashboard-filter-button ${
                status === "progress" ? "is-active" : ""
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setStatus("ready")}
              className={`dashboard-filter-button ${
                status === "ready" ? "is-active" : ""
              }`}
            >
              Ready
            </button>
            <button
              onClick={() => setStatus("completed")}
              className={`dashboard-filter-button ${
                status === "completed" ? "is-active" : ""
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        <div className="dashboard-time-filter">
          <span>Timeline:</span>
          {[
            ["all", "All Time"],
            ["3hours", "Last 3 Hours"],
            ["today", "Today"],
            ["yesterday", "Yesterday"],
            ["thisWeek", "This Week"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTimeline(value)}
              className={timeline === value ? "is-active" : ""}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-hide grid min-h-0 flex-1 grid-cols-3 content-start gap-3 overflow-y-auto px-16 py-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            return (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            );
          })
        ) : (
          <p className="col-span-3 text-[var(--dash-muted)]">
            No orders available
          </p>
        )}
      </div>

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
