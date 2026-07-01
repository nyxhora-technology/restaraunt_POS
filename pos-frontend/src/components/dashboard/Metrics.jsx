import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { getDashboard } from "../../https";
import useRole from "../../hooks/useRole";

const MetricCard = ({ title, value, color, hint }) => (
  <div className="shadow-sm rounded-lg p-4" style={{ backgroundColor: color }}>
    <div className="flex justify-between items-center gap-3">
      <p className="font-medium text-xs text-[#f5f5f5]">{title}</p>
      <span className="flex items-center gap-1 text-[11px] text-white/80">
        <span className="w-1.5 h-1.5 bg-white rounded-full" />
        Live
      </span>
    </div>
    <p className="mt-1 font-semibold text-2xl text-[#f5f5f5]">{value}</p>
    {hint && <p className="text-[11px] text-white/70 mt-1">{hint}</p>}
  </div>
);

const Metrics = () => {
  const user = useSelector((state) => state.user);
  const { isManagement } = useRole();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", user.restaurantId, user.role],
    queryFn: () =>
      isManagement
        ? getDashboard()
        : Promise.resolve({ data: { data: {} } }),
    enabled: Boolean(user.isAuth && user.restaurantId && isManagement),
  });
  const dashboard = data?.data.data || {};
  const value = (metric, fallback = 0) =>
    isLoading ? "—" : (dashboard[metric] ?? fallback);
  const operations = [
    {
      title: "Revenue today",
      value: isLoading
        ? "—"
        : `₹${Number(dashboard.revenueToday || 0).toFixed(2)}`,
      color: "#025cca",
      hint: `Yesterday: ₹${Number(dashboard.revenueYesterday || 0).toFixed(2)}`,
    },
    {
      title: "Orders today",
      value: value("ordersToday"),
      color: "#078541",
      hint: `Yesterday: ${dashboard.ordersYesterday || 0}`,
    },
    {
      title: "Average paid order",
      value: isLoading
        ? "—"
        : `₹${Number(dashboard.averageOrderValue || 0).toFixed(2)}`,
      color: "#7c3aed",
      hint: "Based on today's payments",
    },
    {
      title: "Completed today",
      value: value("completed"),
      color: "#be3e3f",
      hint: "Paid and closed orders",
    },
  ];
  const kitchen = [
    { title: "Pending", value: value("pending"), color: "#9a6700" },
    { title: "Preparing", value: value("preparing"), color: "#285430" },
    { title: "Ready", value: value("ready"), color: "#087f5b" },
    {
      title: "Awaiting payment",
      value: value("unpaidOrders"),
      color: "#9c36b5",
    },
  ];
  const tables = [
    {
      title: "Occupied tables",
      value: value("activeTables"),
      color: "#b26a00",
    },
    {
      title: "Available tables",
      value: value("availableTables"),
      color: "#2b8a3e",
    },
    {
      title: "Reserved tables",
      value: value("reservedTables"),
      color: "#5f3dc4",
    },
    {
      title: "Cleaning tables",
      value: value("cleaningTables"),
      color: "#495057",
      hint: `${dashboard.totalTables || 0} tables total`,
    },
  ];

  if (!isManagement) return null;

  if (isError) {
    return (
      <div className="container mx-auto px-6">
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-200">
          Dashboard data could not be loaded.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2 px-6 md:px-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-[var(--dash-text)] text-xl">
            Today at {dashboard.restaurantName || "your restaurant"}
          </h2>
          <p className="text-sm text-[var(--dash-muted)]">
            Payment, order, kitchen and table values from the live database.
          </p>
        </div>
        <span className="dashboard-live-pill">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Live today
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-4">
        {operations.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="mt-8">
        <h2 className="font-semibold text-[var(--dash-text)] text-lg">
          Order queue
        </h2>
        <div className="mt-3 grid grid-cols-2 xl:grid-cols-4 gap-4">
          {kitchen.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-semibold text-[var(--dash-text)] text-lg">
          Table status
        </h2>
        <div className="mt-3 grid grid-cols-2 xl:grid-cols-4 gap-4">
          {tables.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Metrics;
