import React, { useEffect } from "react";
import { motion } from "framer-motion";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  dashboardVariant = false,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 ${
        dashboardVariant ? "dashboard-modal-backdrop" : ""
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={
          dashboardVariant
            ? "dashboard-modal-panel"
            : "bg-[#1a1a1a] rounded-lg shadow-lg w-full max-w-lg mx-4"
        }
      >
        <div
          className={
            dashboardVariant
              ? "dashboard-modal-header"
              : "flex justify-between items-center px-6 py-4 border-b border-b-[#333]"
          }
        >
          <h2
            className={
              dashboardVariant
                ? "text-xl font-semibold"
                : "text-xl text-[#f5f5f5] font-semibold"
            }
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            className={
              dashboardVariant
                ? "dashboard-modal-close"
                : "text-gray-500 text-2xl hover:text-gray-800"
            }
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className={dashboardVariant ? "p-6 dashboard-modal-body" : "p-6"}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default Modal;
