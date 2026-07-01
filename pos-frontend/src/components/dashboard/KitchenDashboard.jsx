import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { MdOutlineRestaurant, MdTableBar } from "react-icons/md";
import {
  getErrorMessage,
  getKitchenOrders,
  updateOrderStatus,
} from "../../https";
import { getOrderTableLabel } from "../tables/tableOptions";

const columns = [
  {
    status: "PENDING",
    title: "New orders",
    accent: "border-amber-500",
    badge: "bg-amber-500/15 text-amber-300",
  },
  {
    status: "ACCEPTED",
    title: "Accepted",
    accent: "border-blue-500",
    badge: "bg-blue-500/15 text-blue-300",
  },
  {
    status: "PREPARING",
    title: "Preparing",
    accent: "border-purple-500",
    badge: "bg-purple-500/15 text-purple-300",
  },
  {
    status: "READY",
    title: "Ready for pickup",
    accent: "border-green-500",
    badge: "bg-green-500/15 text-green-300",
  },
];

const actionsByStatus = {
  PENDING: [
    {
      status: "ACCEPTED",
      label: "Accept",
      className: "bg-blue-600 hover:bg-blue-500",
    },
    {
      status: "REJECTED",
      label: "Reject",
      className: "bg-red-950 hover:bg-red-900 text-red-200",
    },
  ],
  ACCEPTED: [
    {
      status: "PREPARING",
      label: "Start preparing",
      className: "bg-purple-600 hover:bg-purple-500",
    },
    {
      status: "READY",
      label: "Mark ready",
      className: "bg-green-700 hover:bg-green-600",
    },
  ],
  PREPARING: [
    {
      status: "READY",
      label: "Mark ready",
      className: "bg-green-700 hover:bg-green-600",
    },
  ],
  READY: [],
};

const formatAge = (createdAt) => {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000),
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m ago`;
};

const KitchenOrderCard = ({ order, onStatusChange, isUpdating }) => {
  const itemCount = order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <article className="bg-[#262626] border border-[#383838] rounded-xl p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-bold text-white">Order #{order.orderNo}</p>
          <div className="flex items-center gap-2 text-sm text-[#ababab] mt-1">
            {order.orderType === "TAKEAWAY" ? (
              <MdOutlineRestaurant />
            ) : (
              <MdTableBar />
            )}
            <span>
              {order.orderType === "TAKEAWAY"
                ? "Takeaway"
                : getOrderTableLabel(order, "Table —")}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-amber-300">{formatAge(order.createdAt)}</p>
          <p className="text-xs text-[#777] mt-1">{itemCount} total items</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between gap-4 bg-[#1f1f1f] rounded-lg px-3 py-2"
          >
            <div>
              <p className="text-[#f5f5f5] font-medium">{item.name}</p>
              {item.note && (
                <p className="text-xs text-amber-300 mt-1">Note: {item.note}</p>
              )}
            </div>
            <span className="text-lg font-bold text-white shrink-0">
              ×{item.quantity}
            </span>
          </div>
        ))}
      </div>

      {order.kitchenNote && (
        <div className="mt-3 rounded-lg border border-amber-800 bg-amber-950/40 p-3">
          <p className="text-xs uppercase tracking-wide text-amber-400">
            Kitchen note
          </p>
          <p className="text-sm text-amber-100 mt-1">{order.kitchenNote}</p>
        </div>
      )}

      {actionsByStatus[order.orderStatus].length > 0 && (
        <div className="flex gap-2 mt-4">
          {actionsByStatus[order.orderStatus].map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={isUpdating}
              onClick={() => onStatusChange(order.id, action.status)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${action.className}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
};

const KitchenDashboard = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", "kitchen"],
    queryFn: getKitchenOrders,
    refetchInterval: 30000,
  });
  const orders = data?.data.data || [];
  const mutation = useMutation({
    mutationFn: updateOrderStatus,
    onMutate: async ({ orderId, orderStatus }) => {
      // Cancel outgoing refetches so they don't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey: ["orders", "kitchen"] });

      // Snapshot previous data
      const previousOrders = queryClient.getQueryData(["orders", "kitchen"]);

      // Optimistically update the UI instantly
      if (previousOrders?.data?.data) {
        queryClient.setQueryData(["orders", "kitchen"], {
          ...previousOrders,
          data: {
            ...previousOrders.data,
            data: previousOrders.data.data.map((order) =>
              order.id === orderId ? { ...order, orderStatus } : order
            ),
          },
        });
      }

      // Return context for rollback if it fails
      return { previousOrders };
    },
    onError: (error, variables, context) => {
      // Rollback to the previous state on error
      if (context?.previousOrders) {
        queryClient.setQueryData(["orders", "kitchen"], context.previousOrders);
      }
      enqueueSnackbar(getErrorMessage(error, "Could not update the order"), {
        variant: "error",
      });
    },
    onSettled: () => {
      // Sync with server in the background
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const handleStatusChange = (orderId, orderStatus) => {
    mutation.mutate({ orderId, orderStatus });
  };

  return (
    <main className="bg-[#1f1f1f] min-h-[calc(100vh-5rem)] px-6 py-5 text-white">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Kitchen display</h1>
          <p className="text-sm text-[#ababab] mt-1">
            Live preparation queue. New orders update automatically.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#262626] rounded-lg px-4 py-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-[#d1d1d1]">
            {orders.length} active orders
          </span>
        </div>
      </div>

      {isLoading ? (
        <p className="text-[#ababab]">Loading kitchen orders…</p>
      ) : isError ? (
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-200">
          Kitchen orders could not be loaded. Check the connection and try
          again.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
          {columns.map((column) => {
            const columnOrders = orders.filter(
              (order) => order.orderStatus === column.status,
            );
            return (
              <section
                key={column.status}
                className={`bg-[#1a1a1a] rounded-xl border-t-4 ${column.accent} min-h-[320px]`}
              >
                <div className="flex items-center justify-between p-4 border-b border-[#303030]">
                  <h2 className="font-semibold">{column.title}</h2>
                  <span
                    className={`text-xs font-bold rounded-full px-2.5 py-1 ${column.badge}`}
                  >
                    {columnOrders.length}
                  </span>
                </div>
                <div className="p-3 space-y-3 max-h-[calc(100vh-13rem)] overflow-y-auto scrollbar-hide">
                  {columnOrders.length ? (
                    columnOrders.map((order) => (
                      <KitchenOrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={handleStatusChange}
                        isUpdating={
                          mutation.isPending &&
                          mutation.variables?.orderId === order.id
                        }
                      />
                    ))
                  ) : (
                    <p className="text-sm text-[#666] text-center py-10">
                      No {column.title.toLowerCase()}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default KitchenDashboard;
