import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  HiArrowRight,
  HiChartBar,
  HiCheck,
  HiLightningBolt,
  HiOutlineCube,
  HiOutlineDeviceMobile,
  HiOutlineReceiptTax,
  HiOutlineSparkles,
  HiOutlineUsers,
  HiStar,
} from "react-icons/hi";
import logo from "../assets/images/logo.png";

const features = [
  { icon: HiLightningBolt, title: "Orders that keep moving", text: "Dine-in and takeaway orders flow from front of house to the kitchen in real time." },
  { icon: HiOutlineReceiptTax, title: "Payments without the gaps", text: "Track payment status, close orders, and issue clear receipts from one workflow." },
  { icon: HiOutlineCube, title: "Inventory you can trust", text: "Monitor stock, suppliers, purchase orders, and low-stock alerts before service is affected." },
  { icon: HiOutlineUsers, title: "A workspace for every role", text: "Purpose-built views for owners, managers, cashiers, waiters, and kitchen staff." },
  { icon: HiOutlineDeviceMobile, title: "QR menus, beautifully simple", text: "Give guests a fast, mobile-friendly menu that stays synced with availability." },
  { icon: HiChartBar, title: "Decisions backed by live data", text: "See revenue, orders, popular items, and operational signals without spreadsheet work." },
];

const steps = [
  ["01", "Create your account", "Start with Google or email. It takes less than a minute."],
  ["02", "Set up your restaurant", "Add your business details and submit them for approval."],
  ["03", "Run your first service", "Invite your team, build your menu, and start taking orders."],
];

const stats = [
  { value: "10,000+", label: "Orders tracked" },
  { value: "200+",    label: "Restaurants onboarded" },
  { value: "99.9%",   label: "Uptime SLA" },
  { value: "< 1 min", label: "Average setup time" },
];

const testimonials = [
  {
    quote: "We reduced order errors by 60% in the first week. The kitchen staff finally has clarity.",
    name: "Priya M.",
    role: "Owner",
    restaurant: "The Spice Garden, Bengaluru",
    rating: 5,
  },
  {
    quote: "Switched from a paper system. The QR menu alone saved us 2 hours of printing every week.",
    name: "Rahul K.",
    role: "Manager",
    restaurant: "Mumbai Bites, Mumbai",
    rating: 5,
  },
  {
    quote: "Our average table turn time dropped from 55 minutes to 38. Revenue jumped the same week.",
    name: "Sneha R.",
    role: "Owner",
    restaurant: "Coastal Kitchen, Goa",
    rating: 5,
  },
];

export default function Landing() {
  useEffect(() => {
    document.title = "Restro | Modern Restaurant POS & Operations";
  }, []);

  return (
    <main className="marketing-page">
      <nav className="marketing-nav" aria-label="Main navigation">
        <Link className="marketing-brand" to="/" aria-label="Restro home">
          <img src={logo} alt="" />
          <span>Restro</span>
        </Link>
        <div className="marketing-nav-links">
          <a href="#features">Platform</a>
          <a href="#how-it-works">How it works</a>
          <a href="#testimonials">Reviews</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="marketing-nav-actions">
          <Link className="marketing-signin" to="/auth">Sign in</Link>
          <Link className="marketing-button is-small" to="/auth?tab=register">
            Get started <HiArrowRight />
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="marketing-hero">
        <div className="marketing-glow" />
        <div className="marketing-eyebrow"><HiOutlineSparkles /> Built for modern restaurant teams</div>
        <h1>Your restaurant,<br /><em>in perfect rhythm.</em></h1>
        <p>One calm, connected workspace for orders, tables, kitchen, payments, inventory, and the people who make service happen.</p>

        {/* Social proof above CTA — Authority Bias */}
        <div className="marketing-social-proof-bar">
          <span className="marketing-stars">
            {[...Array(5)].map((_, i) => <HiStar key={i} />)}
          </span>
          <span>Trusted by <strong>200+ restaurants</strong> across India</span>
          <span className="marketing-proof-divider">·</span>
          <span>Rated <strong>4.8 / 5</strong> by restaurant owners</span>
        </div>

        <div className="marketing-hero-actions">
          <Link className="marketing-button" to="/auth?tab=register">
            Start free — no card required <HiArrowRight />
          </Link>
          <a className="marketing-text-link" href="#how-it-works">See how it works</a>
        </div>
        <div className="marketing-proof">
          <span><HiCheck /> No card required</span>
          <span><HiCheck /> Guided setup</span>
          <span><HiCheck /> Cancel anytime</span>
        </div>

        {/* Product preview */}
        <div className="marketing-product" aria-label="Restro product preview">
          <div className="marketing-product-top">
            <span className="marketing-product-logo">R</span>
            <span>Today&apos;s service</span>
            <span className="marketing-live"><i /> Live</span>
          </div>
          <div className="marketing-product-grid">
            <article><small>Net sales</small><strong>₹84,240</strong><span>↑ 12.4% today</span></article>
            <article><small>Orders</small><strong>186</strong><span>24 currently open</span></article>
            <article><small>Avg. ticket</small><strong>₹452</strong><span>↑ ₹28 this week</span></article>
            <article className="is-wide">
              <div><small>Service pulse</small><strong>Everything is moving</strong></div>
              <div className="marketing-bars"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </article>
          </div>
        </div>
      </section>

      {/* ── Stats bar — Social Proof ───────────────────────────────────────── */}
      <div className="marketing-stats-bar">
        {stats.map(({ value, label }) => (
          <div key={label} className="marketing-stat">
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="marketing-section" id="features">
        <div className="marketing-section-heading">
          <span>Everything connected</span>
          <h2>Less operational noise.<br />More exceptional service.</h2>
          <p>Restro replaces disconnected tools with one clear source of truth for your entire restaurant.</p>
        </div>
        <div className="marketing-feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <div><Icon /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="marketing-section marketing-steps-section" id="how-it-works">
        <div className="marketing-section-heading">
          <span>From signup to service</span>
          <h2>Ready without the rollout headache.</h2>
        </div>
        <div className="marketing-steps">
          {steps.map(([number, title, text]) => (
            <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      {/* ── Testimonials — Social Proof ───────────────────────────────────── */}
      <section className="marketing-section" id="testimonials">
        <div className="marketing-section-heading">
          <span>What restaurants say</span>
          <h2>Real results from real teams.</h2>
          <p>From QSRs to fine dining — here's what changed after switching to Restro.</p>
        </div>
        <div className="marketing-testimonials">
          {testimonials.map(({ quote, name, role, restaurant, rating }) => (
            <article key={name} className="marketing-testimonial-card">
              <div className="marketing-testimonial-stars">
                {[...Array(rating)].map((_, i) => <HiStar key={i} />)}
              </div>
              <blockquote>"{quote}"</blockquote>
              <footer>
                <div className="marketing-testimonial-avatar">
                  {name.charAt(0)}
                </div>
                <div>
                  <strong>{name}</strong>
                  <span>{role} · {restaurant}</span>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </section>

      {/* ── Pricing CTA ───────────────────────────────────────────────────── */}
      <section className="marketing-pricing" id="pricing">
        <div>
          <span>Simple pricing</span>
          <h2>Start lean. Grow without changing systems.</h2>
          <p>Begin with the essentials, then unlock advanced inventory, reporting, and operations as your restaurant grows.</p>
        </div>
        <Link className="marketing-button is-light" to="/auth?tab=register">Create your account <HiArrowRight /></Link>
      </section>

      <footer className="marketing-footer">
        <div className="marketing-brand"><img src={logo} alt="" /><span>Restro</span></div>
        <p>Restaurant operations, in one place.</p>
        <div><Link to="/auth">Sign in</Link><Link to="/auth?tab=register">Get started</Link></div>
        <small>© {new Date().getFullYear()} Restro. Built for better service.</small>
      </footer>
    </main>
  );
}
