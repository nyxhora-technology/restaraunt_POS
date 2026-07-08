import { useEffect, useState } from "react";

const THEME_KEY = "pos.dashboard.theme";
const LAYOUT_KEY = "pos.dashboard.layout";

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const useDashboardPreferences = () => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_KEY) || getSystemTheme(),
  );
  const [layout, setLayout] = useState(
    () => localStorage.getItem(LAYOUT_KEY) || "sidebar",
  );
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 899px)").matches,
  );

  useEffect(() => {
    const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (event) => {
      if (!localStorage.getItem(THEME_KEY)) {
        setTheme(event.matches ? "dark" : "light");
      }
    };
    themeQuery.addEventListener("change", handleThemeChange);
    return () => themeQuery.removeEventListener("change", handleThemeChange);
  }, []);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 899px)");
    const handleViewportChange = (event) => setIsMobile(event.matches);
    mobileQuery.addEventListener("change", handleViewportChange);
    return () =>
      mobileQuery.removeEventListener("change", handleViewportChange);
  }, []);

  useEffect(() => {
    const handlePreferencesChange = () => {
      setTheme(localStorage.getItem(THEME_KEY) || getSystemTheme());
      setLayout(localStorage.getItem(LAYOUT_KEY) || "sidebar");
    };

    window.addEventListener("dashboard-preferences-changed", handlePreferencesChange);
    window.addEventListener("storage", handlePreferencesChange);

    return () => {
      window.removeEventListener("dashboard-preferences-changed", handlePreferencesChange);
      window.removeEventListener("storage", handlePreferencesChange);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      window.dispatchEvent(new Event("dashboard-preferences-changed"));
      return next;
    });
  };

  const toggleLayout = () => {
    setLayout((current) => {
      const next = current === "sidebar" ? "bottom" : "sidebar";
      localStorage.setItem(LAYOUT_KEY, next);
      window.dispatchEvent(new Event("dashboard-preferences-changed"));
      return next;
    });
  };

  return {
    theme,
    layout,
    effectiveLayout: isMobile ? "bottom" : layout,
    isMobile,
    toggleTheme,
    toggleLayout,
  };
};

export default useDashboardPreferences;
