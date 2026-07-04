import React, { useEffect } from "react";
import { MdCheckCircle } from "react-icons/md";

const OrderCelebration = ({ orderNo, onComplete }) => {
  useEffect(() => {
    // Dismiss after 2.5s (Peak-End Rule: short, satisfying peak)
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="order-celebration-overlay">
      {/* Confetti particles */}
      <div className="confetti-container">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`confetti-particle c-${i}`} />
        ))}
      </div>

      {/* Celebration Toast */}
      <div className="order-celebration-card">
        <div className="order-celebration-icon">
          <MdCheckCircle />
        </div>
        <div className="order-celebration-text">
          <strong>Order #{String(orderNo).padStart(4, "0")} Completed</strong>
          <span>Great job! The queue is moving.</span>
        </div>
      </div>
    </div>
  );
};

export default OrderCelebration;
