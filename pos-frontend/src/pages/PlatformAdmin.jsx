import React, { useEffect, useState } from "react";
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
import Header from "../components/shared/Header";
import CustomSelect from "../components/shared/CustomSelect";
import useDashboardPreferences from "../hooks/useDashboardPreferences";

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
  const { theme } = useDashboardPreferences();

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    return () => {
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, [theme]);

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
    <div className={`dashboard-shell theme-${theme} flex flex-col min-h-screen bg-[var(--dash-bg)] text-[var(--dash-text)]`}>
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 md:px-10">
        <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--dash-primary)] font-semibold">
              Platform Control Center
            </p>
            <h1 className="mt-2 text-3xl font-bold">Restaurant Network</h1>
            <p className="mt-2 text-sm text-[var(--dash-muted)]">
              Review tenants, monitor operations and control platform access.
            </p>
          </div>
          <div className="flex gap-2 rounded-xl bg-[var(--dash-surface-muted)] p-1 border border-[var(--dash-border)]">
            {["Restaurants", "Users"].map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-lg px-6 py-2.5 font-semibold transition-all ${
                  tab === item
                    ? "bg-[var(--dash-surface)] text-[var(--dash-primary-strong)] shadow-sm"
                    : "text-[var(--dash-muted)] hover:text-[var(--dash-text)]"
                }`}
              >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          ["Total Restaurants", totalRestaurants, "var(--dash-primary)"],
          ["Pending Review", statusCounts.PENDING || 0, "#f59e0b"],
          ["Platform Users", stats?.users || 0, "#8b5cf6"],
          ["Total Orders", stats?.orders || 0, "#10b981"],
          [
            "Platform Revenue",
            `₹${Number(stats?.revenue || 0).toFixed(2)}`,
            "#ec4899",
          ],
        ].map(([label, value, color]) => (
          <div
            key={label}
            className="dashboard-panel p-5 flex flex-col justify-between border-t-4"
            style={{ borderTopColor: color }}
          >
            <p className="text-xs uppercase tracking-wider text-[var(--dash-muted)] font-semibold">
              {label}
            </p>
            <p className="mt-3 text-2xl font-bold text-[var(--dash-text)]">{value}</p>
          </div>
        ))}
      </div>

      {tab === "Restaurants" ? (
        <>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Restaurants</h2>
              <p className="mt-1 text-sm text-[var(--dash-muted)]">
                Showing {restaurants.length} of{" "}
                {restaurantsQuery.data?.data.pagination?.total || 0}
              </p>
            </div>
            <div className="w-48">
              <CustomSelect
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                options={[
                  { value: "", label: "All statuses" },
                  ...["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map((item) => ({
                    value: item,
                    label: item,
                  }))
                ]}
              />
            </div>
          </div>

          {restaurantsQuery.isLoading ? (
            <div className="dashboard-panel p-12 text-center text-[var(--dash-muted)]">
              Loading restaurants...
            </div>
          ) : restaurants.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {restaurants.map((restaurant) => (
                <article
                  key={restaurant.id}
                  onClick={() => setSelectedRestaurant(restaurant.id)}
                  className="dashboard-panel p-5 cursor-pointer transition-all hover:border-[var(--dash-primary)] hover:shadow-md group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl bg-[var(--dash-primary-soft)] p-3 text-[var(--dash-primary-strong)]">
                        <MdOutlineRestaurant size={24} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-[var(--dash-text)]">
                          {restaurant.name}
                        </h3>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--dash-muted)] font-medium">
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
                    className="mt-4 flex items-center justify-between rounded-lg bg-[var(--dash-surface-muted)] px-4 py-3 border border-[var(--dash-border)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--dash-muted)] font-semibold">Subscription Plan</p>
                      <p className="mt-0.5 font-bold text-sm" style={{
                        color: restaurant.plan === "PROFESSIONAL" ? "var(--dash-primary)"
                             : restaurant.plan === "ENTERPRISE" ? "#f59e0b"
                             : "var(--dash-muted)"
                      }}>
                        {restaurant.plan || "STARTER"}
                      </p>
                    </div>
                    <div className="w-36">
                      <CustomSelect
                        value={restaurant.plan || "STARTER"}
                        onChange={(e) => {
                          e.stopPropagation();
                          planMutation.mutate({ restaurantId: restaurant.id, plan: e.target.value });
                        }}
                        options={[
                          { value: "STARTER", label: "Starter (Free)" },
                          { value: "PROFESSIONAL", label: "Professional (₹2,499/mo)" },
                          { value: "ENTERPRISE", label: "Enterprise" }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-[var(--dash-surface-muted)] p-3.5 border border-[var(--dash-border)]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-muted)]">
                      Owner
                    </p>
                    <p className="mt-1 font-medium text-[var(--dash-text)] text-sm">
                      {restaurant.owner?.name}
                    </p>
                    <p className="truncate text-xs text-[var(--dash-muted)]">
                      {restaurant.owner?.email}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
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
                        className="rounded-lg bg-[var(--dash-bg)] px-2 py-3 border border-[var(--dash-border)]"
                      >
                        <Icon className="mx-auto text-[var(--dash-muted)]" size={16} />
                        <p className="mt-1 font-semibold text-[var(--dash-text)]">{value}</p>
                        <p className="text-[10px] text-[var(--dash-muted)] font-medium">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--dash-muted)] font-medium">
                    <FaRegCalendarAlt />
                    {formatDateAndTime(restaurant.createdAt)}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--dash-border)] pt-4">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedRestaurant(restaurant.id);
                      }}
                      className="flex items-center gap-2 text-sm font-semibold text-[var(--dash-primary)] group-hover:text-[var(--dash-primary-strong)] transition-colors"
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
            <div className="dashboard-panel p-12 text-center text-[var(--dash-muted)]">
              No restaurants match this status.
            </div>
          )}
        </>
      ) : (
        <div className="dashboard-panel p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Platform Users</h2>
            <p className="mt-1 text-sm text-[var(--dash-muted)]">
              Account role and tenant assignment overview.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--dash-border)]">
            <div className="grid grid-cols-4 gap-4 bg-[var(--dash-surface-muted)] p-4 text-xs font-semibold uppercase tracking-wider text-[var(--dash-muted)]">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Tenant</span>
            </div>
            {(usersQuery.data?.data.data || []).map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-4 gap-4 border-t border-[var(--dash-border)] p-4 text-sm text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-surface-muted)]"
              >
                <span className="font-medium">{user.name}</span>
                <span className="text-[var(--dash-muted)]">{user.email}</span>
                <span className="font-semibold text-[var(--dash-primary)]">
                  {user.role}
                </span>
                <span className="text-[var(--dash-muted)]">{user.restaurantId || "Platform"}</span>
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
      </main>
    </div>
  );
};

export default PlatformAdmin;
