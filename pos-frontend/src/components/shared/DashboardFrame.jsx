import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import BottomNav from "./BottomNav";
import CreateOrderModal from "./CreateOrderModal";
import DashboardSidebar from "../home/DashboardSidebar";
import DashboardTopbar from "../home/DashboardTopbar";
import GlobalSearch from "../home/GlobalSearch";
import useDashboardPreferences from "../../hooks/useDashboardPreferences";
import { getDashboard } from "../../https";
import { MANAGER_ROLES, ORDER_ROLES } from "../../constants/roles";

const DashboardFrame = ({ children }) => {
  const user = useSelector((state) => state.user);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const canViewManagementDashboard = MANAGER_ROLES.includes(user.role);
  const canCreateOrders = ORDER_ROLES.includes(user.role);
  const {
    theme,
    layout,
    effectiveLayout,
    isMobile,
    toggleTheme,
    toggleLayout,
  } = useDashboardPreferences();

  const { data } = useQuery({
    queryKey: ["dashboard", user.restaurantId, user.role],
    queryFn: () =>
      canViewManagementDashboard
        ? getDashboard()
        : Promise.resolve({ data: { data: {} } }),
    enabled: Boolean(
      user.isAuth && user.restaurantId && canViewManagementDashboard,
    ),
  });
  const dashboard = data?.data.data || {};

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    return () => {
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, [theme]);

  useEffect(() => {
    const openGlobalSearch = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };
    window.addEventListener("keydown", openGlobalSearch);
    return () => window.removeEventListener("keydown", openGlobalSearch);
  }, []);

  return (
    <div className={`dashboard-shell theme-${theme}`}>
      <div className="dashboard-app">
        {effectiveLayout === "sidebar" && (
          <DashboardSidebar
            restaurantName={
              dashboard.restaurantName || user.restaurant?.name || "Restaurant"
            }
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
            onCreateOrder={() => setIsCreateOrderOpen(true)}
          />
        )}

        <div
          className={`dashboard-main ${
            effectiveLayout === "bottom" ? "has-bottom-nav" : ""
          }`}
        >
          <DashboardTopbar
            theme={theme}
            onToggleTheme={toggleTheme}
            layout={layout}
            onToggleLayout={toggleLayout}
            isMobile={isMobile}
            isSidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
            onOpenSearch={() => setIsGlobalSearchOpen(true)}
            notificationCount={
              canViewManagementDashboard ? dashboard.pending || 0 : 0
            }
          />

          <main className="dashboard-frame-content">{children}</main>

          {effectiveLayout === "bottom" && (
            <BottomNav
              dashboardVariant
              onCreateOrder={() => setIsCreateOrderOpen(true)}
            />
          )}
        </div>
      </div>

      {canCreateOrders && (
        <CreateOrderModal
          isOpen={isCreateOrderOpen}
          onClose={() => setIsCreateOrderOpen(false)}
          dashboardVariant
        />
      )}
      <GlobalSearch
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
      />
    </div>
  );
};

export default DashboardFrame;
