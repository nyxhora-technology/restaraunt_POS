export const APP_ROUTES = Object.freeze({
  home: "/app",
  dashboard: "/app/dashboard",
  orders: "/app/orders",
  tables: "/app/tables",
  menu: "/app/menu",
  inventory: "/app/inventory",
  analytics: "/app/analytics",
  qr: "/app/qr",
  more: "/app/more",
  settings: "/app/settings",
  onboarding: "/app/onboarding",
  platform: "/app/platform",
});

export const getSafeAppReturnTo = (value, fallback) => {
  if (!value || typeof value !== "string") return fallback;
  try {
    const parsed = new URL(value, "https://app.local");
    const safePath =
      parsed.pathname === "/app" || parsed.pathname.startsWith("/app/");
    if (parsed.origin !== "https://app.local" || !safePath) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
};

export const getAuthRoute = (location) => {
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  return `/auth?returnTo=${encodeURIComponent(returnTo)}`;
};
