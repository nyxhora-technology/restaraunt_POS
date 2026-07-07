import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import useLoadData from "./hooks/useLoadData";
import useRealtimeSync from "./hooks/useRealtimeSync";
import FullScreenLoader from "./components/shared/FullScreenLoader";
import {
  ProtectedRoute,
  RoleRoute,
  TenantRoute,
  getHomeRoute,
} from "./components/shared/RouteGuards";
import { ROLES } from "./constants/roles";
import { APP_ROUTES } from "./utils/authRouting";
import Landing from "./pages/Landing";
import logo from "./assets/images/logo.png";

const Home = lazy(() => import("./pages/Home"));
const DashboardFrame = lazy(() => import("./components/shared/DashboardFrame"));
const ChangePasswordModal = lazy(
  () => import("./components/shared/ChangePasswordModal"),
);
const Auth = lazy(() => import("./pages/Auth"));
const Orders = lazy(() => import("./pages/Orders"));
const Tables = lazy(() => import("./pages/Tables"));
const Menu = lazy(() => import("./pages/Menu"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PlatformAdmin = lazy(() => import("./pages/PlatformAdmin"));
const Settings = lazy(() => import("./pages/Settings"));
const QrMenu = lazy(() => import("./pages/QrMenu"));
const More = lazy(() => import("./pages/More"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));

const MANAGEMENT = ["OWNER", "MANAGER"];
const ORDER_ACCESS = ["OWNER", "MANAGER", "CASHIER", "WAITER"];
const TABLE_ACCESS = ["OWNER", "MANAGER", "CASHIER", "WAITER"];

const RouteLoader = ({ label = "Loading Restro…" }) => (
  <main className="oauth-callback" role="status" aria-live="polite">
    <img src={logo} alt="Restro" />
    <div className="oauth-spinner" aria-hidden="true" />
    <h1>{label}</h1>
  </main>
);

const BootstrapError = ({ onRetry, isAppRoute }) => (
  <main className="oauth-callback" role="alert">
    <img src={logo} alt="Restro" />
    <h1>We couldn&apos;t reach Restro</h1>
    <p>Check your connection and try again.</p>
    <button className="auth-submit" type="button" onClick={onRetry}>
      Try again
    </button>
    {!isAppRoute && <a href="/">Return to the public site</a>}
  </main>
);

const legacyRedirects = [
  ["/home", APP_ROUTES.home],
  ["/dashboard", APP_ROUTES.dashboard],
  ["/dashbord", APP_ROUTES.dashboard],
  ["/orders", APP_ROUTES.orders],
  ["/tables", APP_ROUTES.tables],
  ["/table", APP_ROUTES.tables],
  ["/menu", APP_ROUTES.menu],
  ["/inventory", APP_ROUTES.inventory],
  ["/analytics", APP_ROUTES.analytics],
  ["/inventry", APP_ROUTES.inventory],
  ["/qr", APP_ROUTES.qr],
  ["/more", APP_ROUTES.more],
  ["/settings", APP_ROUTES.settings],
  ["/setting", APP_ROUTES.settings],
  ["/onboarding", APP_ROUTES.onboarding],
  ["/platform", APP_ROUTES.platform],
];

function Layout() {
  const location = useLocation();
  const { pathname } = location;
  const isAppRoute =
    pathname === APP_ROUTES.home || pathname.startsWith(`${APP_ROUTES.home}/`);
  const isAuthRoute = pathname === "/auth";
  const bootstrap = useLoadData({
    enabled: isAppRoute || isAuthRoute,
  });
  useRealtimeSync();
  const user = useSelector((state) => state.user);

  if (isAppRoute && bootstrap.isLoading) return <FullScreenLoader />;
  if (isAppRoute && bootstrap.isError) {
    return (
      <BootstrapError onRetry={bootstrap.refetch} isAppRoute={isAppRoute} />
    );
  }

  const fallback = isAppRoute ? (
    <FullScreenLoader />
  ) : (
    <RouteLoader label={isAuthRoute ? "Checking your session…" : undefined} />
  );

  return (
    <Suspense fallback={fallback}>
      {isAppRoute && user.isAuth && user.mustChangePassword ? (
        <ChangePasswordModal />
      ) : (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/qr/:slug" element={<QrMenu />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route
            path="/auth"
            element={
              bootstrap.isLoading ? (
                <RouteLoader label="Checking your session…" />
              ) : bootstrap.isError ? (
                <BootstrapError onRetry={bootstrap.refetch} />
              ) : user.isAuth ? (
                <Navigate to={getHomeRoute(user)} replace />
              ) : (
                <Auth />
              )
            }
          />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route
            path={APP_ROUTES.platform}
            element={
              <ProtectedRoute>
                {user.role === ROLES.SUPER_ADMIN ? (
                  <PlatformAdmin />
                ) : (
                  <Navigate to={getHomeRoute(user)} replace />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path={APP_ROUTES.onboarding}
            element={
              <ProtectedRoute>
                {user.role === ROLES.SUPER_ADMIN ? (
                  <Navigate to={APP_ROUTES.platform} replace />
                ) : (
                  <Onboarding />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path={APP_ROUTES.home}
            element={
              <RoleRoute
                allowedRoles={MANAGEMENT}
                redirectTo={APP_ROUTES.dashboard}
              >
                <Home />
              </RoleRoute>
            }
          />

          <Route
            path={APP_ROUTES.dashboard}
            element={
              <TenantRoute>
                <DashboardFrame>
                  <Dashboard />
                </DashboardFrame>
              </TenantRoute>
            }
          />

          <Route
            path={APP_ROUTES.orders}
            element={
              <RoleRoute allowedRoles={ORDER_ACCESS}>
                <DashboardFrame>
                  <Orders />
                </DashboardFrame>
              </RoleRoute>
            }
          />

          <Route
            path={APP_ROUTES.tables}
            element={
              <RoleRoute allowedRoles={TABLE_ACCESS}>
                <DashboardFrame>
                  <Tables />
                </DashboardFrame>
              </RoleRoute>
            }
          />

          <Route
            path={APP_ROUTES.menu}
            element={
              <RoleRoute allowedRoles={ORDER_ACCESS}>
                <DashboardFrame>
                  <Menu />
                </DashboardFrame>
              </RoleRoute>
            }
          />

          <Route
            path={APP_ROUTES.inventory}
            element={
              <RoleRoute allowedRoles={MANAGEMENT}>
                <DashboardFrame>
                  <Inventory />
                </DashboardFrame>
              </RoleRoute>
            }
          />

          <Route
            path={APP_ROUTES.analytics}
            element={
              <RoleRoute allowedRoles={MANAGEMENT}>
                <DashboardFrame>
                  <Analytics />
                </DashboardFrame>
              </RoleRoute>
            }
          />

          <Route
            path={APP_ROUTES.qr}
            element={
              <RoleRoute allowedRoles={MANAGEMENT}>
                <DashboardFrame>
                  <Dashboard initialTab="QR Menu" />
                </DashboardFrame>
              </RoleRoute>
            }
          />

          <Route
            path={APP_ROUTES.more}
            element={
              <TenantRoute>
                <DashboardFrame>
                  <More />
                </DashboardFrame>
              </TenantRoute>
            }
          />

          <Route
            path={APP_ROUTES.settings}
            element={
              <ProtectedRoute>
                <DashboardFrame>
                  <Settings />
                </DashboardFrame>
              </ProtectedRoute>
            }
          />

          {legacyRedirects.map(([from, to]) => (
            <Route
              key={from}
              path={from}
              element={<Navigate to={to} replace />}
            />
          ))}

          <Route
            path="*"
            element={
              isAppRoute ? (
                <Navigate to={APP_ROUTES.home} replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      )}
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
