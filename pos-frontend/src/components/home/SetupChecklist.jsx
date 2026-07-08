import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMenu, getTables, getStaff, getOrders } from "../../https";
import {
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdArrowForward,
  MdClose,
} from "react-icons/md";
import { HiOutlineLightningBolt } from "react-icons/hi";

const CHECKLIST_DISMISSED_KEY = "restro_setup_checklist_dismissed_v1";

/**
 * SetupChecklist — Zeigarnik Effect
 *
 * Incomplete tasks are remembered far better than completed ones.
 * This component creates open loops that pull the owner back until
 * all 5 setup steps are done. It auto-hides once everything is complete.
 */
const SetupChecklist = () => {
  const navigate = useNavigate();
  const user = useSelector((s) => s.user);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(CHECKLIST_DISMISSED_KEY) === "1",
  );

  const { data: menuData } = useQuery({
    queryKey: ["setup-menu", user.restaurantId],
    queryFn: getMenu,
    enabled: Boolean(user.restaurantId),
    staleTime: 60_000,
  });

  const { data: tableData } = useQuery({
    queryKey: ["setup-tables", user.restaurantId],
    queryFn: getTables,
    enabled: Boolean(user.restaurantId),
    staleTime: 60_000,
  });

  const { data: staffData } = useQuery({
    queryKey: ["setup-staff", user.restaurantId],
    queryFn: getStaff,
    enabled: Boolean(user.restaurantId),
    staleTime: 60_000,
  });

  const { data: ordersData } = useQuery({
    queryKey: ["setup-orders", user.restaurantId],
    queryFn: () => getOrders({ limit: 1 }),
    enabled: Boolean(user.restaurantId),
    staleTime: 60_000,
  });

  if (dismissed) return null;

  // Derive completion states
  // API returns: { data: { data: Category[] } } where each Category has menuItems[]
  const categories = menuData?.data?.data || [];
  const allItems = categories.flatMap((c) => c.menuItems || []);
  const tables = tableData?.data?.data || [];
  const staff = staffData?.data?.data || [];
  const orders = ordersData?.data?.data || [];

  const steps = [
    {
      id: "restaurant",
      label: "Restaurant approved",
      done: true, // they're here, so it's done
      sub: "Your workspace is live",
      action: null,
    },
    {
      id: "menu",
      label: "Add your first menu item",
      done: allItems.length > 0,
      sub: allItems.length > 0 ? `${allItems.length} item${allItems.length !== 1 ? "s" : ""} added` : "Customers can't order without a menu",
      action: () => navigate("/app/menu"),
      cta: "Add menu",
    },
    {
      id: "tables",
      label: "Create your floor plan",
      done: tables.length > 0,
      sub: tables.length > 0 ? `${tables.length} table${tables.length !== 1 ? "s" : ""} set up` : "Set up tables for dine-in orders",
      action: () => navigate("/app/tables"),
      cta: "Add tables",
    },
    {
      id: "staff",
      label: "Invite a team member",
      done: staff.length > 1, // owner counts as 1
      sub: staff.length > 1 ? `${staff.length} team members` : "Add your cashier, waiter, or kitchen staff",
      action: () => navigate("/app/settings"),
      cta: "Invite staff",
    },
    {
      id: "orders",
      label: "Take your first order",
      done: orders.length > 0,
      sub: orders.length > 0 ? "First order taken — you're live! 🎉" : "Everything is ready — take your first order",
      action: null, // triggered via the Create Order flow
      cta: null,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const pct = Math.round((completedCount / steps.length) * 100);

  // Auto-dismiss after all done (after 3 s so user sees the win)
  if (allDone) {
    setTimeout(() => {
      localStorage.setItem(CHECKLIST_DISMISSED_KEY, "1");
      setDismissed(true);
    }, 3000);
  }

  const handleDismiss = () => {
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, "1");
    setDismissed(true);
  };

  return (
    <section className="setup-checklist dashboard-panel">
      {/* Header */}
      <div className="setup-checklist-header">
        <div className="setup-checklist-title">
          <span className="setup-checklist-icon">
            <HiOutlineLightningBolt />
          </span>
          <div>
            <h2>
              {allDone ? "You're all set! 🎉" : "Complete your setup"}
            </h2>
            <p>
              {allDone
                ? "Your restaurant is fully configured and live."
                : `${completedCount} of ${steps.length} steps done`}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="setup-checklist-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss setup checklist"
          title="Dismiss"
        >
          <MdClose />
        </button>
      </div>

      {/* Progress bar */}
      <div className="setup-progress-track">
        <div
          className="setup-progress-fill"
          style={{ width: `${pct}%` }}
          aria-valuenow={pct}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
      <p className="setup-progress-label">{pct}% complete</p>

      {/* Steps */}
      <ol className="setup-steps">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`setup-step ${step.done ? "is-done" : "is-pending"}`}
          >
            <span className="setup-step-check">
              {step.done ? <MdCheckCircle /> : <MdRadioButtonUnchecked />}
            </span>
            <div className="setup-step-body">
              <strong>{step.label}</strong>
              <small>{step.sub}</small>
            </div>
            {!step.done && step.action && (
              <button
                type="button"
                className="setup-step-cta"
                onClick={step.action}
              >
                {step.cta} <MdArrowForward />
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};

export default SetupChecklist;
