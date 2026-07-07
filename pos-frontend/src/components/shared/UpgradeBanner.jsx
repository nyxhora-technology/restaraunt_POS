import React from "react";
import { MdArrowUpward, MdLock, MdOutlineAutoGraph } from "react-icons/md";
import useFeature from "../../hooks/useFeature";

const FEATURE_META = {
  INVENTORY: {
    icon: "📦",
    title: "Inventory Management",
    headline: "Control stock from purchase to plate.",
    description:
      "Track live quantities, connect ingredients to menu sales, and surface low-stock items before the next service.",
    requiredPlan: "PROFESSIONAL",
    highlights: [
      "Real-time stock tracking",
      "Automatic order deductions",
      "Low-stock alerts",
      "Restock and audit history",
    ],
  },
  QR_MENU: {
    icon: "📱",
    title: "QR Digital Menu",
    headline: "Publish a polished menu guests can open instantly.",
    description:
      "Create table-specific QR codes, update availability live, and keep the guest experience aligned with your restaurant.",
    requiredPlan: "PROFESSIONAL",
    highlights: [
      "Mobile-first guest menu",
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
    headline: "This workspace is available on a higher plan.",
    description: "Upgrade the restaurant plan to unlock this capability.",
    requiredPlan: "PROFESSIONAL",
    highlights: [],
  };
  const requiredLabel =
    PLAN_LABELS[meta.requiredPlan]?.label || meta.requiredPlan;
  const requiredColor = PLAN_LABELS[meta.requiredPlan]?.color || "#02ca3a";

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <div className="upgrade-banner w-full max-w-2xl overflow-hidden rounded-2xl">
        <div
          className="h-2 w-full"
          style={{
            background: `linear-gradient(90deg, ${requiredColor}44, ${requiredColor})`,
          }}
        />
        <div className="p-8">
          <div className="mb-5 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{meta.icon}</div>
              <div><h2>{meta.title}</h2><p>Locked on your current plan</p></div>
            </div>
            <div className="upgrade-plan-pill">
              <MdLock size={14} /><span>{planLabel}</span>
            </div>
          </div>

          <div className="upgrade-loss-headline">
            <MdOutlineAutoGraph size={20} /><span>{meta.headline}</span>
          </div>
          <p className="upgrade-description">{meta.description}</p>

          <div className="mb-8 grid grid-cols-2 gap-3">
            {meta.highlights.map((highlight) => (
              <div key={highlight} className="upgrade-highlight">
                <span style={{ color: requiredColor }}>✓</span>
                <span>{highlight}</span>
              </div>
            ))}
          </div>

          <div className="upgrade-plan-compare">
            <div className="flex-1 text-center">
              <div>Current Plan</div>
              <strong style={{ color: planColor }}>{planLabel}</strong>
            </div>
            <MdArrowUpward size={24} />
            <div className="flex-1 text-center">
              <div>Required Plan</div>
              <strong style={{ color: requiredColor }}>{requiredLabel}</strong>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-[var(--dash-muted)]">
            An owner can review plan access in Settings. Platform administrators
            control plan assignment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeBanner;
