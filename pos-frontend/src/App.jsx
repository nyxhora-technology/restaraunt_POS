import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import useLoadData from "./hooks/useLoadData";
import useRealtimeSync from "./hooks/useRealtimeSync";
import FullScreenLoader from "./components/shared/FullScreenLoader";
import DashboardFrame from "./components/shared/DashboardFrame";
import {
  ProtectedRoute,
  TenantRoute,
  RoleRoute,
  getHomeRoute,
} from "./components/shared/RouteGuards";
import { ROLES } from "./constants/roles";
import ChangePasswordModal from "./components/shared/ChangePasswordModal";

// ── Lazy-loaded pages ──────────────────────────────────────────────────────
const Home          = lazy(() => import("./pages/Home"));
const Auth          = lazy(() => import("./pages/Auth"));
const Orders        = lazy(() => import("./pages/Orders"));
const Tables        = lazy(() => import("./pages/Tables"));
const Menu          = lazy(() => import("./pages/Menu"));
const Dashboard     = lazy(() => import("./pages/Dashboard"));
const Onboarding    = lazy(() => import("./pages/Onboarding"));
const PlatformAdmin = lazy(() => import("./pages/PlatformAdmin"));
const Settings      = lazy(() => import("./pages/Settings"));
const QrMenu        = lazy(() => import("./pages/QrMenu"));
const More          = lazy(() => import("./pages/More"));
const Inventory     = lazy(() => import("./pages/Inventory"));
const Landing       = lazy(() => import("./pages/Landing"));
const AuthCallback  = lazy(() => import("./pages/AuthCallback"));

// ── Role sets used in route guards ─────────────────────────────────────────
// Kept here so changes to access rules are one-liners in this file.
const MANAGEMENT   = ["OWNER", "MANAGER"];
const ORDER_ACCESS = ["OWNER", "MANAGER", "CASHIER", "WAITER"];
const TABLE_ACCESS = ["OWNER", "MANAGER", "CASHIER", "WAITER"];

// ─────────────────────────────────────────────────────────────────────────────

function Layout() {
  const isLoading = useLoadData();
  useRealtimeSync();
  const user = useSelector((state) => state.user);

  if (isLoading) return <FullScreenLoader />;

  // Hard-block: staff must set their own password before using the app
  if (user.isAuth && user.mustChangePassword) {
    return <ChangePasswordModal />;
  }

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>

        {/* ── Public ─────────────────────────────────────────────────── */}
        <Route path="/qr/:slug" element={<QrMenu />} />

        {/* ── Auth ───────────────────────────────────────────────────── */}
        <Route
          path="/auth"
          element={
            user.isAuth
              ? <Navigate to={getHomeRoute(user)} replace />
              : <Auth />
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* ── Platform (SUPER_ADMIN only) ─────────────────────────────── */}
        <Route
          path="/platform"
          element={
            <ProtectedRoute>
              {user.role === ROLES.SUPER_ADMIN
                ? <PlatformAdmin />
                : <Navigate to={getHomeRoute(user)} replace />}
            </ProtectedRoute>
          }
        />

        {/* ── Onboarding ─────────────────────────────────────────────── */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              {user.role === ROLES.SUPER_ADMIN
                ? <Navigate to="/platform" replace />
                : <Onboarding />}
            </ProtectedRoute>
          }
        />

        {/* ── Home (OWNER / MANAGER landing) ─────────────────────────── */}
        <Route
          path="/"
          element={
            user.isAuth ? (
              <RoleRoute allowedRoles={MANAGEMENT} redirectTo="/dashboard">
                <Home />
              </RoleRoute>
            ) : <Landing />
          }
        />

        {/* ── Dashboard (all tenant roles) ───────────────────────────── */}
        <Route
          path="/dashboard"
          element={
            <TenantRoute>
              <DashboardFrame>
                <Dashboard />
              </DashboardFrame>
            </TenantRoute>
          }
        />

        {/* Typo redirect kept for backward compat */}
        <Route path="/dashbord" element={<Navigate to="/dashboard" replace />} />

        {/* ── Orders (not KITCHEN) ────────────────────────────────────── */}
        <Route
          path="/orders"
          element={
            <RoleRoute allowedRoles={ORDER_ACCESS}>
              <DashboardFrame>
                <Orders />
              </DashboardFrame>
            </RoleRoute>
          }
        />

        {/* ── Tables (not KITCHEN) ────────────────────────────────────── */}
        <Route
          path="/tables"
          element={
            <RoleRoute allowedRoles={TABLE_ACCESS}>
              <DashboardFrame>
                <Tables />
              </DashboardFrame>
            </RoleRoute>
          }
        />
        {/* Alias */}
        <Route path="/table" element={<Navigate to="/tables" replace />} />

        {/* ── Menu (not KITCHEN) ──────────────────────────────────────── */}
        <Route
          path="/menu"
          element={
            <RoleRoute allowedRoles={ORDER_ACCESS}>
              <DashboardFrame>
                <Menu />
              </DashboardFrame>
            </RoleRoute>
          }
        />

        {/* ── Inventory (OWNER / MANAGER) ─────────────────────────────── */}
        <Route
          path="/inventory"
          element={
            <RoleRoute allowedRoles={MANAGEMENT}>
              <DashboardFrame>
                <Inventory />
              </DashboardFrame>
            </RoleRoute>
          }
        />
        {/* Typo redirect */}
        <Route path="/inventry" element={<Navigate to="/inventory" replace />} />

        {/* ── QR (OWNER / MANAGER dashboard tab) ─────────────────────── */}
        <Route
          path="/qr"
          element={
            <RoleRoute allowedRoles={MANAGEMENT}>
              <DashboardFrame>
                <Dashboard initialTab="QR Menu" />
              </DashboardFrame>
            </RoleRoute>
          }
        />

        {/* ── More ───────────────────────────────────────────────────── */}
        <Route
          path="/more"
          element={
            <TenantRoute>
              <DashboardFrame>
                <More />
              </DashboardFrame>
            </TenantRoute>
          }
        />

        {/* ── Settings (any authenticated user) ──────────────────────── */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardFrame>
                <Settings />
              </DashboardFrame>
            </ProtectedRoute>
          }
        />
        {/* Typo redirect */}
        <Route path="/setting" element={<Navigate to="/settings" replace />} />

        {/* ── 404 ────────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
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
