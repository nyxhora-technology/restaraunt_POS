import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MdClose, MdPause, MdPlayArrow, MdOutlineReplay } from "react-icons/md";
import "../../styles/walkthrough.css";

const AUTOPLAY_INTERVAL = 4000;

const tooltipVariants = {
  initial: (placement) => {
    switch (placement) {
      case "left":
        return { opacity: 0, x: 16 };
      case "right":
        return { opacity: 0, x: -16 };
      case "top":
        return { opacity: 0, y: 16 };
      case "bottom":
      default:
        return { opacity: 0, y: -16 };
    }
  },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

function buildSteps(layout) {
  const base = [
    {
      target: ".dashboard-overview-header",
      section: "Welcome",
      title: "Welcome to Restro",
      description:
        "This is your command center. Here you'll see a live summary of today's service, revenue, and team activity.",
      placement: "bottom",
    },
    {
      target: ".dashboard-metric-grid",
      section: "Dashboard Overview",
      title: "Today's Metrics",
      description:
        "Track total earnings, orders, in-progress count, and average order value — all updated in real time.",
      placement: "bottom",
    },
    {
      target: ".dashboard-service-pulse",
      section: "Dashboard Overview",
      title: "Service Pulse",
      description:
        "A live snapshot of what needs your attention: available tables, unpaid orders, and today's completions.",
      placement: "left",
    },
    {
      target: ".dashboard-quick-actions",
      section: "Quick Actions",
      title: "Quick Actions",
      description:
        "Jump straight to common tasks — create a new order, manage tables, or open the menu. One tap, done.",
      placement: "left",
    },
  ];

  if (layout === "sidebar") {
    base.push(
      {
        target: "[data-tour='nav-dashboard']",
        section: "Navigation",
        title: "Dashboard",
        description:
          "Your home base. Daily operations, live metrics, and immediate tasks are all here.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-analytics']",
        section: "Navigation",
        title: "Analytics",
        description:
          "Dive into sales data, revenue trends, and performance insights to grow your business.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-orders']",
        section: "Navigation",
        title: "Orders",
        description:
          "Manage all incoming orders, track preparation status, and review transaction history.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-tables']",
        section: "Navigation",
        title: "Tables",
        description:
          "View table statuses in real time, manage seated guests, and assign new orders.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-menu']",
        section: "Navigation",
        title: "Menu",
        description:
          "Browse your active menu, manage categories, and toggle item availability.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-inventory']",
        section: "Navigation",
        title: "Inventory",
        description:
          "Monitor stock levels, set low-stock alerts, and keep your supply chain in check.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-qr-menu']",
        section: "Navigation",
        title: "QR Menu",
        description:
          "Generate digital menus and QR codes so guests can browse and order from their phones.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-admin-workspace']",
        section: "Navigation",
        title: "Admin Workspace",
        description:
          "Power tools for staff management, role assignments, and restaurant-wide settings.",
        placement: "right",
      },
      {
        target: "[data-tour='nav-settings']",
        section: "Navigation",
        title: "Settings",
        description:
          "Configure your restaurant profile, billing, security, and global preferences.",
        placement: "right",
      },
      {
        target: ".dashboard-create-order",
        section: "Navigation",
        title: "Create Order",
        description:
          "Punch in a new order instantly — accessible from anywhere in the app.",
        placement: "right",
      }
    );
  } else {
    base.push({
      target: ".tour-bottom-nav",
      section: "Navigation",
      title: "Bottom Navigation",
      description:
        "Tap to quickly access Orders, Tables, and More — including Analytics and Settings.",
      placement: "top",
    });
  }

  return base;
}

function filterValidSteps(steps) {
  return steps.filter((step) => document.querySelector(step.target));
}

function getTargetRect(target) {
  const el = document.querySelector(target);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function calculateTooltipPosition(targetRect, placement, isMobile) {
  if (isMobile) {
    return {
      top: "auto",
      bottom: 0,
      left: 0,
      right: 0,
      maxWidth: "100%",
    };
  }

  const padding = 20;
  const tooltipW = 380;
  const tooltipH = 200;

  let top, left;

  switch (placement) {
    case "right":
      top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
      left = targetRect.right + padding;
      break;
    case "left":
      top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
      left = targetRect.left - tooltipW - padding;
      break;
    case "top":
      top = targetRect.top - tooltipH - padding;
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
      break;
    case "bottom":
    default:
      top = targetRect.bottom + padding;
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
      break;
  }

  // Clamp to viewport
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  if (left < padding) left = padding;
  if (left + tooltipW > viewW - padding) left = viewW - tooltipW - padding;
  if (top < padding) top = padding;
  if (top + tooltipH > viewH - padding) top = viewH - tooltipH - padding;

  return { top, left, maxWidth: tooltipW };
}

function scrollToTarget(target) {
  const el = document.querySelector(target);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}

export default function Walkthrough({ theme = "light", layout = "sidebar" }) {
  const allSteps = useMemo(() => buildSteps(layout), [layout]);
  const [steps, setSteps] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hasInteracted, setHasInteracted] = useState(false);
  const autoplayRef = useRef(null);
  const tooltipRef = useRef(null);

  // Detect mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter valid steps and start
  const startWalkthrough = useCallback(() => {
    const valid = filterValidSteps(allSteps);
    if (valid.length === 0) return;

    setSteps(valid);
    setCurrentIdx(0);
    setIsRunning(true);
    setIsAutoplay(true);
    setHasInteracted(false);
  }, [allSteps]);

  // Auto-start if not completed
  useEffect(() => {
    const hasCompleted = localStorage.getItem("walkthroughCompleted");
    if (!hasCompleted) {
      const timer = setTimeout(startWalkthrough, 1500);
      return () => clearTimeout(timer);
    }
  }, [startWalkthrough]);

  // Listen for replay event from Home.jsx
  useEffect(() => {
    const handleReplay = () => {
      localStorage.removeItem("walkthroughCompleted");
      startWalkthrough();
    };
    window.addEventListener("walkthrough:replay", handleReplay);
    return () => window.removeEventListener("walkthrough:replay", handleReplay);
  }, [startWalkthrough]);

  // Update spotlight + tooltip position when step changes
  useEffect(() => {
    if (!isRunning || steps.length === 0) return;

    const step = steps[currentIdx];
    if (!step) return;

    // Scroll into view
    scrollToTarget(step.target);

    // Small delay to let scroll finish before measuring
    const measureTimer = setTimeout(() => {
      const rect = getTargetRect(step.target);
      if (rect) {
        setSpotlightRect(rect);
        const pos = calculateTooltipPosition(rect, step.placement, isMobile);
        setTooltipStyle(pos);
      }
    }, 350);

    return () => clearTimeout(measureTimer);
  }, [currentIdx, isRunning, steps, isMobile]);

  // Recalculate on scroll/resize
  useEffect(() => {
    if (!isRunning || steps.length === 0) return;

    const recalc = () => {
      const step = steps[currentIdx];
      if (!step) return;
      const rect = getTargetRect(step.target);
      if (rect) {
        setSpotlightRect(rect);
        const pos = calculateTooltipPosition(rect, step.placement, isMobile);
        setTooltipStyle(pos);
      }
    };

    window.addEventListener("scroll", recalc, { passive: true });
    window.addEventListener("resize", recalc, { passive: true });
    return () => {
      window.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
    };
  }, [currentIdx, isRunning, steps, isMobile]);

  // Autoplay
  useEffect(() => {
    if (!isRunning || !isAutoplay || hasInteracted) {
      clearInterval(autoplayRef.current);
      return;
    }

    autoplayRef.current = setInterval(() => {
      setCurrentIdx((prev) => {
        if (prev >= steps.length - 1) {
          setIsAutoplay(false);
          clearInterval(autoplayRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, AUTOPLAY_INTERVAL);

    return () => clearInterval(autoplayRef.current);
  }, [isRunning, isAutoplay, hasInteracted, steps.length]);

  const finishWalkthrough = useCallback(() => {
    setIsRunning(false);
    setIsAutoplay(false);
    setSpotlightRect(null);
    localStorage.setItem("walkthroughCompleted", "true");
  }, []);

  const goNext = useCallback(() => {
    setHasInteracted(true);
    setIsAutoplay(false);
    if (currentIdx < steps.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      finishWalkthrough();
    }
  }, [currentIdx, steps.length, finishWalkthrough]);

  const goPrev = useCallback(() => {
    setHasInteracted(true);
    setIsAutoplay(false);
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  }, [currentIdx]);

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay((prev) => !prev);
    setHasInteracted(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isRunning) return;

    const handleKey = (e) => {
      if (e.key === "Escape") {
        finishWalkthrough();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isRunning, currentIdx, steps.length, finishWalkthrough, goNext, goPrev]);

  // Build clip-path polygon that covers everything EXCEPT the spotlight hole
  const clipPath = useMemo(() => {
    if (!spotlightRect) return "none";
    const pad = 8;
    const t = spotlightRect.top - pad;
    const r = spotlightRect.left + spotlightRect.width + pad;
    const b = spotlightRect.top + spotlightRect.height + pad;
    const l = spotlightRect.left - pad;
    // Clockwise outer rectangle, then counter-clockwise inner hole
    return `polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%,
      0% 0%,
      ${l}px ${t}px, ${l}px ${b}px, ${r}px ${b}px, ${r}px ${t}px, ${l}px ${t}px
    )`;
  }, [spotlightRect]);

  if (!isRunning || steps.length === 0) return null;

  const step = steps[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === steps.length - 1;
  const displayNum = String(currentIdx + 1).padStart(2, "0");

  const arrowClass =
    !isMobile && step.placement
      ? `walkthrough-arrow arrow-${step.placement}`
      : "";

  return createPortal(
    <>
      {/* Backdrop with transparent hole around target */}
      {clipPath !== "none" ? (
        <motion.div
          className="walkthrough-backdrop"
          style={{ clipPath, WebkitClipPath: clipPath }}
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={finishWalkthrough}
        />
      ) : (
        <motion.div
          className="walkthrough-backdrop"
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={finishWalkthrough}
        />
      )}

      {/* Spotlight ring — transparent, just the border glow */}
      {spotlightRect && (
        <motion.div
          className="walkthrough-spotlight"
          animate={{
            top: spotlightRect.top - 6,
            left: spotlightRect.left - 6,
            width: spotlightRect.width + 12,
            height: spotlightRect.height + 12,
          }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        />
      )}

      {/* Skip button */}
      <motion.button
        className="walkthrough-skip"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={finishWalkthrough}
      >
        Skip tour
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          ref={tooltipRef}
          className={`walkthrough-tooltip theme-${theme} placement-${step.placement}`}
          style={tooltipStyle}
          variants={tooltipVariants}
          custom={step.placement}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {arrowClass && <div className={arrowClass} />}

          {/* Header */}
          <div className="walkthrough-header">
            <div className="walkthrough-step-info">
              <div className="walkthrough-step-number">{displayNum}</div>
              <div className="walkthrough-step-meta">
                <span className="walkthrough-section-badge">
                  {step.section}
                </span>
                <h3 className="walkthrough-step-title">{step.title}</h3>
              </div>
            </div>
            <button
              className="walkthrough-close-btn"
              onClick={finishWalkthrough}
              aria-label="Close tour"
            >
              <MdClose />
            </button>
          </div>

          {/* Body */}
          <div className="walkthrough-body">
            <p className="walkthrough-description">{step.description}</p>
          </div>

          {/* Footer */}
          <div className="walkthrough-footer">
            <div className="walkthrough-progress">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`walkthrough-dot ${
                    i === currentIdx
                      ? "active"
                      : i < currentIdx
                      ? "visited"
                      : ""
                  }`}
                />
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Autoplay indicator (only on first run, before interaction) */}
              {!hasInteracted && isAutoplay && (
                <div className="walkthrough-autoplay-indicator">
                  <button
                    className="walkthrough-autoplay-pause"
                    onClick={toggleAutoplay}
                    aria-label={isAutoplay ? "Pause autoplay" : "Resume autoplay"}
                  >
                    {isAutoplay ? <MdPause /> : <MdPlayArrow />}
                  </button>
                  <span>Auto</span>
                </div>
              )}

              <div className="walkthrough-nav">
                {!isFirst && (
                  <button className="walkthrough-btn walkthrough-btn-back" onClick={goPrev}>
                    Back
                  </button>
                )}
                <button
                  className={`walkthrough-btn walkthrough-btn-next ${
                    isLast ? "finish" : ""
                  }`}
                  onClick={goNext}
                >
                  {isLast ? "Get Started" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body
  );
}

export function ReplayTourButton() {
  const handleReplay = () => {
    localStorage.removeItem("walkthroughCompleted");
    window.dispatchEvent(new CustomEvent("walkthrough:replay"));
  };

  return (
    <button className="dashboard-replay-tour" onClick={handleReplay}>
      <MdOutlineReplay />
      <span>Tour</span>
    </button>
  );
}
