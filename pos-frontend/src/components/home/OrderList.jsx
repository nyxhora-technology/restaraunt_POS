import React from "react";
import { FaCheckDouble, FaLongArrowAltRight } from "react-icons/fa";
import { FaCircle } from "react-icons/fa";
import { getAvatarName } from "../../utils/index";
import { getOrderTableLabel } from "../tables/tableOptions";

const OrderList = ({ order, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-5 mb-3 w-full text-left rounded-lg hover:bg-[#222] p-1 transition-colors"
    >
      <span className="bg-[#f6b100] p-3 text-xl font-bold rounded-lg text-[#1a1a1a]">
        {getAvatarName(order.customerName)}
      </span>
      <div className="flex items-center justify-between w-[100%]">
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-[#f5f5f5] text-lg font-semibold tracking-wide">
            {order.customerName}
          </h1>
          <p className="text-[#ababab] text-sm">{order.items.length} Items</p>
        </div>

        <h1 className="text-[#f6b100] font-semibold border border-[#f6b100] rounded-lg p-1">
          {order.orderType === "TAKEAWAY" ? (
            "Takeaway"
          ) : (
            <>
              Table{" "}
              <FaLongArrowAltRight className="text-[#ababab] ml-2 inline" />{" "}
              {getOrderTableLabel(order, "—")}
            </>
          )}
        </h1>

        <div className="flex flex-col items-end gap-2">
          {order.orderStatus === "READY" ? (
            <>
              <p className="text-green-600 bg-[#2e4a40] px-2 py-1 rounded-lg">
                <FaCheckDouble className="inline mr-2" /> Ready
              </p>
            </>
          ) : (
            <>
              <p className="text-yellow-600 bg-[#4a452e] px-2 py-1 rounded-lg">
                <FaCircle className="inline mr-2" />{" "}
                {order.orderStatus.replaceAll("_", " ")}
              </p>
            </>
          )}
        </div>
      </div>
    </button>
  );
};

export default OrderList;
