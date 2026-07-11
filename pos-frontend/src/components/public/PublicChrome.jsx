import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  HiDesktopComputer,
  HiMoon,
  HiSun,
  HiViewGrid,
} from "react-icons/hi";
import logo from "../../assets/images/logo.png";
import { getHomeRoute } from "../shared/RouteGuards";
import { site } from "../../config/site";

const THEME_STORAGE_KEY = "restro-public-theme";

const navLinks = [
  ["/restaurant-pos-india", "Product"],
  ["/cafe-pos-software", "For cafes"],
  ["/blog", "Blog"],
  ["/resources", "Resources"],
  ["/compare/spreadsheet-billing-vs-restaurant-pos", "Compare"],
];

const footerGroups = [
  {
    label: "Product",
    links: [
      ["/restaurant-pos-india", "Restaurant POS India"],
      ["/cafe-pos-software", "Cafe POS"],
      ["/restaurant-billing-software", "Billing software"],
    ],
  },
  {
    label: "Resources",
    links: [
      ["/blog", "Blog"],
      ["/resources", "Checklists"],
      ["/resources/restaurant-pos-setup-checklist", "POS setup checklist"],
    ],
  },
  {
    label: "Compare",
    links: [
      ["/compare/spreadsheet-billing-vs-restaurant-pos", "Spreadsheet vs POS"],
      ["/compare/cloud-pos-vs-desktop-billing", "Cloud vs desktop"],
      ["/compare/qr-menu-vs-printed-menu", "QR vs printed menu"],
    ],
  },
  {
    label: "Company",
    links: [
      ["/terms", "Terms"],
      ["/privacy", "Privacy"],
      ["/auth", "Sign in"],
    ],
  },
];

export function ThemeControl() {
  const [mode, setMode] = useState("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedMode = window.localStorage.getItem(THEME_STORAGE_KEY);
    setMode(["light", "dark"].includes(savedMode) ? savedMode : "system");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved =
        mode === "system" ? (media.matches ? "dark" : "light") : mode;
      document.documentElement.dataset.marketingTheme = resolved;
      document.documentElement.style.colorScheme = resolved;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", resolved === "dark" ? "#0e1512" : "#f4f2ec");
    };

    if (mode === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      media.addEventListener("change", applyTheme);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
    applyTheme();
    return () => media.removeEventListener("change", applyTheme);
  }, [mode, ready]);

  return (
    <div className="landing-theme-control" aria-label="Color theme">
      <button
        type="button"
        className={mode === "light" ? "is-active" : ""}
        aria-label="Use light theme"
        aria-pressed={mode === "light"}
        onClick={() => setMode("light")}
      >
        <HiSun />
      </button>
      <button
        type="button"
        className={mode === "system" ? "is-active" : ""}
        aria-label="Use system theme"
        aria-pressed={mode === "system"}
        onClick={() => setMode("system")}
      >
        <HiDesktopComputer />
      </button>
      <button
        type="button"
        className={mode === "dark" ? "is-active" : ""}
        aria-label="Use dark theme"
        aria-pressed={mode === "dark"}
        onClick={() => setMode("dark")}
      >
        <HiMoon />
      </button>
    </div>
  );
}

export function PublicNav() {
  const user = useSelector((state) => state.user);

  const homeRoute = user.isAuth ? getHomeRoute(user) : "/auth";

  return (
    <nav
      className="marketing-nav landing-nav public-nav"
      aria-label="Main navigation"
    >
      <Link
        className="marketing-brand"
        to="/"
        aria-label={`${site.brandName} home`}
      >
        <img src={logo} alt="" />
        <span>{site.brandName}</span>
      </Link>
      <div className="marketing-nav-links">
        {navLinks.map(([href, label]) => (
          <Link key={href} to={href}>
            {label}
          </Link>
        ))}
      </div>
      <div className="marketing-nav-actions">
        <ThemeControl />
        {user.isAuth ? (
          <Link className="marketing-dashboard-button" to={homeRoute}>
            <HiViewGrid /> Dashboard
          </Link>
        ) : (
          <>
            <Link className="marketing-signin" to="/auth">
              Sign in
            </Link>
            <Link className="marketing-button is-small" to="/auth?tab=register">
              Create account
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer className="marketing-footer landing-footer public-footer">
      <div className="landing-footer-brand">
        <Link className="marketing-brand" to="/">
          <img src={logo} alt="" />
          <span>{site.brandName}</span>
        </Link>
        <p>Modern restaurant POS and operations software for India.</p>
      </div>
      {footerGroups.map((group) => (
        <nav
          className="landing-footer-links"
          aria-label={`${group.label} footer links`}
          key={group.label}
        >
          <strong>{group.label}</strong>
          {group.links.map(([href, label]) => (
            <Link key={href} to={href}>
              {label}
            </Link>
          ))}
        </nav>
      ))}
      <small>
        &copy; {new Date().getFullYear()} {site.brandName}.
      </small>
    </footer>
  );
}
