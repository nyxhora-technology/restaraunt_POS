import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { BsCashCoin } from "react-icons/bs";
import { GrInProgress } from "react-icons/gr";
import {
  MdAdminPanelSettings,
  MdOutlineAccessTime,
  MdOutlineLocalOffer,
  MdOutlineMenuBook,
  MdOutlineReceiptLong,
  MdOutlineRoomService,
  MdOutlineSettings,
  MdOutlineShoppingBag,
  MdShoppingBag,
  MdTableRestaurant,
} from "react-icons/md";
import BottomNav from "../components/shared/BottomNav";
import CreateOrderModal from "../components/shared/CreateOrderModal";
import DashboardSidebar from "../components/home/DashboardSidebar";
import DashboardTopbar from "../components/home/DashboardTopbar";
import GlobalSearch from "../components/home/GlobalSearch";
import MiniCard from "../components/home/MiniCard";
import RecentOrders from "../components/home/RecentOrders";
import PopularDishes from "../components/home/PopularDishes";
import SetupChecklist from "../components/home/SetupChecklist";
import PlanUsageBar from "../components/home/PlanUsageBar";
import useDashboardPreferences from "../hooks/useDashboardPreferences";
import useCurrency from "../hooks/useCurrency";
import { getDashboard } from "../https";

const getPercentageChange = (current = 0, previous = 0) => {
  const currentValue = Number(current);
  const previousValue = Number(previous);
  if (!previousValue) return currentValue ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
};

const Home = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const currency = useCurrency();
  const {
    theme,
    layout,
    effectiveLayout,
    isMobile,
    toggleTheme,
    toggleLayout,
  } = useDashboardPreferences();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", user.restaurantId, user.role],
    queryFn: () =>
      ["OWNER", "MANAGER"].includes(user.role)
        ? getDashboard()
        : Promise.resolve({ data: { data: {} } }),
    enabled: Boolean(
      user.isAuth &&
        user.restaurantId &&
        ["OWNER", "MANAGER"].includes(user.role),
    ),
    staleTime: 30_000,
    refetchInterval: 60_000,              // Auto-refresh every 60s
    refetchIntervalInBackground: false,   // Pause when tab is hidden
  });
  const dashboard = data?.data.data || {};
  const revenueDelta = getPercentageChange(
    dashboard.revenueToday,
    dashboard.revenueYesterday,
  );
  const ordersDelta = getPercentageChange(
    dashboard.ordersToday,
    dashboard.ordersYesterday,
  );
  const inProgress = (dashboard.pending || 0) + (dashboard.preparing || 0);

  // ── Live clock — isolated in state so only this re-renders, not the whole page
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000); // update every minute, not every second
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  // Dismiss error banner when data loads successfully
  useEffect(() => {
    if (!isError) setErrorDismissed(false);
  }, [isError]);

  useEffect(() => {
    // Include restaurant name in tab title so staff can tell tabs apart
    const name = dashboard.restaurantName || user.restaurant?.name || "POS";
    document.title = `${name} — Dashboard`;
    document.documentElement.style.colorScheme = theme;
    return () => {
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, [theme, dashboard.restaurantName, user.restaurant?.name]);

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

  // ── Role-aware quick actions ──────────────────────────────────────────
  const allQuickActions = [
    {
      label: "New Order",
      description: "Take a new order",
      icon: MdOutlineRoomService,
      action: () => setIsCreateOrderOpen(true),
      roles: ["OWNER", "MANAGER", "CASHIER", "WAITER"],
    },
    {
      label: "Manage Tables",
      description: "View table layout",
      icon: MdTableRestaurant,
      action: () => navigate("/tables"),
      roles: ["OWNER", "MANAGER", "CASHIER", "WAITER"],
    },
    {
      label: "Menu Items",
      description: "Browse the menu",
      icon: MdOutlineMenuBook,
      action: () => navigate("/menu"),
      roles: ["OWNER", "MANAGER"],
    },
    {
      label: "Admin Workspace",
      description: "Manage operations",
      icon: MdAdminPanelSettings,
      action: () => navigate("/dashboard"),
      roles: ["OWNER", "MANAGER"],
    },
    {
      label: "Settings",
      description: "Restaurant profile",
      icon: MdOutlineSettings,
      action: () => navigate("/settings"),
      roles: ["OWNER"],
    },
  ];
  const quickActions = allQuickActions.filter((a) => a.roles.includes(user.role));

  const glanceItems = [
    {
      label: "Total Orders",
      value: dashboard.ordersToday || 0,
      icon: MdShoppingBag,
    },
    {
      label: "Total Sales",
      value: `₹${currency.format(dashboard.revenueToday || 0)}`,
      icon: BsCashCoin,
    },
    {
      label: "Pending Orders",
      value: inProgress,
      icon: GrInProgress,
    },
    {
      label: "Occupied Tables",
      value: dashboard.activeTables || 0,
      icon: MdTableRestaurant,
    },
  ];

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
            notificationCount={dashboard.pending || 0}
          />

          <main className="dashboard-content">
            <section className="dashboard-greeting">
              <svg
                className="dashboard-greeting-waves"
                viewBox="0 0 900 120"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0 92 C180 40 315 115 470 66 S735 38 900 78" />
                <path d="M0 106 C175 58 325 124 485 80 S745 54 900 90" />
                <path d="M0 75 C210 28 335 96 505 52 S755 20 900 61" />
              </svg>
              <div>
                <h1>
                  {greeting}, {user.name || "there"}! <span>👋</span>
                </h1>
                <p>
                  Here&apos;s what&apos;s happening with your restaurant today.
                </p>
              </div>
              <time dateTime={now.toISOString()}>
                {new Intl.DateTimeFormat(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit"
                }).format(now)}
              </time>
            </section>

            {isError && !errorDismissed && (
              <div className="dashboard-error-banner">
                <span>Dashboard totals could not be loaded. Recent orders may still be available.</span>
                <div className="dashboard-error-actions">
                  <button type="button" onClick={() => refetch()} className="dashboard-error-retry">Retry</button>
                  <button type="button" onClick={() => setErrorDismissed(true)} className="dashboard-error-dismiss" aria-label="Dismiss error">✕</button>
                </div>
              </div>
            )}

            {/* Plan usage bar — shown only on Starter, hidden on Pro/Enterprise */}
            <PlanUsageBar />

            {/* Zeigarnik setup checklist — shown until owner completes all steps */}
            {user.role === "OWNER" && <SetupChecklist />}

            <section className="dashboard-metric-grid">
              <MiniCard
                title="Total Earnings"
                icon={<MdOutlineReceiptLong />}
                prefix={currency.symbol}
                number={currency.format(dashboard.revenueToday || 0)}
                trend={isLoading ? undefined : revenueDelta}
                footer="vs yesterday"
                tone="teal"
                isLoading={isLoading}
              />
              <MiniCard
                title="In Progress"
                icon={<MdOutlineAccessTime />}
                number={inProgress}
                footer={`${dashboard.ready || 0} ready for service`}
                tone="orange"
                isLoading={isLoading}
                hideTrend
              />
              <MiniCard
                title="Today's Orders"
                icon={<MdOutlineShoppingBag />}
                number={dashboard.ordersToday || 0}
                trend={isLoading ? undefined : ordersDelta}
                footer="vs yesterday"
                tone="blue"
                isLoading={isLoading}
              />
              <MiniCard
                title="Average Order Value"
                icon={<MdOutlineLocalOffer />}
                prefix={currency.symbol}
                number={currency.format(dashboard.averageOrderValue || 0)}
                footer="based on today's payments"
                tone="red"
                isLoading={isLoading}
                hideTrend
              />
            </section>

            {/* Empty state — first day or early morning with 0 orders */}
            {!isLoading && !isError && (dashboard.ordersToday || 0) === 0 && (
              <div className="dashboard-zero-state">
                <span className="dashboard-zero-icon">☀️</span>
                <strong>Ready for your first order today</strong>
                <p>Your numbers will appear here once orders start coming in.</p>
                <button
                  type="button"
                  className="dashboard-zero-cta"
                  onClick={() => setIsCreateOrderOpen(true)}
                >
                  <MdOutlineRoomService /> Take first order
                </button>
              </div>
            )}

            <section className="dashboard-primary-grid">
              <RecentOrders />
              <PopularDishes
                dishes={dashboard.popularDishes || []}
                isLoading={isLoading}
              />
            </section>

            <section className="dashboard-secondary-grid">
              <div className="dashboard-panel dashboard-quick-actions">
                <div className="dashboard-panel-header">
                  <div>
                    <h2>Quick Actions</h2>
                    <p>Common restaurant tasks</p>
                  </div>
                </div>
                <div className="dashboard-action-list">
                  {quickActions.map(
                    ({ label, description, icon: Icon, action }) => (
                      <button type="button" key={label} onClick={action}>
                        <span>
                          <Icon />
                        </span>
                        <div>
                          <strong>{label}</strong>
                          <small>{description}</small>
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="dashboard-panel dashboard-glance">
                <div className="dashboard-panel-header">
                  <div>
                    <h2>Today at a glance</h2>
                    <p>Live operational summary</p>
                  </div>
                </div>
                <div className="dashboard-glance-list">
                  {glanceItems.map(({ label, value, icon: Icon }) => (
                    <div key={label}>
                      <span>
                        <Icon />
                      </span>
                      <div>
                        {isLoading ? (
                          <div className="dashboard-metric-skeleton" style={{ height: 18, width: 60, margin: '2px 0 6px' }} aria-hidden="true" />
                        ) : (
                          <strong>{value}</strong>
                        )}
                        <small>{label}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>

          {effectiveLayout === "bottom" && (
            <BottomNav
              dashboardVariant
              onCreateOrder={() => setIsCreateOrderOpen(true)}
            />
          )}
        </div>
      </div>

      <CreateOrderModal
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
        dashboardVariant
      />
      <GlobalSearch
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
      />
    </div>
  );
};

export default Home;
