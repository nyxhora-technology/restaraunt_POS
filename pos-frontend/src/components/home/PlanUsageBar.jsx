import React from "react";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getOrderUsage } from "../../https";
import { MdArrowForward, MdRocketLaunch } from "react-icons/md";

/**
 * PlanUsageBar — shown on the dashboard for OWNER/MANAGER roles.
 *
 * Renders a usage bar showing orders used vs limit this month.
 * Hidden on unlimited plans (PROFESSIONAL / ENTERPRISE).
 * Turns amber at 70%, red at 90% to create upgrade urgency.
 *
 * Psychology:
 * - Progress bars make limits feel real and personal (Loss Aversion)
 * - Colour change at 70% starts low-grade anxiety before the actual wall
 * - The CTA only appears at ≥70% so it's not always nagging
 */
const PlanUsageBar = () => {
  const navigate = useNavigate();
  const user = useSelector((s) => s.user);

  // Only show for owners/managers on tenant restaurants
  const eligible =
    user.restaurantId &&
    (user.role === "OWNER" || user.role === "MANAGER") &&
    user.role !== "SUPER_ADMIN";

  const { data, isLoading } = useQuery({
    queryKey: ["order-usage", user.restaurantId],
    queryFn: getOrderUsage,
    enabled: Boolean(eligible),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // refresh every 5 min quietly
  });

  if (!eligible || isLoading) return null;

  const usage = data?.data?.data;
  if (!usage || usage.unlimited) return null; // PROFESSIONAL/ENTERPRISE: hide bar

  const { ordersThisMonth, limit, percentage, plan } = usage;

  let tier = "calm";
  if (percentage >= 90) tier = "danger";
  else if (percentage >= 70) tier = "warn";

  const isAtLimit = ordersThisMonth >= limit;

  return (
    <div className={`plan-usage-bar tier-${tier}`} role="status" aria-label="Monthly order usage">
      <div className="plan-usage-left">
        <span className="plan-usage-icon">
          {isAtLimit ? "🚫" : percentage >= 70 ? "⚠️" : "📊"}
        </span>
        <div className="plan-usage-text">
          <strong>
            {isAtLimit
              ? "Order limit reached"
              : `${ordersThisMonth} of ${limit} orders used this month`}
          </strong>
          <span className="plan-usage-sub">
            {isAtLimit
              ? "Upgrade to Professional for unlimited orders"
              : `${limit - ordersThisMonth} remaining · ${plan} plan`}
          </span>
        </div>
      </div>

      <div className="plan-usage-right">
        <div className="plan-usage-track" aria-label={`${percentage}% used`}>
          <div
            className="plan-usage-fill"
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemax={100}
          />
        </div>
        <span className="plan-usage-pct">{percentage}%</span>

        {percentage >= 70 && (
          <button
            type="button"
            className="plan-usage-cta"
            onClick={() => navigate("/settings")}
          >
            <MdRocketLaunch />
            Upgrade <MdArrowForward />
          </button>
        )}
      </div>
    </div>
  );
};

export default PlanUsageBar;
