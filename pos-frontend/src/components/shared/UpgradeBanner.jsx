import React from "react";
import { MdLock, MdArrowUpward } from "react-icons/md";
import useFeature from "../../hooks/useFeature";

const FEATURE_META = {
  INVENTORY: {
    icon: "📦",
    title: "Inventory Management",
    description:
      "Track stock levels, set low-stock alerts, and automatically deduct inventory when orders are served. Never run out of supplies unexpectedly.",
    requiredPlan: "PROFESSIONAL",
    highlights: [
      "Real-time stock tracking",
      "Auto-deduction on orders",
      "Low-stock notifications",
      "Restock logs & history",
    ],
  },
  QR_MENU: {
    icon: "📱",
    title: "QR Digital Menu",
    description:
      "Give guests a beautiful, mobile-first digital menu by scanning a QR code at their table. No app download required.",
    requiredPlan: "PROFESSIONAL",
    highlights: [
      "Beautiful mobile-first design",
      "Per-table QR codes",
      "Live menu updates",
      "Scan analytics",
    ],
  },
};

const UpgradeBanner = ({ feature }) => {
  const { planLabel, planColor, PLAN_LABELS } = useFeature();
  const meta = FEATURE_META[feature] || {
    icon: "🔒",
    title: feature,
    description: "Upgrade your plan to unlock this feature.",
    requiredPlan: "PROFESSIONAL",
    highlights: [],
  };

  const requiredLabel =
    PLAN_LABELS[meta.requiredPlan]?.label || meta.requiredPlan;
  const requiredColor = PLAN_LABELS[meta.requiredPlan]?.color || "#02ca3a";

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="upgrade-banner w-full max-w-2xl rounded-2xl overflow-hidden">
        {/* Header gradient */}
        <div
          className="h-2 w-full"
          style={{
            background: `linear-gradient(90deg, ${requiredColor}44, ${requiredColor})`,
          }}
        />

        <div className="p-8">
          {/* Lock icon + current plan badge */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{meta.icon}</div>
              <div>
                <h2>{meta.title}</h2>
                <p>Premium Feature</p>
              </div>
            </div>
            <div className="upgrade-plan-pill">
              <MdLock size={14} />
              <span>Locked on {planLabel}</span>
            </div>
          </div>

          {/* Description */}
          <p className="upgrade-description">{meta.description}</p>

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

          <p className="text-[var(--dash-muted)] text-sm text-center">
            Upgrade path: a platform admin opens Platform Admin, selects this
            restaurant, and changes the plan to {requiredLabel}. Development
            mode can unlock all features without changing the saved plan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeBanner;
