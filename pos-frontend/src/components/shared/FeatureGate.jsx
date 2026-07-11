import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useFeature from "../../hooks/useFeature";
import { MdLockOutline, MdArrowForward, MdRocketLaunch } from "react-icons/md";
import UpgradeModal from "./UpgradeModal";

/**
 * FeatureGate — wraps any feature that requires a paid plan.
 *
 * Usage:
 *   <FeatureGate feature="INVENTORY" label="Inventory tracking">
 *     <InventoryComponent />
 *   </FeatureGate>
 *
 * When the user lacks the feature, renders a blurred preview overlay
 * with a contextual upgrade CTA instead of the children.
 *
 * Psychology: Shows the shape of what they're missing (Reciprocity)
 * before locking it — never hides entirely (Loss Aversion).
 */
const FeatureGate = ({
  feature,
  label = "This feature",
  description,
  children,
  previewContent = null,
  className = "",
}) => {
  const { hasFeature, planLabel } = useFeature();
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return (
    <div className={`feature-gate-wrapper ${className}`}>
      {/* Blurred preview of the locked content */}
      {previewContent && (
        <div className="feature-gate-preview" aria-hidden="true">
          {previewContent}
        </div>
      )}

      {/* Lock overlay */}
      <div className="feature-gate-overlay">
        <div className="feature-gate-card">
          <span className="feature-gate-lock-icon">
            <MdLockOutline />
          </span>
          <div className="feature-gate-badge">Professional</div>
          <h3 className="feature-gate-title">{label}</h3>
          <p className="feature-gate-description">
            {description ||
              `${label} is available on the Professional plan. You're currently on ${planLabel}.`}
          </p>
          <button
            type="button"
            className="feature-gate-cta"
            onClick={() => setModalOpen(true)}
          >
            <MdRocketLaunch /> Upgrade to unlock <MdArrowForward />
          </button>
          <p className="feature-gate-hint">~₹83/day · Cancel anytime</p>
        </div>
      </div>

      {modalOpen && (
        <UpgradeModal onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
};

export default FeatureGate;
