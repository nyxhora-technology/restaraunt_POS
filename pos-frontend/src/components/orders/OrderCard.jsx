import React from "react";
import { FaCheckDouble, FaCircle, FaLongArrowAltRight } from "react-icons/fa";
import { formatDateAndTime, getAvatarName } from "../../utils/index";
import useRoleDashboard from "../../hooks/useRoleDashboard";
import { getOrderTableLabel } from "../tables/tableOptions";

const OrderCard = ({ order, onClick }) => {
  const { canViewFinance } = useRoleDashboard();

  return (
    <button
      type="button"
      onClick={onClick}
      className="dashboard-order-card w-[500px] p-4 rounded-lg mb-4 cursor-pointer text-left"
    >
      <div className="flex items-center gap-5">
        <span className="bg-[var(--dash-primary)] text-white p-3 text-xl font-bold rounded-lg">
          {getAvatarName(order.customerName)}
        </span>
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col items-start gap-1">
            <h1 className="text-[var(--dash-text)] text-lg font-semibold tracking-wide">
              {order.customerName}
            </h1>
            <p className="text-[var(--dash-muted)] text-sm">
              #{order.orderNo} · {order.customerPhone || "No phone"}
            </p>
            <p className="text-[var(--dash-muted)] text-sm">
              {order.orderType === "TAKEAWAY" ? (
                "Takeaway"
              ) : (
                <>
                  Table
                  <FaLongArrowAltRight className="text-[var(--dash-muted)] mx-2 inline" />
                  {getOrderTableLabel(order, "—")}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {order.orderStatus === "READY" ? (
              <>
                <p className="text-green-600 bg-[#2e4a40] px-2 py-1 rounded-lg">
                  <FaCheckDouble className="inline mr-2" /> Ready
                </p>
                <p className="text-[var(--dash-muted)] text-sm">
                  <FaCircle className="inline mr-2 text-green-600" />
                  Ready to serve
                </p>
              </>
            ) : (
              <>
                <p className="text-yellow-600 bg-[#4a452e] px-2 py-1 rounded-lg">
                  <FaCircle className="inline mr-2" />
                  {order.orderStatus.replaceAll("_", " ")}
                </p>
                <p className="text-[var(--dash-muted)] text-sm">
                  <FaCircle className="inline mr-2 text-yellow-600" />
                  Order in progress
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4 text-[var(--dash-muted)]">
        <p>{formatDateAndTime(order.createdAt)}</p>
        <p>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</p>
      </div>
      {canViewFinance && (
        <>
          <hr className="w-full mt-4 border-t border-[var(--dash-border)]" />
          <div className="flex items-center justify-between mt-4">
            <h1 className="text-[var(--dash-text)] text-lg font-semibold">
              Total
            </h1>
            <div className="text-right">
              <p className="text-[var(--dash-text)] text-lg font-semibold">
                ₹{Number(order.totalWithTax).toFixed(2)}
              </p>
              <p
                className={`text-xs ${
                  order.paymentStatus === "PAID"
                    ? "text-green-400"
                    : "text-yellow-400"
                }`}
              >
                {order.paymentStatus}
              </p>
            </div>
          </div>
        </>
      )}
    </button>
  );
};

export default OrderCard;
