import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { BsCashCoin } from "react-icons/bs";
import { GrInProgress } from "react-icons/gr";
import {
  MdAdminPanelSettings,
  MdOutlineAccessTime,
  MdWavingHand,
  MdWarning,
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
import InventorySignalCard from "../components/home/InventorySignalCard";
import Walkthrough, { ReplayTourButton } from "../components/shared/Walkthrough";
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
      action: () => navigate("/app/tables"),
      roles: ["OWNER", "MANAGER", "CASHIER", "WAITER"],
    },
    {
      label: "Menu Items",
      description: "Browse the menu",
      icon: MdOutlineMenuBook,
      action: () => navigate("/app/menu"),
      roles: ["OWNER", "MANAGER"],
    },
    {
      label: "Admin Workspace",
      description: "Manage operations",
      icon: MdAdminPanelSettings,
      action: () => navigate("/app/dashboard"),
      roles: ["OWNER", "MANAGER"],
    },
    {
      label: "Settings",
      description: "Restaurant profile",
      icon: MdOutlineSettings,
      action: () => navigate("/app/settings"),
      roles: ["OWNER"],
    },
  ];
  const quickActions = allQuickActions.filter((a) => a.roles.includes(user.role));

  // ── "At a Glance" — genuinely different from MiniCards above
  // MiniCards show: Earnings, In-Progress count, Orders Today, AOV
  // Glance shows: Available tables, Unpaid orders, Completed today, Table occupancy
  const occupancyPct = dashboard.totalTables
    ? Math.round(((dashboard.activeTables || 0) / dashboard.totalTables) * 100)
    : 0;

  const glanceItems = [
    {
      label: "Tables Available",
      value: dashboard.availableTables ?? "—",
      icon: MdTableRestaurant,
      sub: `${dashboard.activeTables || 0} occupied`,
    },
    {
      label: "Unpaid Orders",
      value: dashboard.unpaidOrders ?? 0,
      icon: BsCashCoin,
      sub: "awaiting payment",
    },
    {
      label: "Completed Today",
      value: dashboard.completed ?? 0,
      icon: MdShoppingBag,
      sub: `of ${dashboard.ordersToday || 0} total orders`,
    },
    {
      label: "Table Occupancy",
      value: `${occupancyPct}%`,
      icon: GrInProgress,
      sub: `${dashboard.totalTables || 0} tables total`,
    },
  ];

  return (
    <div className={`dashboard-shell theme-${theme}`}>
      <Walkthrough theme={theme} layout={effectiveLayout} />
      <Helmet>
        <title>{dashboard.restaurantName || user.restaurant?.name || "Restro"} — Dashboard</title>
        <meta name="robots" content="noindex" />
      </Helmet>
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

          <main className="dashboard-content dashboard-overview">
            <header className="analytics-header dashboard-overview-header">
              <div>
                <p className="analytics-eyebrow">Live operations</p>
                <h1>
                  {greeting}, {user.name?.split(" ")[0] || "there"}! <span><MdWavingHand /></span>
                </h1>
                <p>
                  {dashboard.restaurantName ||
                    user.restaurant?.name ||
                    "Your restaurant"}{" "}
                  · Today&apos;s service, revenue, and team priorities.
                </p>
                {/* Restaurant status warning — genuinely useful information */}
                {user.restaurant?.status === "SUSPENDED" && (
                  <div className="dashboard-status-badge is-suspended"><MdWarning /> Account suspended — contact support</div>
                )}
                {user.restaurant?.status === "PENDING" && (
                  <div className="dashboard-status-badge is-pending"><MdOutlineAccessTime /> Pending approval — some features are locked</div>
                )}
              </div>
              <div className="dashboard-header-actions">
                <ReplayTourButton />
                <time className="dashboard-time-badge" dateTime={now.toISOString()}>
                  {new Intl.DateTimeFormat(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(now)}
                </time>
                <button
                  type="button"
                  className="dashboard-header-primary"
                  onClick={() => setIsCreateOrderOpen(true)}
                >
                  <MdOutlineRoomService /> New order
                </button>
              </div>
            </header>

            {isError && !errorDismissed && (
              <div className="dashboard-error-banner">
                <span>Dashboard totals could not be loaded. Recent orders may still be available.</span>
                <div className="dashboard-error-actions">
                  <button type="button" onClick={() => refetch()} className="dashboard-error-retry">Retry</button>
                  <button type="button" onClick={() => setErrorDismissed(true)} className="dashboard-error-dismiss" aria-label="Dismiss error">✕</button>
                </div>
              </div>
            )}

            <section className="dashboard-onboarding-stack">
              {/* Plan usage bar — shown only on Starter, hidden on Pro/Enterprise */}
              <PlanUsageBar />

              {/* Zeigarnik setup checklist — shown until owner completes all steps */}
              {user.role === "OWNER" && <SetupChecklist />}
            </section>

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

            <section className="dashboard-command-grid">
              <div className="dashboard-command-main">
                {!isLoading && !isError && (dashboard.ordersToday || 0) === 0 && (
                  <div className="dashboard-first-order-callout">
                    <span className="dashboard-zero-icon">
                      <MdOutlineRoomService />
                    </span>
                    <div>
                      <strong>Service is ready</strong>
                      <p>
                        Start the first order and today&apos;s live numbers will
                        appear here.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="dashboard-zero-cta"
                      onClick={() => setIsCreateOrderOpen(true)}
                    >
                      Take first order
                    </button>
                  </div>
                )}
                <RecentOrders />
              </div>

              <aside className="dashboard-operations-rail">
                <div className="dashboard-panel dashboard-service-pulse">
                  <div className="dashboard-panel-header">
                    <div>
                      <h2>Service pulse</h2>
                      <p>What needs attention right now</p>
                    </div>
                    <span className="dashboard-live-indicator">
                      <i /> Live
                    </span>
                  </div>
                  <div className="dashboard-glance-list">
                    {glanceItems.map(({ label, value, icon: Icon, sub }) => (
                      <div key={label}>
                        <span>
                          <Icon />
                        </span>
                        <div>
                          {isLoading ? (
                            <div
                              className="dashboard-metric-skeleton"
                              style={{
                                height: 18,
                                width: 60,
                                margin: "2px 0 6px",
                              }}
                              aria-hidden="true"
                            />
                          ) : (
                            <strong>{value}</strong>
                          )}
                          <small>{label}</small>
                          {sub && !isLoading && (
                            <span className="dashboard-glance-sub">{sub}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="dashboard-panel dashboard-quick-actions">
                  <div className="dashboard-panel-header">
                    <div>
                      <h2>Quick actions</h2>
                      <p>Move directly to the next task</p>
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
              </aside>
            </section>

            <section className="dashboard-insight-grid">
              <PopularDishes
                dishes={dashboard.popularDishes || []}
                isLoading={isLoading}
              />
              <InventorySignalCard />
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
