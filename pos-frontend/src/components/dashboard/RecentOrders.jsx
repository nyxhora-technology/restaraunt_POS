import React, { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  getErrorMessage,
  getOrders,
  updateOrderStatus,
} from "../../https/index";
import { formatDateAndTime } from "../../utils";
import useRoleDashboard from "../../hooks/useRoleDashboard";
import { getOrderTableLabel } from "../tables/tableOptions";

const transitions = {
  OWNER: {
    PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
    ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "CANCELLED"],
    SERVED: ["CANCELLED"],
  },
  MANAGER: {
    PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
    ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "CANCELLED"],
    SERVED: ["CANCELLED"],
  },
  CASHIER: { PENDING: ["CANCELLED"], READY: ["SERVED"] },
  WAITER: { PENDING: ["CANCELLED"], READY: ["SERVED"] },
};

const RecentOrders = () => {
  const queryClient = useQueryClient();
  const { role, canViewFinance } = useRoleDashboard();
  const orderStatusUpdateMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      enqueueSnackbar("Order status updated successfully", {
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, "Failed to update order status"), {
        variant: "error",
      });
    },
  });

  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc");
  const {
    data: resData,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["orders", "management", limit, sortOrder],
    queryFn: () => getOrders({ limit, sortOrder, sortBy: "createdAt" }),
    placeholderData: keepPreviousData,
  });
  const orders = resData?.data.data || [];

  return (
    <div className="dashboard-management-panel container mx-auto p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[var(--dash-text)] text-xl font-semibold">
            Manage orders
          </h2>
          <p className="text-sm text-[var(--dash-muted)]">
            Move orders only through the next allowed status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-[var(--dash-surface-muted)] text-[var(--dash-text)] border border-[var(--dash-border)] rounded px-2 py-1 text-sm focus:outline-none"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-[var(--dash-surface-muted)] text-[var(--dash-text)] border border-[var(--dash-border)] rounded px-2 py-1 text-sm focus:outline-none"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
          <span className="text-sm text-[var(--dash-muted)]">
            {orders.length} shown
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="dashboard-management-table w-full text-left">
          <thead>
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date & time</th>
              <th className="p-3">Items</th>
              <th className="p-3">Service</th>
              {canViewFinance && <th className="p-3">Total</th>}
              {canViewFinance && <th className="p-3">Payment</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-[var(--dash-border)]"
              >
                <td className="p-4">#{order.orderNo}</td>
                <td className="p-4">
                  <p>{order.customerName}</p>
                  <p className="text-xs text-[var(--dash-muted)]">
                    {order.customerPhone || "No phone"}
                  </p>
                </td>
                <td className="p-4">
                  <select
                    className={`dashboard-table-select p-2 rounded-lg focus:outline-none ${
                      order.orderStatus === "READY"
                        ? "text-green-500"
                        : "text-yellow-500"
                    }`}
                    value={order.orderStatus}
                    disabled={
                      orderStatusUpdateMutation.isPending &&
                      orderStatusUpdateMutation.variables?.orderId === order.id
                    }
                    onChange={(event) =>
                      orderStatusUpdateMutation.mutate({
                        orderId: order.id,
                        orderStatus: event.target.value,
                      })
                    }
                  >
                    <option value={order.orderStatus}>
                      {order.orderStatus.replaceAll("_", " ")}
                    </option>
                    {(transitions[role]?.[order.orderStatus] || []).map(
                      (status) => (
                        <option key={status} value={status}>
                          Mark {status.replaceAll("_", " ")}
                        </option>
                      ),
                    )}
                  </select>
                </td>
                <td className="p-4">{formatDateAndTime(order.createdAt)}</td>
                <td className="p-4">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  items
                </td>
                <td className="p-4">
                  {order.orderType === "TAKEAWAY"
                    ? "Takeaway"
                    : getOrderTableLabel(order, "Table —")}
                </td>
                {canViewFinance && (
                  <td className="p-4">
                    ₹{Number(order.totalWithTax).toFixed(2)}
                  </td>
                )}
                {canViewFinance && (
                  <td className="p-4">
                    <p>{order.paymentMethod || "Not paid"}</p>
                    <p
                      className={`text-xs ${
                        order.paymentStatus === "PAID"
                          ? "text-green-400"
                          : "text-amber-300"
                      }`}
                    >
                      {order.paymentStatus}
                    </p>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <p className="p-6 text-center text-[#ababab]">Loading orders…</p>
        )}
        {isError && (
          <p className="p-6 text-center text-red-300">
            Orders could not be loaded.
          </p>
        )}
        {!isLoading && !isError && orders.length === 0 && (
          <p className="p-6 text-center text-[var(--dash-muted)]">
            No orders yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default RecentOrders;
