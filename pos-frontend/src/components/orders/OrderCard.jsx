import React from "react";
import {
  MdArrowForward,
  MdOutlineReceiptLong,
  MdShoppingBag,
  MdTableRestaurant,
} from "react-icons/md";
import { formatDateAndTime, getAvatarName } from "../../utils";
import useCurrency from "../../hooks/useCurrency";
import useRoleDashboard from "../../hooks/useRoleDashboard";
import { getOrderTableLabel } from "../tables/tableOptions";

const statusLabels = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const statusTones = {
  PENDING: "is-pending",
  ACCEPTED: "is-progress",
  PREPARING: "is-progress",
  READY: "is-ready",
  SERVED: "is-served",
  COMPLETED: "is-completed",
  REJECTED: "is-danger",
  CANCELLED: "is-danger",
};

const OrderCard = ({ order, onClick }) => {
  const { canViewFinance } = useRoleDashboard();
  const currency = useCurrency();
  const itemCount = (order.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const customerName = order.customerName || "Guest";
  const isTakeaway = order.orderType === "TAKEAWAY";

  return (
    <button
      type="button"
      onClick={onClick}
      className="orders-workspace-card"
      aria-label={`Open order ${order.orderNo || order.id}`}
    >
      <header>
        <div className="orders-workspace-order-id">
          <span>
            <MdOutlineReceiptLong />
          </span>
          <div>
            <strong>Order #{order.orderNo || "—"}</strong>
            <small>{formatDateAndTime(order.createdAt)}</small>
          </div>
        </div>
        <span
          className={`orders-workspace-status ${
            statusTones[order.orderStatus] || "is-pending"
          }`}
        >
          <i />
          {statusLabels[order.orderStatus] ||
            order.orderStatus?.replaceAll("_", " ") ||
            "Unknown"}
        </span>
      </header>

      <div className="orders-workspace-customer">
        <span className="orders-workspace-avatar">
          {getAvatarName(customerName)}
        </span>
        <div>
          <strong>{customerName}</strong>
          <small>{order.customerPhone || "No phone added"}</small>
        </div>
      </div>

      <div className="orders-workspace-meta">
        <span>
          {isTakeaway ? <MdShoppingBag /> : <MdTableRestaurant />}
          <small>{isTakeaway ? "Order type" : "Assigned table"}</small>
          <strong>
            {isTakeaway ? "Takeaway" : getOrderTableLabel(order, "Unassigned")}
          </strong>
        </span>
        <span>
          <MdOutlineReceiptLong />
          <small>Order size</small>
          <strong>
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </strong>
        </span>
      </div>

      <footer>
        {canViewFinance ? (
          <div>
            <small>Total</small>
            <strong>
              {currency.symbol}
              {currency.format(order.totalWithTax)}
            </strong>
            <span
              className={`orders-workspace-payment ${
                order.paymentStatus === "PAID" ? "is-paid" : "is-unpaid"
              }`}
            >
              {order.paymentStatus === "PAID" ? "Paid" : "Payment due"}
            </span>
          </div>
        ) : (
          <div>
            <small>Order</small>
            <strong>View details</strong>
          </div>
        )}
        <span className="orders-workspace-open">
          Open <MdArrowForward />
        </span>
      </footer>
    </button>
  );
};

export default OrderCard;
