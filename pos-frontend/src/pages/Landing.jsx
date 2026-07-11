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
} from "react-icons/hi";
import logo from "../assets/images/logo.png";
import { getHomeRoute } from "../components/shared/RouteGuards";
import { site } from "../config/site";
import { PublicFooter, PublicNav } from "../components/public/PublicChrome";
import SeoHelmet from "../components/seo/SeoHelmet";
import { trackMarketingEvent } from "../utils/marketingAnalytics";

const capabilityGroups = [
  {
    number: "01",
    icon: HiOutlineReceiptTax,
    title: "Service",
    text: "Take dine-in or takeaway orders, send clear tickets to the kitchen, and track every status change.",
    items: [
      "Table-aware orders",
      "Kitchen status flow",
      "Cash and online payments",
    ],
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
  "Up to 300 orders/month — blocks at limit",
  "Up to 30 menu items",
  "Up to 10 tables",
  "3 staff accounts",
  "7-day order history only",
  "Cash and online payment workflows",
];

const professionalFeatures = [
  "Unlimited orders, menu items, and tables",
  "Up to 10 staff accounts with role controls",
  "90-day revenue analytics and CSV exports",
  "Inventory, suppliers, and low-stock alerts",
  "Up to 50 QR digital menu codes",
  "Reservations, itemised receipts",
];

const landingFaq = [
  {
    question: "What is restaurant POS software?",
    answer:
      "Restaurant POS software connects order entry, tables, kitchen progress, payments, and operational records in one workflow. It helps the service team move an order from placement to payment without separate paper or spreadsheet records.",
  },
  {
    question: "Does this restaurant POS work without the internet?",
    answer: `${site.brandName} is currently a web-based system and requires an internet connection. Offline billing is not advertised because it is not currently supported.`,
  },
  {
    question: "Is GST invoicing included?",
    answer: `${site.brandName} supports configurable tax rates and receipt workflows. It is not currently presented as certified GST, e-invoicing, or tax-compliance software; each business remains responsible for validating its invoice and tax setup.`,
  },
  {
    question: "Can a small cafe use this POS?",
    answer:
      "Yes. The Starter workspace is designed for smaller operations and includes published monthly limits for orders, menu items, tables, staff accounts, and order history.",
  },
  {
    question: "Can hotel restaurants use it?",
    answer: `${site.brandName} can support the restaurant workflows described on this page. It does not claim hotel property-management, room-charge, or front-desk integration, so hotels should evaluate it only for supported food-and-beverage operations.`,
  },
  {
    question: "Does it provide central control for multiple outlets?",
    answer: `${site.brandName} currently organizes operations around an individual restaurant workspace. Centralized multi-outlet menus, consolidated reporting, and cross-outlet inventory are not advertised as supported capabilities.`,
  },
  {
    question: "How do I start?",
    answer:
      "Create an owner account, configure the restaurant workspace, and submit it for activation. After approval, add the menu, dining areas, tables, taxes, staff roles, and inventory before taking the first order.",
  },
];

function ProductWindow() {
  return (
    <div
      className="landing-product-window"
      aria-label={`${site.brandName} order workflow preview`}
    >
      <div className="landing-window-bar">
        <span className="landing-window-brand">
          <img src={logo} alt="" />
          <strong>{site.brandName}</strong>
        </span>
        <span className="landing-window-context">Friday dinner service</span>
        <span className="landing-window-status">
          <i /> Live workspace
        </span>
      </div>
      <div className="landing-product-body">
        <aside
          className="landing-product-nav"
          aria-label="Product preview navigation"
        >
          <span className="is-active">
            <HiOutlineClipboardList /> Orders
          </span>
          <span>
            <HiOutlineTable /> Tables
          </span>
          <span>
            <HiOutlineMenu /> Menu
          </span>
          <span>
            <HiOutlineCube /> Inventory
          </span>
          <span>
            <HiOutlineChartBar /> Analytics
          </span>
        </aside>
        <div className="landing-order-board">
          <div className="landing-board-heading">
            <div>
              <small>Order flow</small>
              <strong>Kitchen board</strong>
            </div>
            <button type="button" tabIndex="-1">
              + New order
            </button>
          </div>
          <div className="landing-board-columns">
            <section>
              <header>
                <span>New</span>
                <b>2</b>
              </header>
              <article>
                <div>
                  <strong>#1042</strong>
                  <span>Table 08</span>
                </div>
                <p>
                  2 × Masala dosa
                  <br />1 × Filter coffee
                </p>
                <small>Placed just now</small>
              </article>
              <article className="is-muted">
                <div>
                  <strong>#1041</strong>
                  <span>Takeaway</span>
                </div>
                <p>
                  1 × Paneer tikka
                  <br />2 × Butter naan
                </p>
                <small>Placed 2 min ago</small>
              </article>
            </section>
            <section>
              <header>
                <span>Preparing</span>
                <b>1</b>
              </header>
              <article className="is-active">
                <div>
                  <strong>#1040</strong>
                  <span>Table 03</span>
                </div>
                <p>
                  1 × Hyderabadi biryani
                  <br />1 × Raita
                </p>
                <small>Kitchen accepted</small>
              </article>
            </section>
            <section>
              <header>
                <span>Ready</span>
                <b>1</b>
              </header>
              <article className="is-ready">
                <div>
                  <strong>#1039</strong>
                  <span>Table 11</span>
                </div>
                <p>2 × Chole bhature</p>
                <small>Ready for service</small>
              </article>
            </section>
          </div>
        </div>
      </div>
      <p className="landing-preview-caption">
        Product preview using sample order data
      </p>
    </div>
  );
}

function TablePreview() {
  return (
    <div className="landing-table-preview" aria-hidden="true">
      <header>
        <div>
          <small>Ground floor</small>
          <strong>Live table map</strong>
        </div>
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
            <strong>{number}</strong>
            <span>{state}</span>
            <small>4 seats</small>
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
        <div>
          <small>Inventory</small>
          <strong>Stock attention</strong>
        </div>
        <span>Updated with orders</span>
      </header>
      {[
        ["Paneer", "4.2 kg", "Low stock", 24],
        ["Basmati rice", "18 kg", "Healthy", 72],
        ["Cooking oil", "7.5 L", "Reorder soon", 38],
      ].map(([name, stock, status, width]) => (
        <article key={name}>
          <div>
            <strong>{name}</strong>
            <span>{status}</span>
          </div>
          <div className="landing-stock-track">
            <i style={{ width: `${width}%` }} />
          </div>
          <small>{stock} available</small>
        </article>
      ))}
    </div>
  );
}

export default function Landing() {
  const user = useSelector((state) => state.user);
  const homeRoute = user.isAuth ? getHomeRoute(user) : "/auth";

  return (
    <main className="marketing-page landing-v2">
      <SeoHelmet
        title="Restaurant POS & Operations India"
        description={`Explore ${site.brandName}, restaurant POS software for orders, tables, kitchen, payments, inventory and staff. See transparent INR pricing.`}
        pathname="/"
        faq={landingFaq}
      />

      <PublicNav />

      <section className="landing-hero" id="product">
        <div className="landing-hero-copy">
          <p className="landing-kicker">
            Restaurant point of sale and operations
          </p>
          <h1>
            Take the order.
            <br />
            Run the kitchen.
            <br />
            <span>Close the table.</span>
          </h1>
          <p className="landing-hero-description">
            {site.brandName} keeps dine-in and takeaway service in one
            workflow—from table selection and menu entry to kitchen status,
            payment, and reporting.
          </p>
          <div className="landing-hero-actions">
            <Link
              className="marketing-button"
              to={user.isAuth ? homeRoute : "/auth?tab=register"}
              onClick={() =>
                trackMarketingEvent("primary_cta_click", {
                  placement: "hero",
                  destination: user.isAuth ? "workspace" : "signup",
                })
              }
            >
              {user.isAuth ? "Open workspace" : "Create free account"}{" "}
              <HiArrowRight />
            </Link>
            <a className="landing-secondary-button" href="#workflow">
              See the workflow
            </a>
          </div>
          <p className="landing-account-note">
            No card required · Approval-based · Cancel anytime
          </p>
          <p className="landing-social-proof">
            Trusted by restaurants handling 50–800 orders/day
          </p>
        </div>
        <ProductWindow />
      </section>

      <section
        className="landing-answer-section"
        aria-labelledby="india-pos-answer"
      >
        <p className="landing-kicker">Built for food-service operations</p>
        <h2 id="india-pos-answer">What does this POS software handle?</h2>
        <p>
          {site.brandName} is web-based restaurant POS and operations software
          for Indian restaurants, cafes, cloud kitchens, bars, bakeries, food
          courts, and hotel food-and-beverage teams whose service fits the
          supported workflow. It connects dine-in and takeaway orders with
          tables, kitchen status, payments, inventory, staff roles, QR menus,
          and reporting.
        </p>
        <p className="landing-honesty-note">
          It is not presented as offline billing, certified GST or e-invoicing
          software, a food-delivery aggregator integration, or a hotel property
          management system, or centralized multi-outlet platform unless those
          capabilities are implemented and verified later.
        </p>
      </section>

      <section className="landing-capabilities" id="workflow">
        <header className="landing-section-heading">
          <p>One connected service flow</p>
          <h2>
            The front desk, kitchen, and back office work from the same order.
          </h2>
          <span>
            Each workspace is role-aware, so staff see the actions relevant to
            their shift while owners keep full operational visibility.
          </span>
        </header>
        <div className="landing-capability-grid">
          {capabilityGroups.map(
            ({ number, icon: Icon, title, text, items }) => (
              <article key={number}>
                <div className="landing-capability-title">
                  <span>{number}</span>
                  <Icon />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <ul>
                  {items.map((item) => (
                    <li key={item}>
                      <HiCheck /> {item}
                    </li>
                  ))}
                </ul>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="landing-detail-section">
        <div className="landing-detail-copy">
          <p className="landing-kicker">Live floor control</p>
          <h2>
            Know which table is free, occupied, reserved, or waiting for
            payment.
          </h2>
          <p>
            Build dining areas, combine compatible tables, attach the active
            order, and release the table automatically after payment.
          </p>
          <ul>
            <li>
              <HiCheck /> Area-based floor organization
            </li>
            <li>
              <HiCheck /> Upcoming reservation warnings
            </li>
            <li>
              <HiCheck /> Dine-in and takeaway kept separate
            </li>
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
            <li>
              <HiCheck /> Order-linked stock deductions
            </li>
            <li>
              <HiCheck /> Suppliers and purchase orders
            </li>
            <li>
              <HiCheck /> Counts, logs, and CSV export
            </li>
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
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* QR Lead Magnet — Reciprocity: give before you ask */}
      <section className="landing-qr-leadmagnet" id="qr-menu">
        <div className="landing-qr-leadmagnet-inner">
          <div className="landing-qr-leadmagnet-icon">📱</div>
          <div className="landing-qr-leadmagnet-body">
            <p className="landing-qr-eyebrow">Free with every workspace</p>
            <h2>Your restaurant gets a digital menu — no extra setup.</h2>
            <p>
              Every approved workspace automatically gets a public QR menu
              at{" "}
              <code>restro.app/menu/your-slug</code>. Customers scan, browse,
              and order from their phone. No printing. No maintenance.
              It&apos;s already included — Starter gets one QR code,
              Professional gets up to 50.
            </p>
          </div>
          <a
            className="landing-qr-cta"
            href="/auth?tab=register"
          >
            Get my free menu <HiArrowRight />
          </a>
        </div>
      </section>

      <section className="landing-plans-section" id="pricing">
        <header className="landing-section-heading">
          <p>Plans</p>
          <h2>
            Start free. Upgrade when your restaurant is ready to scale.
          </h2>
          <span>
            Plan limits are enforced consistently in the product and API.
          </span>
        </header>
        <div className="landing-plan-grid">
          {/* Professional shown FIRST — anchors value before Starter */}
          <article className="landing-plan is-professional">
            <header>
              <div className="landing-plan-badge-row">
                <span className="landing-plan-name">Professional</span>
                <span className="landing-plan-popular-badge">Most chosen</span>
              </div>
              <h3>
                ₹2,499 <small>/ month</small>
              </h3>
              <p className="landing-plan-per-day">~₹83/day — less than one missed order</p>
              <p>
                For restaurants doing serious volume — unlimited orders,
                full analytics, inventory, and QR menus.
              </p>
            </header>
            <ul>
              {professionalFeatures.map((item) => (
                <li key={item}>
                  <HiCheck /> {item}
                </li>
              ))}
            </ul>
            <Link
              to="/auth?tab=register"
              onClick={() =>
                trackMarketingEvent("plan_cta_click", {
                  plan: "professional",
                })
              }
            >
              Get started <HiArrowRight />
            </Link>
          </article>
          {/* Starter shown SECOND — feels like a lighter option after the anchor */}
          <article className="landing-plan">
            <header>
              <div className="landing-plan-badge-row">
                <span className="landing-plan-name">Starter</span>
                <span className="landing-plan-pilot-badge">Good for pilots</span>
              </div>
              <h3>
                ₹0 <small>/ month</small>
              </h3>
              <p>For pilots and smaller operations. Hard limits apply — orders block at 300/month.</p>
            </header>
            <ul>
              {starterFeatures.map((item) => (
                <li key={item}>
                  <HiCheck /> {item}
                </li>
              ))}
            </ul>
            <Link
              to="/auth?tab=register"
              onClick={() =>
                trackMarketingEvent("plan_cta_click", { plan: "starter" })
              }
            >
              Start free <HiArrowRight />
            </Link>
          </article>
        </div>
        <p className="landing-plan-disclosure">
          Plan assignment is controlled by the platform administrator.
          Subscription billing is not collected during account creation.
        </p>
      </section>

      <section className="landing-final-cta">
        <div>
          <HiOutlineQrcode />
          <p>Ready to configure your restaurant?</p>
          <h2>
            Create the owner account, then build the workspace around your
            service.
          </h2>
        </div>
        <Link
          className="marketing-button"
          to="/auth?tab=register"
          onClick={() =>
            trackMarketingEvent("primary_cta_click", {
              placement: "final",
              destination: "signup",
            })
          }
        >
          Create account <HiArrowRight />
        </Link>
      </section>

      <section
        className="landing-faq-section"
        aria-labelledby="landing-faq-title"
      >
        <header className="landing-section-heading">
          <p>Questions, answered plainly</p>
          <h2 id="landing-faq-title">Restaurant POS software FAQs</h2>
          <span>
            Direct answers about the current product—including what it does not
            claim to provide.
          </span>
        </header>
        <div className="landing-faq-list">
          {landingFaq.map(({ question, answer }) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
