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
import CustomSelect from "../shared/CustomSelect";

const transitions = {
  OWNER: {
    PENDING: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "CANCELLED"],
    SERVED: ["CANCELLED"],
  },
  MANAGER: {
    PENDING: ["PREPARING", "CANCELLED"],
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
          <div className="w-36">
            <CustomSelect
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              options={[
                { value: "desc", label: "Newest first" },
                { value: "asc", label: "Oldest first" },
              ]}
            />
          </div>
          <div className="w-28">
            <CustomSelect
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              options={[
                { value: 10, label: "Top 10" },
                { value: 20, label: "Top 20" },
                { value: 50, label: "Top 50" },
                { value: 100, label: "Top 100" },
              ]}
            />
          </div>
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
                  <div className="w-40">
                    <CustomSelect
                      className={order.orderStatus === "READY" ? "text-green-500" : "text-yellow-500"}
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
                      options={[
                        { value: order.orderStatus, label: order.orderStatus.replaceAll("_", " ") },
                        ...(transitions[role]?.[order.orderStatus] || []).map(status => ({
                          value: status,
                          label: `Mark ${status.replaceAll("_", " ")}`
                        }))
                      ]}
                    />
                  </div>
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
