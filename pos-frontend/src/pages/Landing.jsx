import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  HiArrowRight,
  HiCheck,
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiOutlineCube,
  HiOutlineMenu,
  HiOutlineQrcode,
  HiOutlineReceiptTax,
  HiOutlineTable,
  HiDesktopComputer,
  HiMoon,
  HiSun,
} from "react-icons/hi";
import logo from "../assets/images/logo.png";
import { getHomeRoute } from "../components/shared/RouteGuards";
import {
  getPublicUrl,
  seoIndexingEnabled,
  seoRobots,
} from "../config/site";
import useLoadData from "../hooks/useLoadData";

const capabilityGroups = [
  {
    number: "01",
    icon: HiOutlineReceiptTax,
    title: "Service",
    text: "Take dine-in or takeaway orders, send clear tickets to the kitchen, and track every status change.",
    items: ["Table-aware orders", "Kitchen status flow", "Cash and online payments"],
  },
  {
    number: "02",
    icon: HiOutlineCube,
    title: "Control",
    text: "Keep menu availability, ingredient stock, suppliers, and purchase activity connected to daily service.",
    items: ["Menu and variants", "Stock deductions", "Low-stock signals"],
  },
  {
    number: "03",
    icon: HiOutlineChartBar,
    title: "Review",
    text: "Read revenue, order completion, peak hours, and dish performance from one management workspace.",
    items: ["Revenue history", "Operational analytics", "CSV exports"],
  },
];

const setupSteps = [
  {
    number: "1",
    title: "Create the owner account",
    text: "Use email or Google sign-in. The owner account controls the restaurant workspace.",
  },
  {
    number: "2",
    title: "Configure the operation",
    text: "Add dining areas, tables, menu items, taxes, staff roles, and inventory.",
  },
  {
    number: "3",
    title: "Open service",
    text: "Take the first order and move it through kitchen, payment, and table release.",
  },
];

const starterFeatures = [
  "300 orders each month",
  "30 menu items",
  "10 tables",
  "3 staff accounts",
  "7-day order history",
  "Cash and online payment workflows",
];

const professionalFeatures = [
  "Unlimited orders, menu items, and tables",
  "10 staff accounts with role controls",
  "90-day revenue analytics",
  "Inventory, suppliers, and stock alerts",
  "50 QR menu codes",
  "Reservations, receipts, and CSV exports",
];

const THEME_STORAGE_KEY = "restro-public-theme";

function ThemeControl() {
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
      const resolved = mode === "system"
        ? media.matches ? "dark" : "light"
        : mode;
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

function ProductWindow() {
  return (
    <div className="landing-product-window" aria-label="Restro order workflow preview">
      <div className="landing-window-bar">
        <span className="landing-window-brand">
          <img src={logo} alt="" />
          <strong>Restro</strong>
        </span>
        <span className="landing-window-context">Friday dinner service</span>
        <span className="landing-window-status"><i /> Live workspace</span>
      </div>
      <div className="landing-product-body">
        <aside className="landing-product-nav" aria-label="Product preview navigation">
          <span className="is-active"><HiOutlineClipboardList /> Orders</span>
          <span><HiOutlineTable /> Tables</span>
          <span><HiOutlineMenu /> Menu</span>
          <span><HiOutlineCube /> Inventory</span>
          <span><HiOutlineChartBar /> Analytics</span>
        </aside>
        <div className="landing-order-board">
          <div className="landing-board-heading">
            <div>
              <small>Order flow</small>
              <strong>Kitchen board</strong>
            </div>
            <button type="button" tabIndex="-1">+ New order</button>
          </div>
          <div className="landing-board-columns">
            <section>
              <header><span>New</span><b>2</b></header>
              <article>
                <div><strong>#1042</strong><span>Table 08</span></div>
                <p>2 × Masala dosa<br />1 × Filter coffee</p>
                <small>Placed just now</small>
              </article>
              <article className="is-muted">
                <div><strong>#1041</strong><span>Takeaway</span></div>
                <p>1 × Paneer tikka<br />2 × Butter naan</p>
                <small>Placed 2 min ago</small>
              </article>
            </section>
            <section>
              <header><span>Preparing</span><b>1</b></header>
              <article className="is-active">
                <div><strong>#1040</strong><span>Table 03</span></div>
                <p>1 × Hyderabadi biryani<br />1 × Raita</p>
                <small>Kitchen accepted</small>
              </article>
            </section>
            <section>
              <header><span>Ready</span><b>1</b></header>
              <article className="is-ready">
                <div><strong>#1039</strong><span>Table 11</span></div>
                <p>2 × Chole bhature</p>
                <small>Ready for service</small>
              </article>
            </section>
          </div>
        </div>
      </div>
      <p className="landing-preview-caption">Product preview using sample order data</p>
    </div>
  );
}

function TablePreview() {
  return (
    <div className="landing-table-preview" aria-hidden="true">
      <header>
        <div><small>Ground floor</small><strong>Live table map</strong></div>
        <span>12 tables</span>
      </header>
      <div className="landing-table-grid">
        {[
          ["01", "Available", "is-free"],
          ["02", "Occupied · #1036", "is-busy"],
          ["03", "Available", "is-free"],
          ["04", "Reserved · 8:00 PM", "is-booked"],
          ["05", "Bill requested", "is-billing"],
          ["06", "Available", "is-free"],
        ].map(([number, state, tone]) => (
          <article className={tone} key={number}>
            <strong>{number}</strong><span>{state}</span><small>4 seats</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function InventoryPreview() {
  return (
    <div className="landing-inventory-preview" aria-hidden="true">
      <header>
        <div><small>Inventory</small><strong>Stock attention</strong></div>
        <span>Updated with orders</span>
      </header>
      {[
        ["Paneer", "4.2 kg", "Low stock", 24],
        ["Basmati rice", "18 kg", "Healthy", 72],
        ["Cooking oil", "7.5 L", "Reorder soon", 38],
      ].map(([name, stock, status, width]) => (
        <article key={name}>
          <div><strong>{name}</strong><span>{status}</span></div>
          <div className="landing-stock-track"><i style={{ width: `${width}%` }} /></div>
          <small>{stock} available</small>
        </article>
      ))}
    </div>
  );
}

export default function Landing() {
  const user = useSelector((state) => state.user);
  useLoadData();
  const homeRoute = user.isAuth ? getHomeRoute(user) : "/auth";
  const displayName = user.name || user.email || "User";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "U";

  return (
    <main className="marketing-page landing-v2">
      <Helmet>
        <title>Restro — Restaurant POS for Orders, Tables and Kitchen</title>
        <meta
          name="description"
          content="Run dine-in and takeaway orders, tables, kitchen status, payments, inventory, staff, QR menus, reservations, and reporting from one restaurant POS."
        />
        <meta property="og:title" content="Restro — Restaurant service, connected" />
        <meta
          property="og:description"
          content="A restaurant POS workspace for orders, tables, kitchen, payments, inventory, staff, and reporting."
        />
        <meta name="robots" content={seoRobots} />
        {seoIndexingEnabled && (
          <>
            <meta property="og:url" content={getPublicUrl("/")} />
            <link rel="canonical" href={getPublicUrl("/")} />
          </>
        )}
      </Helmet>

      <nav className="marketing-nav landing-nav" aria-label="Main navigation">
        <Link className="marketing-brand" to="/" aria-label="Restro home">
          <img src={logo} alt="" />
          <span>Restro</span>
        </Link>
        <div className="marketing-nav-links">
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#setup">Setup</a>
          <a href="#pricing">Plans</a>
        </div>
        <div className="marketing-nav-actions">
          <ThemeControl />
          {user.isAuth ? (
            <Link className="marketing-account-chip" to={homeRoute}>
              <span>{avatarInitial}</span>
              <strong>{displayName}</strong>
              <small>{user.role || "Staff"}</small>
            </Link>
          ) : (
            <>
              <Link className="marketing-signin" to="/auth">Sign in</Link>
              <Link className="marketing-button is-small" to="/auth?tab=register">
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="landing-hero" id="product">
        <div className="landing-hero-copy">
          <p className="landing-kicker">Restaurant point of sale and operations</p>
          <h1>Take the order.<br />Run the kitchen.<br /><span>Close the table.</span></h1>
          <p className="landing-hero-description">
            Restro keeps dine-in and takeaway service in one workflow—from
            table selection and menu entry to kitchen status, payment, and reporting.
          </p>
          <div className="landing-hero-actions">
            <Link
              className="marketing-button"
              to={user.isAuth ? homeRoute : "/auth?tab=register"}
            >
              {user.isAuth ? "Open workspace" : "Create free account"} <HiArrowRight />
            </Link>
            <a className="landing-secondary-button" href="#workflow">
              See the workflow
            </a>
          </div>
          <p className="landing-account-note">
            Owner signup by email or Google. Restaurant activation is approval-based.
          </p>
        </div>
        <ProductWindow />
      </section>

      <section className="landing-capabilities" id="workflow">
        <header className="landing-section-heading">
          <p>One connected service flow</p>
          <h2>The front desk, kitchen, and back office work from the same order.</h2>
          <span>
            Each workspace is role-aware, so staff see the actions relevant to
            their shift while owners keep full operational visibility.
          </span>
        </header>
        <div className="landing-capability-grid">
          {capabilityGroups.map(({ number, icon: Icon, title, text, items }) => (
            <article key={number}>
              <div className="landing-capability-title">
                <span>{number}</span><Icon />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <ul>
                {items.map((item) => <li key={item}><HiCheck /> {item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-detail-section">
        <div className="landing-detail-copy">
          <p className="landing-kicker">Live floor control</p>
          <h2>Know which table is free, occupied, reserved, or waiting for payment.</h2>
          <p>
            Build dining areas, combine compatible tables, attach the active
            order, and release the table automatically after payment.
          </p>
          <ul>
            <li><HiCheck /> Area-based floor organization</li>
            <li><HiCheck /> Upcoming reservation warnings</li>
            <li><HiCheck /> Dine-in and takeaway kept separate</li>
          </ul>
        </div>
        <TablePreview />
      </section>

      <section className="landing-detail-section is-reversed">
        <InventoryPreview />
        <div className="landing-detail-copy">
          <p className="landing-kicker">Stock connected to service</p>
          <h2>See what needs attention before it becomes unavailable.</h2>
          <p>
            Professional workspaces connect inventory items to menu sales,
            record adjustments, and surface low-stock alerts on the dashboard.
          </p>
          <ul>
            <li><HiCheck /> Order-linked stock deductions</li>
            <li><HiCheck /> Suppliers and purchase orders</li>
            <li><HiCheck /> Counts, logs, and CSV export</li>
          </ul>
        </div>
      </section>

      <section className="landing-setup-section" id="setup">
        <header className="landing-section-heading">
          <p>Setup</p>
          <h2>From owner account to first order in three clear stages.</h2>
        </header>
        <div className="landing-setup-grid">
          {setupSteps.map(({ number, title, text }) => (
            <article key={number}>
              <span>{number}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-plans-section" id="pricing">
        <header className="landing-section-heading">
          <p>Plans</p>
          <h2>Start with the operating essentials. Upgrade for deeper control.</h2>
          <span>Plan limits are enforced consistently in the product and API.</span>
        </header>
        <div className="landing-plan-grid">
          <article className="landing-plan">
            <header>
              <span>Starter</span>
              <h3>₹0 <small>/ month</small></h3>
              <p>For setting up and running a smaller operation.</p>
            </header>
            <ul>{starterFeatures.map((item) => <li key={item}><HiCheck /> {item}</li>)}</ul>
            <Link to="/auth?tab=register">Create Starter account <HiArrowRight /></Link>
          </article>
          <article className="landing-plan is-professional">
            <header>
              <span>Professional</span>
              <h3>₹2,499 <small>/ month</small></h3>
              <p>For restaurants that need inventory, analytics, QR menus, and reservations.</p>
            </header>
            <ul>{professionalFeatures.map((item) => <li key={item}><HiCheck /> {item}</li>)}</ul>
            <Link to="/auth?tab=register">Create owner account <HiArrowRight /></Link>
          </article>
        </div>
        <p className="landing-plan-disclosure">
          Plan assignment is controlled by the platform administrator. Subscription
          billing is not collected during account creation.
        </p>
      </section>

      <section className="landing-final-cta">
        <div>
          <HiOutlineQrcode />
          <p>Ready to configure your restaurant?</p>
          <h2>Create the owner account, then build the workspace around your service.</h2>
        </div>
        <Link className="marketing-button" to="/auth?tab=register">
          Create account <HiArrowRight />
        </Link>
      </section>

      <footer className="marketing-footer landing-footer">
        <div className="marketing-brand"><img src={logo} alt="" /><span>Restro</span></div>
        <p>Restaurant service and operations, connected.</p>
        <div><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/auth">Sign in</Link></div>
        <small>© {new Date().getFullYear()} Restro.</small>
      </footer>
    </main>
  );
}
