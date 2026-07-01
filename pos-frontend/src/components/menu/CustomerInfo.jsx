import React from "react";
import { useSelector } from "react-redux";
import { formatDate, getAvatarName } from "../../utils";

const CustomerInfo = () => {
  const dateTime = new Date();
  const customerData = useSelector((state) => state.customer);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col items-start">
        <h1 className="text-md font-semibold tracking-wide text-[var(--dash-text)]">
          {customerData.customerName || "Customer Name"}
        </h1>
        <p className="mt-1 text-xs font-medium text-[var(--dash-muted)]">
          #{customerData.orderId || "N/A"} / Dine in
        </p>
        <p className="mt-2 text-xs font-medium text-[var(--dash-muted)]">
          {formatDate(dateTime)}
        </p>
      </div>
      <button className="rounded-lg bg-amber-400 p-3 text-xl font-bold text-slate-950">
        {getAvatarName(customerData.customerName) || "CN"}
      </button>
    </div>
  );
};

export default CustomerInfo;
