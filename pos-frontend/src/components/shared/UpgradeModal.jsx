import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMenu, getTables, getStaff, getOrderUsage } from "../../https";
import {
  MdArrowForward,
  MdArrowBack,
  MdClose,
  MdRocketLaunch,
  MdCheckCircle,
  MdBarChart,
  MdInventory,
  MdQrCode,
  MdPeople,
  MdRestaurantMenu,
  MdTableRestaurant,
} from "react-icons/md";
import { HiOutlineShieldCheck } from "react-icons/hi";

/**
 * UpgradeModal — Multi-page paywall following Jonathan Parra's principles:
 *
 * Page 1 — "What you've built" (IKEA Effect + Loss Aversion)
 * Page 2 — "Where Professional takes you" (Outcome selling)
 * Page 3 — "The plan" (Transparency + Risk reduction + per-day anchor)
 *
 * Dismiss copy on Page 1: "I'll risk hitting the order limit" (Loss Aversion)
 */
const UpgradeModal = ({ onClose }) => {
  const [page, setPage] = useState(0);
  const user = useSelector((s) => s.user);
  const navigate = useNavigate();

  // Fetch real user data to personalise Page 1
  const { data: menuData } = useQuery({
    queryKey: ["upgrade-menu", user.restaurantId],
    queryFn: getMenu,
    enabled: Boolean(user.restaurantId),
    staleTime: 60_000,
  });
  const { data: tableData } = useQuery({
    queryKey: ["upgrade-tables", user.restaurantId],
    queryFn: getTables,
    enabled: Boolean(user.restaurantId),
    staleTime: 60_000,
  });
  const { data: staffData } = useQuery({
    queryKey: ["upgrade-staff", user.restaurantId],
    queryFn: getStaff,
    enabled: Boolean(user.restaurantId),
    staleTime: 60_000,
  });
  const { data: usageData } = useQuery({
    queryKey: ["order-usage", user.restaurantId],
    queryFn: getOrderUsage,
    enabled: Boolean(user.restaurantId),
    staleTime: 60_000,
  });

  const categories = menuData?.data?.data || [];
  const menuItems = categories.flatMap((c) => c.menuItems || []);
  const tables = tableData?.data?.data || [];
  const staff = staffData?.data?.data || [];
  const usage = usageData?.data?.data;
  const restaurantName = user.restaurant?.name || "your restaurant";

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pages = [
    { id: "built", label: "What you've built" },
    { id: "outcomes", label: "Where Professional takes you" },
    { id: "plan", label: "The plan" },
  ];

  const totalPages = pages.length;
  const isLast = page === totalPages - 1;
  const isFirst = page === 0;

  const handleUpgrade = () => {
    onClose();
    navigate("/app/settings");
  };

  return (
    <div
      className="upgrade-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div className="upgrade-modal">
        {/* Header — step dots + close */}
        <div className="upgrade-modal-header">
          <div className="upgrade-modal-steps">
            {pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={`upgrade-modal-step-dot ${i === page ? "is-active" : ""} ${i < page ? "is-done" : ""}`}
                onClick={() => i <= page && setPage(i)}
                aria-label={`Step ${i + 1}: ${p.label}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="upgrade-modal-close"
            onClick={onClose}
            aria-label="Close upgrade modal"
          >
            <MdClose />
          </button>
        </div>

        {/* ── Page 1: What you've built ────────────────────────────────── */}
        {page === 0 && (
          <div className="upgrade-modal-body upgrade-page-built">
            <div className="upgrade-page-eyebrow">
              <MdRocketLaunch /> {restaurantName}
            </div>
            <h2 id="upgrade-modal-title" className="upgrade-modal-title">
              Look at what you&apos;ve built.
            </h2>
            <p className="upgrade-modal-subtitle">
              You&apos;ve invested real time setting up your POS. Here&apos;s what&apos;s live right now:
            </p>

            <div className="upgrade-stats-grid">
              <div className="upgrade-stat-card">
                <MdRestaurantMenu className="upgrade-stat-icon" />
                <strong>{menuItems.length}</strong>
                <span>menu items</span>
              </div>
              <div className="upgrade-stat-card">
                <MdTableRestaurant className="upgrade-stat-icon" />
                <strong>{tables.length}</strong>
                <span>tables</span>
              </div>
              <div className="upgrade-stat-card">
                <MdPeople className="upgrade-stat-icon" />
                <strong>{staff.length}</strong>
                <span>team members</span>
              </div>
              {usage && !usage.unlimited && (
                <div className="upgrade-stat-card is-highlight">
                  <MdBarChart className="upgrade-stat-icon" />
                  <strong>{usage.ordersThisMonth}</strong>
                  <span>orders this month</span>
                </div>
              )}
            </div>

            {usage && !usage.unlimited && (
              <div className="upgrade-limit-callout">
                <span>⚠️</span>
                <div>
                  <strong>
                    Your Starter plan allows {usage.limit} orders/month.
                  </strong>
                  <p>
                    You have {Math.max(0, usage.limit - usage.ordersThisMonth)} orders left before service blocks.
                    All the work you&apos;ve put into your menu, tables, and staff will be paused for ordering
                    until the month resets or you upgrade.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Page 2: Outcomes ─────────────────────────────────────────── */}
        {page === 1 && (
          <div className="upgrade-modal-body upgrade-page-outcomes">
            <div className="upgrade-page-eyebrow">
              <MdRocketLaunch /> Professional plan
            </div>
            <h2 id="upgrade-modal-title" className="upgrade-modal-title">
              Run without limits or blind spots.
            </h2>
            <p className="upgrade-modal-subtitle">
              Professional removes every constraint that slows a busy service down.
            </p>

            <ul className="upgrade-outcomes-list">
              {[
                {
                  icon: MdRestaurantMenu,
                  outcome: "Unlimited orders",
                  detail: "No monthly cap. Peak weekend? Busy festival? Service never blocks.",
                },
                {
                  icon: MdBarChart,
                  outcome: "90-day revenue analytics",
                  detail: "Spot dish trends, peak hours, and declining items before they hurt revenue.",
                },
                {
                  icon: MdInventory,
                  outcome: "Inventory tracking",
                  detail: "Know when you're running low on an ingredient before a customer orders the last portion.",
                },
                {
                  icon: MdQrCode,
                  outcome: "Up to 50 QR digital menus",
                  detail: "Let customers browse and order from their phone — no printing needed.",
                },
                {
                  icon: MdPeople,
                  outcome: "Up to 10 staff accounts",
                  detail: "Full team — owner, manager, cashier, waiter, kitchen — all with the right access.",
                },
              ].map(({ icon: Icon, outcome, detail }) => (
                <li key={outcome} className="upgrade-outcome-item">
                  <span className="upgrade-outcome-icon"><Icon /></span>
                  <div>
                    <strong>{outcome}</strong>
                    <p>{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Page 3: Transparent pricing ─────────────────────────────── */}
        {page === 2 && (
          <div className="upgrade-modal-body upgrade-page-plan">
            <div className="upgrade-page-eyebrow">
              <HiOutlineShieldCheck /> Transparent pricing
            </div>
            <h2 id="upgrade-modal-title" className="upgrade-modal-title">
              ₹2,499<span className="upgrade-price-mo">/month</span>
            </h2>
            <p className="upgrade-modal-per-day">
              ~₹83/day — less than one lost order costs your restaurant
            </p>

            <div className="upgrade-timeline">
              <p className="upgrade-timeline-label">What happens when you upgrade:</p>
              <div className="upgrade-timeline-steps">
                {[
                  {
                    label: "Today",
                    detail: "Unlimited orders activate immediately. Service resumes.",
                    active: true,
                  },
                  {
                    label: "This week",
                    detail: "Set up inventory, connect QR menus, extend your team to 10.",
                    active: false,
                  },
                  {
                    label: "Month 1",
                    detail: "Full 90-day analytics unlocked — track revenue trends from day one.",
                    active: false,
                  },
                  {
                    label: "Anytime",
                    detail: "Cancel or downgrade from Settings — no contract, no penalty.",
                    active: false,
                  },
                ].map(({ label, detail, active }) => (
                  <div key={label} className={`upgrade-timeline-step ${active ? "is-now" : ""}`}>
                    <span className={`upgrade-tl-dot ${active ? "is-active" : ""}`} />
                    <div>
                      <strong>{label}</strong>
                      <p>{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="upgrade-trust-signals">
              {[
                "No contract — cancel anytime from Settings",
                "Your data stays yours — export everything as CSV",
                "Downgrade at any time — Starter limits restore immediately",
                "Activation is handled by our team personally",
              ].map((sig) => (
                <p key={sig}>
                  <MdCheckCircle className="upgrade-trust-check" /> {sig}
                </p>
              ))}
            </div>

            <button
              type="button"
              className="upgrade-modal-primary-cta"
              onClick={handleUpgrade}
            >
              <MdRocketLaunch /> Upgrade to Professional <MdArrowForward />
            </button>
          </div>
        )}

        {/* Footer — nav buttons */}
        <div className="upgrade-modal-footer">
          <div className="upgrade-modal-nav">
            {!isFirst && (
              <button
                type="button"
                className="upgrade-modal-back"
                onClick={() => setPage((p) => p - 1)}
              >
                <MdArrowBack /> Back
              </button>
            )}
            {isFirst && (
              <button
                type="button"
                className="upgrade-modal-dismiss"
                onClick={onClose}
              >
                I&apos;ll risk hitting the order limit
              </button>
            )}
            {!isLast ? (
              <button
                type="button"
                className="upgrade-modal-next"
                onClick={() => setPage((p) => p + 1)}
              >
                Next <MdArrowForward />
              </button>
            ) : (
              <button
                type="button"
                className="upgrade-modal-next"
                onClick={handleUpgrade}
              >
                Upgrade now <MdArrowForward />
              </button>
            )}
          </div>
          {!isFirst && (
            <button
              type="button"
              className="upgrade-modal-skip-dismiss"
              onClick={onClose}
            >
              Continue on Starter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
