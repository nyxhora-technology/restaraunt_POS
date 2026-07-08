import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IoMdClose, IoMdCheckmark } from "react-icons/io";
import { MdOutlineReceiptLong } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getInventoryAlerts, markAlertRead, markAllAlertsRead } from "../../https";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const NotificationsPanel = ({
  isOpen,
  onClose,
  orderCount,
  canViewInventoryAlerts = false,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSelector((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-alerts", user.restaurantId, user.role],
    queryFn: () =>
      canViewInventoryAlerts
        ? getInventoryAlerts()
        : Promise.resolve({ data: { data: [], unreadCount: 0 } }),
    enabled: Boolean(
      isOpen &&
        user.isAuth &&
        user.restaurantId &&
        canViewInventoryAlerts,
    ),
  });

  const markReadMutation = useMutation({
    mutationFn: markAlertRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllAlertsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] }),
  });

  const alerts = data?.data.data || [];
  const unreadAlerts = alerts.filter(a => !a.isRead);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-40" 
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-[400px] bg-[var(--dash-surface)] shadow-2xl z-50 flex flex-col border-l border-[var(--dash-border)] animate-slide-left text-[var(--dash-text)]">
        <div className="flex justify-between items-center p-5 border-b border-[var(--dash-border)]">
          <h2 className="text-[var(--dash-text)] text-xl font-bold">Notifications</h2>
          <button onClick={onClose} className="text-[var(--dash-muted)] hover:text-[var(--dash-text)]">
            <IoMdClose size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {orderCount > 0 && (
            <div 
              className="bg-[var(--dash-bg)] p-4 rounded-lg cursor-pointer hover:bg-[var(--dash-surface-muted)] transition-colors border border-[var(--primary)]"
              onClick={() => {
                navigate("/app/orders");
                onClose();
              }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-[var(--primary)] bg-opacity-20 p-2 rounded-full text-[var(--primary)]">
                  <MdOutlineReceiptLong size={20} />
                </div>
                <div>
                  <h3 className="text-[var(--dash-text)] font-semibold">New Pending Orders</h3>
                  <p className="text-[var(--dash-muted)] text-sm">You have {orderCount} pending order{orderCount > 1 ? 's' : ''} to review.</p>
                </div>
              </div>
            </div>
          )}

          {canViewInventoryAlerts && (
            <>
              <div className="flex justify-between items-center mt-2">
                <h3 className="text-[var(--dash-muted)] text-sm font-semibold uppercase tracking-wider">
                  Inventory Alerts
                </h3>
                {unreadAlerts.length > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className="text-[var(--primary)] text-xs hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="text-center text-[var(--dash-muted)] py-4">
                  Loading alerts...
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center text-[var(--dash-muted)] py-8 border border-dashed border-[var(--dash-border)] rounded-lg">
                  No inventory alerts right now.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      !alert.isRead
                        ? "border-[var(--dash-primary-soft)] bg-[var(--dash-surface-muted)]"
                        : "border-transparent bg-[var(--dash-bg)] opacity-70"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            !alert.isRead
                              ? "text-[var(--dash-text)] font-medium"
                              : "text-[var(--dash-muted)]"
                          }`}
                        >
                          {alert.message}
                        </p>
                        <p className="text-xs text-[var(--dash-muted)] mt-2">
                          {dayjs(alert.createdAt).fromNow()}
                        </p>
                      </div>
                      {!alert.isRead && (
                        <button
                          onClick={() => markReadMutation.mutate(alert.id)}
                          className="text-[var(--dash-muted)] hover:text-[var(--primary)] p-1 bg-[var(--dash-surface)] rounded"
                          title="Mark as read"
                        >
                          <IoMdCheckmark size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {!orderCount && !canViewInventoryAlerts && (
            <div className="text-center text-[var(--dash-muted)] py-8 border border-dashed border-[var(--dash-border)] rounded-lg">
              No notifications right now.
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsPanel;
