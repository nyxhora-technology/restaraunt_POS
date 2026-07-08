import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MdDarkMode,
  MdKeyboardArrowDown,
  MdLightMode,
  MdLogout,
  MdMenu,
  MdNotificationsNone,
  MdOutlineAdminPanelSettings,
  MdOutlineSettings,
  MdSearch,
  MdViewSidebar,
  MdViewStream,
} from "react-icons/md";
import { logout, getInventoryAlerts } from "../../https";
import { removeUser } from "../../redux/slices/userSlice";
import NotificationsPanel from "./NotificationsPanel";
import useRole from "../../hooks/useRole";
import useFeature from "../../hooks/useFeature";

const DashboardTopbar = ({
  theme,
  onToggleTheme,
  layout,
  onToggleLayout,
  isMobile,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenSearch,
  notificationCount = 0,
}) => {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileRef = useRef(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { isManagement } = useRole();
  const { hasInventory } = useFeature();
  const canViewInventoryAlerts = isManagement && hasInventory;
  const displayName = user.name || user.email || "User";
  const displayEmail = user.email || "Signed in";
  const displayRole = user.role || "Staff";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "U";

  const alertsQuery = useQuery({
    queryKey: ["inventory-alerts", user.restaurantId, user.role],
    queryFn: () =>
      canViewInventoryAlerts
        ? getInventoryAlerts()
        : Promise.resolve({ data: { data: [], unreadCount: 0 } }),
    enabled: Boolean(
      user.isAuth && user.restaurantId && canViewInventoryAlerts,
    ),
  });

  const totalNotifications =
    notificationCount + (alertsQuery.data?.data.unreadCount || 0);
  const showNotifications =
    canViewInventoryAlerts || totalNotifications > 0;

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
      dispatch(removeUser());
      navigate("/auth");
    },
  });

  useEffect(() => {
    if (!isProfileOpen) return undefined;
    const closeProfile = (event) => {
      if (!profileRef.current?.contains(event.target)) setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", closeProfile);
    return () => document.removeEventListener("mousedown", closeProfile);
  }, [isProfileOpen]);

  const goTo = (path) => {
    setIsProfileOpen(false);
    navigate(path);
  };

  return (
    <>
      <header className="dashboard-topbar">
      <div className="dashboard-topbar-leading">
        {!isMobile && (
          <button
            type="button"
            className="dashboard-layout-button"
            onClick={layout === "sidebar" ? onToggleSidebar : onToggleLayout}
            title={
              layout === "sidebar"
                ? isSidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
                : "Restore sidebar navigation"
            }
            aria-label={
              layout === "sidebar"
                ? isSidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
                : "Restore sidebar navigation"
            }
          >
            <MdMenu />
          </button>
        )}
        <button
          type="button"
          className="dashboard-topbar-search"
          onClick={onOpenSearch}
          aria-label="Open global search"
        >
          <MdSearch />
          <span>Search orders, customers, tables...</span>
          <kbd>Ctrl K</kbd>
        </button>
      </div>

      <div className="dashboard-topbar-actions">
        {!isMobile && (
          <button
            type="button"
            className="dashboard-icon-button"
            onClick={onToggleLayout}
            title={
              layout === "sidebar"
                ? "Use bottom navigation"
                : "Use sidebar navigation"
            }
            aria-label={
              layout === "sidebar"
                ? "Use bottom navigation"
                : "Use sidebar navigation"
            }
          >
            {layout === "sidebar" ? <MdViewStream /> : <MdViewSidebar />}
          </button>
        )}
        <button
          type="button"
          className="dashboard-icon-button"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Use light theme" : "Use dark theme"}
          aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
        >
          {theme === "dark" ? <MdLightMode /> : <MdDarkMode />}
        </button>

        {showNotifications && (
          <button
            type="button"
            className="dashboard-icon-button dashboard-notification"
            onClick={() => setIsNotificationsOpen(true)}
            aria-label={`${totalNotifications} unread notifications`}
            title="View notifications"
          >
            <MdNotificationsNone />
            {totalNotifications > 0 && (
              <span>{Math.min(totalNotifications, 99)}</span>
            )}
          </button>
        )}

        <div className="dashboard-profile" ref={profileRef}>
          <button
            type="button"
            className="dashboard-user"
            onClick={() => setIsProfileOpen((value) => !value)}
            aria-expanded={isProfileOpen}
            aria-label={`Logged in as ${displayName}`}
            title={`Logged in as ${displayName}${user.email ? ` (${user.email})` : ""}`}
          >
            <span className="dashboard-user-avatar">
              {avatarInitial}
            </span>
            <MdKeyboardArrowDown
              className={isProfileOpen ? "is-rotated" : ""}
            />
          </button>

          {isProfileOpen && (
            <div className="dashboard-profile-menu">
              <div>
                <strong>{displayName}</strong>
                <span>{displayEmail}</span>
                <small>{displayRole}</small>
              </div>
              <button type="button" onClick={() => goTo("/app/settings")}>
                <MdOutlineSettings /> Settings
              </button>
              {isManagement && (
                <button type="button" onClick={() => goTo("/app/dashboard")}>
                  <MdOutlineAdminPanelSettings /> Admin Workspace
                </button>
              )}
              {!isMobile && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onToggleLayout();
                  }}
                >
                  {layout === "sidebar" ? <MdViewStream /> : <MdViewSidebar />}
                  {layout === "sidebar"
                    ? "Use bottom navigation"
                    : "Use sidebar navigation"}
                </button>
              )}
              <button
                type="button"
                className="is-danger"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <MdLogout /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

      {isNotificationsOpen && (
        <NotificationsPanel
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          orderCount={notificationCount}
          canViewInventoryAlerts={canViewInventoryAlerts}
        />
      )}
    </>
  );
};

export default DashboardTopbar;
