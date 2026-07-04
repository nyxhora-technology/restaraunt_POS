import React from "react";
import { MdLock, MdArrowUpward, MdTrendingDown } from "react-icons/md";
import useFeature from "../../hooks/useFeature";

const FEATURE_META = {
  INVENTORY: {
    icon: "📦",
    title: "Inventory Management",
    lossHeadline: "Every stockout costs you ₹ you'll never recover.",
    description:
      "Restaurants without live inventory lose an average of 8–15% of nightly revenue to stockouts and over-ordering. Inventory tracking pays for itself in the first week.",
    requiredPlan: "PROFESSIONAL",
    highlights: [
      "Real-time stock tracking",
      "Auto-deduction on orders",
      "Low-stock alerts before service",
      "Restock logs & history",
    ],
    urgency: "3 restaurants in your city upgraded this week.",
  },
  QR_MENU: {
    icon: "📱",
    title: "QR Digital Menu",
    lossHeadline: "Customers expect it. Restaurants without it feel outdated.",
    description:
      "Guests who can't view your menu digitally take longer to order, order less, and are less likely to return. A QR menu cuts per-table service time by up to 40%.",
    requiredPlan: "PROFESSIONAL",
    highlights: [
      "Beautiful mobile-first design",
      "Per-table QR codes",
      "Live menu updates",
      "Scan analytics",
    ],
    urgency: "Average table turn time drops 40% with digital menus.",
  },
};

const UpgradeBanner = ({ feature }) => {
  const { planLabel, planColor, PLAN_LABELS } = useFeature();
  const meta = FEATURE_META[feature] || {
    icon: "🔒",
    title: feature,
    lossHeadline: "You're missing out on this feature.",
    description: "Upgrade your plan to unlock this feature.",
    requiredPlan: "PROFESSIONAL",
    highlights: [],
    urgency: "",
  };

  const requiredLabel =
    PLAN_LABELS[meta.requiredPlan]?.label || meta.requiredPlan;
  const requiredColor = PLAN_LABELS[meta.requiredPlan]?.color || "#02ca3a";

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="upgrade-banner w-full max-w-2xl rounded-2xl overflow-hidden">
        {/* Top accent bar */}
        <div
          className="h-2 w-full"
          style={{
            background: `linear-gradient(90deg, ${requiredColor}44, ${requiredColor})`,
          }}
        />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{meta.icon}</div>
              <div>
                <h2>{meta.title}</h2>
                <p>Locked on your current plan</p>
              </div>
            </div>
            <div className="upgrade-plan-pill">
              <MdLock size={14} />
              <span>{planLabel}</span>
            </div>
          </div>

          {/* Loss framing headline */}
          <div className="upgrade-loss-headline">
            <MdTrendingDown size={20} />
            <span>{meta.lossHeadline}</span>
          </div>

          {/* Description */}
          <p className="upgrade-description">{meta.description}</p>

          {/* Social urgency */}
          {meta.urgency && (
            <p className="upgrade-urgency">💡 {meta.urgency}</p>
          )}

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {meta.highlights.map((h) => (
              <div key={h} className="upgrade-highlight">
                <span style={{ color: requiredColor }}>✓</span>
                <span>{h}</span>
              </div>
            ))}
          </div>

          {/* Plan comparison */}
          <div className="upgrade-plan-compare">
            <div className="text-center flex-1">
              <div>Current Plan</div>
              <strong style={{ color: planColor }}>{planLabel}</strong>
            </div>
            <MdArrowUpward size={24} />
            <div className="text-center flex-1">
              <div>Required Plan</div>
              <strong style={{ color: requiredColor }}>{requiredLabel}</strong>
            </div>
          </div>

          <p className="text-[var(--dash-muted)] text-sm text-center mt-4">
            A platform admin can upgrade this restaurant from Platform Admin → select restaurant → change plan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeBanner;
