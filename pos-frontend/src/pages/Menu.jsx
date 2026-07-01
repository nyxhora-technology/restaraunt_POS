import React, { useEffect } from "react";
import BackButton from "../components/shared/BackButton";
import { MdRestaurantMenu } from "react-icons/md";
import MenuContainer from "../components/menu/MenuContainer";
import CustomerInfo from "../components/menu/CustomerInfo";
import CartInfo from "../components/menu/CartInfo";
import Bill from "../components/menu/Bill";
import { useSelector } from "react-redux";

const Menu = () => {
  useEffect(() => {
    document.title = "POS | Menu";
  }, []);

  const customerData = useSelector((state) => state.customer);

  return (
    <section className="menu-workspace">
      <div className="menu-workspace-main">
        <div className="menu-workspace-header">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-2xl font-bold tracking-wide text-[var(--dash-text)]">
              Menu
            </h1>
          </div>
          <div className="flex items-center justify-around gap-4">
            <div className="flex items-center gap-3 cursor-pointer">
              <MdRestaurantMenu className="text-4xl text-[var(--dash-muted)]" />
              <div className="flex flex-col items-start">
                <h1 className="text-md font-semibold tracking-wide text-[var(--dash-text)]">
                  {customerData.customerName || "Customer Name"}
                </h1>
                <p className="text-xs font-medium text-[var(--dash-muted)]">
                  {customerData.orderType === "TAKEAWAY"
                    ? "Takeaway"
                    : `Tables: ${
                        customerData.tables?.length
                          ? customerData.tables
                              .map(
                                (table) =>
                                  table.label || table.tableNo || "N/A",
                              )
                              .join(" + ")
                          : customerData.table?.label ||
                            customerData.table?.tableNo ||
                            "N/A"
                      }`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <MenuContainer />
      </div>
      <div className="menu-order-panel">
        <CustomerInfo />
        <hr className="border-[var(--dash-border)]" />
        <CartInfo />
        <hr className="border-[var(--dash-border)]" />
        <Bill />
      </div>
    </section>
  );
};

export default Menu;
