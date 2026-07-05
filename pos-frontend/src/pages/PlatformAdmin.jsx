import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  getErrorMessage,
  getPlatformStats,
  getPlatformUsers,
  getRestaurants,
  updateRestaurantStatus,
  updateRestaurantPlan,
} from "../https";
import {
  MdLocationOn,
  MdOutlineRestaurant,
  MdPeopleAlt,
  MdTableBar,
} from "react-icons/md";
import { FaArrowRight, FaRegCalendarAlt } from "react-icons/fa";
import RestaurantDetailsModal from "../components/admin/RestaurantDetailsModal";
import { formatDateAndTime } from "../utils";

const statusStyles = {
  PENDING: "bg-[#4a452e] text-yellow-300 border-yellow-700",
  APPROVED: "bg-[#2e4a40] text-green-300 border-green-800",
  REJECTED: "bg-[#4a2e2e] text-red-300 border-red-900",
  SUSPENDED: "bg-[#3d354d] text-purple-300 border-purple-900",
};

const PlatformAdmin = () => {
  const [tab, setTab] = useState("Restaurants");
  const [status, setStatus] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [statusDialog, setStatusDialog] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // title set via Helmet
  }, []);

  const statsQuery = useQuery({
    queryKey: ["platform-stats"],
    queryFn: getPlatformStats,
  });
  const restaurantsQuery = useQuery({
    queryKey: ["platform-restaurants", status],
    queryFn: () => getRestaurants(status ? { status } : undefined),
  });
  const usersQuery = useQuery({
    queryKey: ["platform-users"],
    queryFn: () => getPlatformUsers(),
    enabled: tab === "Users",
  });
  const statusMutation = useMutation({
    mutationFn: updateRestaurantStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["platform-restaurant"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      setStatusDialog(null);
      enqueueSnackbar("Restaurant status updated", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const planMutation = useMutation({
    mutationFn: updateRestaurantPlan,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform-restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["platform-restaurant"] });
      enqueueSnackbar(`Plan updated to ${variables.plan}`, { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const stats = statsQuery.data?.data.data;
  const restaurants = restaurantsQuery.data?.data.data || [];
  const statusCounts = Object.fromEntries(
    (stats?.restaurants || []).map((item) => [item.status, item._count._all]),
  );
  const totalRestaurants = Object.values(statusCounts).reduce(
    (sum, value) => sum + value,
    0,
  );

  const requestStatusChange = (restaurantId, restaurantName, nextStatus) => {
    setStatusDialog({
      restaurantId,
      restaurantName,
      nextStatus,
      rejectionReason: "",
    });
  };
  const submitStatusChange = () => {
    if (
      statusDialog.nextStatus === "REJECTED" &&
      statusDialog.rejectionReason.trim().length < 3
    ) {
      enqueueSnackbar("Enter a clear rejection reason", { variant: "warning" });
      return;
    }
    statusMutation.mutate({
      restaurantId: statusDialog.restaurantId,
      status: statusDialog.nextStatus,
      rejectionReason:
        statusDialog.nextStatus === "REJECTED"
          ? statusDialog.rejectionReason.trim()
          : undefined,
    });
  };

  useEffect(() => {
    if (!statusDialog) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setStatusDialog(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [statusDialog]);

  const actionButtons = (restaurant, compact = false) => (
    <>
      {restaurant.status !== "APPROVED" && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            requestStatusChange(restaurant.id, restaurant.name, "APPROVED");
          }}
          className={`${compact ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm"} rounded-lg bg-[#285430] font-semibold text-green-100 hover:bg-[#356b3f]`}
        >
          {restaurant.status === "SUSPENDED" ? "Reactivate" : "Approve"}
        </button>
      )}
      {restaurant.status === "PENDING" && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            requestStatusChange(restaurant.id, restaurant.name, "REJECTED");
          }}
          className={`${compact ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm"} rounded-lg bg-[#b73e3e] font-semibold text-white hover:bg-[#cc4848]`}
        >
          Reject
        </button>
      )}
      {restaurant.status === "APPROVED" && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            requestStatusChange(restaurant.id, restaurant.name, "SUSPENDED");
          }}
          className={`${compact ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm"} rounded-lg bg-[#735f32] font-semibold text-yellow-100 hover:bg-[#866f3a]`}
        >
          Suspend
        </button>
      )}
    </>
  );

  return (
    <section className="min-h-[calc(100vh-5rem)] bg-[#1f1f1f] px-10 py-8 text-[#f5f5f5]">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">
            Platform Control Center
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Restaurant Network</h1>
          <p className="mt-2 text-sm text-[#ababab]">
            Review tenants, monitor operations and control platform access.
          </p>
        </div>
        <div className="flex gap-2 rounded-xl bg-[#1a1a1a] p-1">
          {["Restaurants", "Users"].map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-lg px-6 py-3 font-semibold transition ${
                tab === item
                  ? "bg-[#333] text-white"
                  : "text-[#ababab] hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-5 gap-4">
        {[
          ["Total Restaurants", totalRestaurants, "#025cca"],
          ["Pending Review", statusCounts.PENDING || 0, "#f6b100"],
          ["Platform Users", stats?.users || 0, "#5b45b0"],
          ["Total Orders", stats?.orders || 0, "#285430"],
          [
            "Platform Revenue",
            `₹${Number(stats?.revenue || 0).toFixed(2)}`,
            "#7f167f",
          ],
        ].map(([label, value, color]) => (
          <div
            key={label}
            className="rounded-xl p-5 shadow-lg"
            style={{ backgroundColor: color }}
          >
            <p className="text-xs uppercase tracking-wider text-white opacity-80">
              {label}
            </p>
            <p className="mt-3 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {tab === "Restaurants" ? (
        <>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Restaurants</h2>
              <p className="mt-1 text-sm text-[#777]">
                Showing {restaurants.length} of{" "}
                {restaurantsQuery.data?.data.pagination?.total || 0}
              </p>
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-[#383838] bg-[#262626] px-4 py-3 text-white outline-none"
            >
              <option value="">All statuses</option>
              {["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          {restaurantsQuery.isLoading ? (
            <div className="rounded-xl bg-[#262626] p-12 text-center text-[#ababab]">
              Loading restaurants...
            </div>
          ) : restaurants.length ? (
            <div className="grid grid-cols-3 gap-5">
              {restaurants.map((restaurant) => (
                <article
                  key={restaurant.id}
                  onClick={() => setSelectedRestaurant(restaurant.id)}
                  className="group cursor-pointer rounded-xl border border-[#333] bg-[#262626] p-5 shadow-lg transition hover:-translate-y-1 hover:border-[#555] hover:shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl bg-[#1a1a1a] p-3 text-yellow-400">
                        <MdOutlineRestaurant size={28} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-white">
                          {restaurant.name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#ababab]">
                          <MdLocationOn /> {restaurant.city}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${statusStyles[restaurant.status]}`}
                    >
                      {restaurant.status}
                    </span>
                  </div>

                  {/* Plan badge + inline plan selector for super admin */}
                  <div
                    className="mt-3 flex items-center justify-between rounded-lg bg-[#1f1f1f] px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#777]">Subscription Plan</p>
                      <p className="mt-0.5 font-bold text-sm" style={{
                        color: restaurant.plan === "PROFESSIONAL" ? "#02ca3a"
                             : restaurant.plan === "ENTERPRISE" ? "#f59e0b"
                             : "#6b7280"
                      }}>
                        {restaurant.plan || "STARTER"}
                      </p>
                    </div>
                    <select
                      value={restaurant.plan || "STARTER"}
                      onChange={(e) => {
                        e.stopPropagation();
                        planMutation.mutate({ restaurantId: restaurant.id, plan: e.target.value });
                      }}
                      className="rounded-lg border border-[#383838] bg-[#262626] px-3 py-2 text-xs text-white outline-none cursor-pointer hover:border-[#555] transition"
                      aria-label={`Change plan for ${restaurant.name}`}
                    >
                      <option value="STARTER">Starter (Free)</option>
                      <option value="PROFESSIONAL">Professional (₹2,499/mo)</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </div>

                  <div className="mt-5 rounded-lg bg-[#1f1f1f] p-4">
                    <p className="text-xs uppercase tracking-wider text-[#777]">
                      Owner
                    </p>
                    <p className="mt-1 font-medium text-white">
                      {restaurant.owner?.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#ababab]">
                      {restaurant.owner?.email}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    {[
                      [MdPeopleAlt, restaurant._count.staff, "Staff"],
                      [MdTableBar, restaurant._count.tables, "Tables"],
                      [
                        MdOutlineRestaurant,
                        restaurant._count.menuItems,
                        "Menu",
                      ],
                      [FaArrowRight, restaurant._count.orders, "Orders"],
                    ].map(([Icon, value, label]) => (
                      <div
                        key={label}
                        className="rounded-lg bg-[#1f1f1f] px-2 py-3"
                      >
                        <Icon className="mx-auto text-[#ababab]" size={16} />
                        <p className="mt-1 font-semibold text-white">{value}</p>
                        <p className="text-[10px] text-[#777]">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-[#777]">
                    <FaRegCalendarAlt />
                    {formatDateAndTime(restaurant.createdAt)}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#383838] pt-4">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedRestaurant(restaurant.id);
                      }}
                      className="flex items-center gap-2 text-sm font-semibold text-blue-400 group-hover:text-blue-300"
                    >
                      View Details <FaArrowRight />
                    </button>
                    <div className="flex gap-2">
                      {actionButtons(restaurant, true)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-[#262626] p-12 text-center text-[#ababab]">
              No restaurants match this status.
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl bg-[#262626] p-5">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Platform Users</h2>
            <p className="mt-1 text-sm text-[#777]">
              Account role and tenant assignment overview.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#383838]">
            <div className="grid grid-cols-4 gap-4 bg-[#333] p-3 text-xs uppercase tracking-wider text-[#ababab]">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Tenant</span>
            </div>
            {(usersQuery.data?.data.data || []).map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-4 gap-4 border-t border-[#383838] p-4 text-sm text-[#ababab]"
              >
                <span className="font-medium text-white">{user.name}</span>
                <span>{user.email}</span>
                <span className="font-semibold text-yellow-400">
                  {user.role}
                </span>
                <span>{user.restaurantId || "Platform"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedRestaurant && (
        <RestaurantDetailsModal
          restaurantId={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
          onStatusChange={(restaurantId, nextStatus) => {
            const restaurant = restaurants.find(
              (item) => item.id === restaurantId,
            );
            requestStatusChange(
              restaurantId,
              restaurant?.name || "Restaurant",
              nextStatus,
            );
          }}
          isUpdating={statusMutation.isPending}
        />
      )}

      {statusDialog && (
        <div
          className="dashboard-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Status Change"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setStatusDialog(null);
          }}
        >
          <div className="dashboard-detail-modal w-[460px] rounded-xl p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-wider text-[var(--dash-muted)]">
              Confirm Status Change
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--dash-text)]">
              {statusDialog.nextStatus === "APPROVED"
                ? "Approve restaurant"
                : statusDialog.nextStatus === "SUSPENDED"
                  ? "Suspend restaurant"
                  : "Reject application"}
            </h3>
            <p className="mt-3 text-sm text-[var(--dash-muted)]">
              {statusDialog.restaurantName} will be changed to{" "}
              <strong className="text-[var(--dash-text)]">
                {statusDialog.nextStatus}
              </strong>
              .
            </p>
            {statusDialog.nextStatus === "REJECTED" && (
              <textarea
                value={statusDialog.rejectionReason}
                onChange={(event) =>
                  setStatusDialog({
                    ...statusDialog,
                    rejectionReason: event.target.value,
                  })
                }
                placeholder="Explain why this application is being rejected..."
                rows="4"
                className="dashboard-form-control mt-5 w-full rounded-lg p-4 outline-none"
              />
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStatusDialog(null)}
                className="dashboard-secondary-button rounded-lg px-5 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusMutation.isPending}
                onClick={submitStatusChange}
                className={`rounded-lg px-5 py-2 font-semibold text-white disabled:opacity-50 ${
                  statusDialog.nextStatus === "APPROVED"
                    ? "bg-[#285430]"
                    : statusDialog.nextStatus === "SUSPENDED"
                      ? "bg-[#735f32]"
                      : "bg-[#b73e3e]"
                }`}
              >
                {statusMutation.isPending ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PlatformAdmin;
