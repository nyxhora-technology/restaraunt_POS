import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { MdOutlineRestaurant, MdTableBar, MdVolumeOff, MdVolumeUp } from "react-icons/md";
import {
  getErrorMessage,
  getKitchenOrders,
  updateOrderStatus,
} from "../../https";
import { getOrderTableLabel } from "../tables/tableOptions";

// ── Audio engine ───────────────────────────────────────────────
const playSound = (src) => {
  try {
    const audio = new Audio(src);
    audio.volume = 0.8;
    audio.play().catch(() => {}); // silently ignore if browser blocks
  } catch {
    // No-op if Audio API unavailable
  }
};

// ── Kitchen columns ────────────────────────────────────────────
const columns = [
  {
    status: "PENDING",
    title: "New orders",
    accent: "border-amber-500",
    badge: "bg-amber-500/15 text-amber-300",
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

// Streamlined: PENDING → PREPARING → READY (no mandatory ACCEPTED step)
const actionsByStatus = {
  PENDING: [
    {
      status: "PREPARING",
      label: "Start Cooking",
      className: "bg-purple-600 hover:bg-purple-500",
    },
  ],
  PREPARING: [
    {
      status: "READY",
      label: "Mark Ready",
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
  return `${hours}h ${minutes % 60}m ago`;
};

const CHANGE_COLORS = {
  added: "text-green-400",
  modified: "text-amber-300",
  removed: "text-red-400",
};

const CHANGE_ICONS = {
  added: "+",
  modified: "↑",
  removed: "−",
};

// ── Kitchen order card ────────────────────────────────────────
const KitchenOrderCard = ({ order, onStatusChange, isUpdating, updateDiff, onDismissDiff }) => {
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
  const isUrgent = updateDiff !== null;
  const age = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
  const ageClass = age > 15 ? "text-red-400" : age > 8 ? "text-amber-400" : "text-amber-300";

  return (
    <article
      className={`bg-[#262626] rounded-xl p-4 shadow-lg transition-all duration-300 ${
        isUrgent
          ? "border-2 border-amber-400 shadow-amber-400/30 shadow-lg"
          : "border border-[#383838]"
      }`}
    >
      {/* Update badge */}
      {isUrgent && (
        <div className="flex items-center justify-between mb-3 bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-2">
          <div>
            <p className="text-amber-300 text-xs font-bold uppercase tracking-wider">⚠ Order Updated</p>
            <div className="mt-1 flex flex-col gap-0.5">
              {updateDiff.changedItems.map((item, idx) => (
                <span key={idx} className={`text-xs font-medium ${CHANGE_COLORS[item.change]}`}>
                  {CHANGE_ICONS[item.change]} {item.name}
                  {item.change === "modified" && `: ${item.oldQty} → ${item.newQty}`}
                  {item.change === "added" && `: +${item.newQty}`}
                  {item.change === "removed" && " (removed)"}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onDismissDiff}
            className="text-xs text-amber-400 hover:text-amber-200 font-semibold ml-3 shrink-0 underline"
          >
            Got it
          </button>
        </div>
      )}

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
          <p className={`text-sm font-semibold ${ageClass}`}>{formatAge(order.createdAt)}</p>
          <p className="text-xs text-[#777] mt-1">{itemCount} items</p>
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
              {item.variantLabel && (
                <p className="text-xs text-[#888] mt-0.5">{item.variantLabel}</p>
              )}
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

      {actionsByStatus[order.orderStatus]?.length > 0 && (
        <div className="flex gap-2 mt-4">
          {actionsByStatus[order.orderStatus].map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={isUpdating}
              onClick={() => onStatusChange(order.id, action.status)}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 ${action.className}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
};

// ── Kitchen audio consent ────────────────────────────────────
const AudioConsentBanner = ({ onEnable }) => (
  <div className="flex items-center gap-3 bg-[#2a2a2a] border border-[#444] rounded-xl px-4 py-3">
    <MdVolumeOff className="text-[#ababab] text-xl shrink-0" />
    <p className="text-sm text-[#ababab] flex-1">
      Enable kitchen audio alerts for new orders and item changes.
    </p>
    <button
      type="button"
      onClick={onEnable}
      className="bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg px-4 py-2 transition-colors shrink-0"
    >
      Enable Audio
    </button>
  </div>
);

// ── Main KitchenDashboard ──────────────────────────────────────
const KitchenDashboard = () => {
  const queryClient = useQueryClient();
  const [audioEnabled, setAudioEnabled] = useState(
    () => sessionStorage.getItem("kitchen-audio") === "yes",
  );
  const [muted, setMuted] = useState(false);
  // Map of orderId → { changedItems, timestamp }
  const [orderDiffs, setOrderDiffs] = useState({});
  const prevOrderIds = useRef(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", "kitchen"],
    queryFn: getKitchenOrders,
    refetchInterval: 30000,
  });
  const orders = data?.data.data || [];

  // Detect new orders and play sound
  useEffect(() => {
    if (!data || !audioEnabled || muted) return;
    const currentIds = new Set(orders.map((o) => o.id));
    const hasNew = [...currentIds].some((id) => !prevOrderIds.current.has(id));
    if (hasNew && prevOrderIds.current.size > 0) {
      playSound("/sounds/new-order.wav");
    }
    prevOrderIds.current = currentIds;
  }, [orders, audioEnabled, muted, data]);

  // Listen for order item updates (from socket via window event)
  useEffect(() => {
    const handleItemsUpdated = (event) => {
      const { id, orderNo, changedItems } = event.detail;
      setOrderDiffs((prev) => ({
        ...prev,
        [id]: { changedItems, orderNo, timestamp: Date.now() },
      }));
      if (audioEnabled && !muted) {
        playSound("/sounds/order-modified.wav");
      }
    };
    window.addEventListener("kitchen:order-items-updated", handleItemsUpdated);
    return () => window.removeEventListener("kitchen:order-items-updated", handleItemsUpdated);
  }, [audioEnabled, muted]);

  const mutation = useMutation({
    mutationFn: updateOrderStatus,
    onMutate: async ({ orderId, orderStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["orders", "kitchen"] });
      const prev = queryClient.getQueryData(["orders", "kitchen"]);
      if (prev?.data?.data) {
        queryClient.setQueryData(["orders", "kitchen"], {
          ...prev,
          data: {
            ...prev.data,
            data: prev.data.data.map((o) =>
              o.id === orderId ? { ...o, orderStatus } : o,
            ),
          },
        });
      }
      return { prev };
    },
    onSuccess: (_, variables) => {
      if (variables.orderStatus === "READY" && audioEnabled && !muted) {
        playSound("/sounds/order-served.wav");
      }
    },
    onError: (error, _, context) => {
      if (context?.prev) queryClient.setQueryData(["orders", "kitchen"], context.prev);
      enqueueSnackbar(getErrorMessage(error, "Could not update the order"), {
        variant: "error",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const handleEnable = () => {
    sessionStorage.setItem("kitchen-audio", "yes");
    setAudioEnabled(true);
    // Unlock audio context with the user gesture
    playSound("/sounds/new-order.wav");
  };

  return (
    <main className="bg-[#1f1f1f] min-h-[calc(100vh-5rem)] px-6 py-5 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Kitchen Display</h1>
          <p className="text-sm text-[#ababab] mt-1">
            Live preparation queue · updates automatically
          </p>
        </div>
        <div className="flex items-center gap-3">
          {audioEnabled && (
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              title={muted ? "Unmute kitchen audio" : "Mute kitchen audio"}
              className="flex items-center gap-2 bg-[#2a2a2a] border border-[#383838] rounded-lg px-3 py-2 text-sm text-[#ababab] hover:text-white transition-colors"
            >
              {muted ? <MdVolumeOff /> : <MdVolumeUp />}
              {muted ? "Muted" : "Audio on"}
            </button>
          )}
          <div className="flex items-center gap-2 bg-[#262626] rounded-lg px-4 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-[#d1d1d1]">
              {orders.length} active orders
            </span>
          </div>
        </div>
      </div>

      {/* Audio consent */}
      {!audioEnabled && (
        <div className="mb-4">
          <AudioConsentBanner onEnable={handleEnable} />
        </div>
      )}

      {isLoading ? (
        <p className="text-[#ababab]">Loading kitchen orders…</p>
      ) : isError ? (
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-200">
          Kitchen orders could not be loaded. Check the connection and try again.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                        onStatusChange={(orderId, orderStatus) =>
                          mutation.mutate({ orderId, orderStatus })
                        }
                        isUpdating={
                          mutation.isPending &&
                          mutation.variables?.orderId === order.id
                        }
                        updateDiff={orderDiffs[order.id] || null}
                        onDismissDiff={() =>
                          setOrderDiffs((prev) => {
                            const next = { ...prev };
                            delete next[order.id];
                            return next;
                          })
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
