import React, { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IoMdClose } from "react-icons/io";
import {
  getRestaurant,
  updateRestaurantPlan,
  getErrorMessage,
} from "../../https";
import { formatDateAndTime } from "../../utils";
import { enqueueSnackbar } from "notistack";

const statusStyles = {
  PENDING: "bg-[#4a452e] text-yellow-300",
  APPROVED: "bg-[#2e4a40] text-green-300",
  REJECTED: "bg-[#4a2e2e] text-red-300",
  SUSPENDED: "bg-[#3d354d] text-purple-300",
};

const Detail = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dash-muted)]">{label}</p>
    <p className="text-[var(--dash-text)] mt-1 break-words font-medium">{value || "Not provided"}</p>
  </div>
);

const RestaurantDetailsModal = ({
  restaurantId,
  onClose,
  onStatusChange,
  isUpdating,
}) => {
  const queryClient = useQueryClient();
  const restaurantQuery = useQuery({
    queryKey: ["platform-restaurant", restaurantId],
    queryFn: () => getRestaurant(restaurantId),
  });
  const restaurant = restaurantQuery.data?.data.data;

  const planMutation = useMutation({
    mutationFn: updateRestaurantPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["platform-restaurant", restaurantId],
      });
      queryClient.invalidateQueries({ queryKey: ["platform-restaurants"] });
      enqueueSnackbar("Plan updated successfully", { variant: "success" });
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="dashboard-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Restaurant Details"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dashboard-detail-modal w-full max-w-[920px] max-h-[90vh] overflow-y-auto scrollbar-hide rounded-xl shadow-2xl bg-[var(--dash-bg)] border border-[var(--dash-border)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-7 py-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dash-primary)]">
              Restaurant Details
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--dash-text)]">
              {restaurant?.name || "Loading..."}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="dashboard-secondary-button rounded-lg p-2"
          >
            <IoMdClose size={26} />
          </button>
        </div>

        {restaurantQuery.isLoading ? (
          <p className="p-10 text-center text-[var(--dash-muted)]">
            Loading restaurant details...
          </p>
        ) : restaurantQuery.isError ? (
          <p className="p-10 text-center text-red-500 font-medium">
            Unable to load restaurant details.
          </p>
        ) : (
          <div className="p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 dashboard-panel p-5">
              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wide ${statusStyles[restaurant.status]}`}
                >
                  {restaurant.status}
                </span>
                <p className="mt-3 text-sm text-[var(--dash-muted)] font-medium">
                  Registered {formatDateAndTime(restaurant.createdAt)}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xs font-semibold text-[var(--dash-muted)] uppercase tracking-wider">
                    Plan:
                  </span>
                  <select
                    value={restaurant.plan || "STARTER"}
                    onChange={(e) =>
                      planMutation.mutate({
                        restaurantId,
                        plan: e.target.value,
                      })
                    }
                    disabled={planMutation.isPending}
                    className="bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] text-[var(--dash-text)] text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--dash-primary)] transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <option value="STARTER">Starter</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {restaurant.status !== "APPROVED" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => onStatusChange(restaurant.id, "APPROVED")}
                    className="rounded-lg bg-[#285430] px-5 py-2 font-semibold text-green-100 disabled:opacity-50"
                  >
                    {restaurant.status === "SUSPENDED"
                      ? "Reactivate"
                      : "Approve"}
                  </button>
                )}
                {restaurant.status === "PENDING" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => onStatusChange(restaurant.id, "REJECTED")}
                    className="rounded-lg bg-[#b73e3e] px-5 py-2 font-semibold text-white disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
                {restaurant.status === "APPROVED" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => onStatusChange(restaurant.id, "SUSPENDED")}
                    className="rounded-lg bg-[#735f32] px-5 py-2 font-semibold text-yellow-100 disabled:opacity-50"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>

            {restaurant.rejectionReason && (
              <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                  Rejection reason
                </p>
                <p className="mt-1 text-[var(--dash-text)] font-medium">
                  {restaurant.rejectionReason}
                </p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["Staff", restaurant.staff.length, "#8b5cf6"],
                ["Tables", restaurant._count.tables, "#ec4899"],
                ["Menu Items", restaurant._count.menuItems, "#10b981"],
                ["Orders", restaurant._count.orders, "var(--dash-primary)"],
              ].map(([label, value, color]) => (
                <div
                  key={label}
                  className="dashboard-panel p-4 border-l-4"
                  style={{ borderLeftColor: color }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dash-muted)]">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--dash-text)]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="dashboard-panel p-6">
                <h3 className="mb-5 text-lg font-bold text-[var(--dash-text)]">
                  Restaurant Information
                </h3>
                <div className="grid grid-cols-2 gap-5">
                  <Detail label="Email" value={restaurant.email} />
                  <Detail label="Phone" value={restaurant.phone} />
                  <Detail label="City" value={restaurant.city} />
                  <Detail label="Slug" value={restaurant.slug} />
                  <div className="col-span-2">
                    <Detail label="Address" value={restaurant.address} />
                  </div>
                  <div className="col-span-2">
                    <Detail
                      label="Description"
                      value={restaurant.description}
                    />
                  </div>
                </div>
              </section>

              <section className="dashboard-panel p-6">
                <h3 className="mb-5 text-lg font-bold text-[var(--dash-text)]">Owner</h3>
                <div className="grid grid-cols-2 gap-5">
                  <Detail label="Name" value={restaurant.owner?.name} />
                  <Detail label="Phone" value={restaurant.owner?.phone} />
                  <div className="col-span-2">
                    <Detail label="Email" value={restaurant.owner?.email} />
                  </div>
                </div>
                <h3 className="mb-4 mt-8 text-lg font-bold text-[var(--dash-text)] border-t border-[var(--dash-border)] pt-6">
                  Staff ({restaurant.staff.length})
                </h3>
                <div className="max-h-[180px] overflow-y-auto scrollbar-hide pr-2">
                  {restaurant.staff.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between border-b border-[var(--dash-border)] py-3 last:border-0"
                    >
                      <div>
                        <p className="text-[var(--dash-text)] font-medium">{staff.name}</p>
                        <p className="text-xs text-[var(--dash-muted)] mt-0.5">{staff.email}</p>
                      </div>
                      <span className="text-[11px] px-2 py-1 bg-[var(--dash-surface-muted)] rounded-md font-semibold text-[var(--dash-primary)]">
                        {staff.role}
                      </span>
                    </div>
                  ))}
                  {!restaurant.staff.length && (
                    <p className="text-sm text-[var(--dash-muted)] italic">No staff accounts.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetailsModal;
