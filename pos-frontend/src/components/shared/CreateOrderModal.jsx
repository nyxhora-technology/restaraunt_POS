import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { removeCustomer, setCustomer } from "../../redux/slices/customerSlice";
import { removeAllItems } from "../../redux/slices/cartSlice";
import Modal from "./Modal";

const CreateOrderModal = ({
  isOpen,
  onClose,
  dashboardVariant = false,
  entryMode = "DETAILS_FIRST",
  initialTables = [],
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [guestCount, setGuestCount] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [orderType, setOrderType] = useState("DINE_IN");
  const isTableFirst = entryMode === "TABLE_FIRST";
  const selectedCapacity = initialTables.reduce(
    (sum, table) => sum + Number(table.seats || 0),
    0,
  );
  const defaultGuestCount =
    isTableFirst && initialTables.length === 1
      ? Number(initialTables[0].minSeats || 1)
      : 1;
  const maximumGuestCount = isTableFirst ? Math.max(1, selectedCapacity) : 100;

  const resetForm = useCallback(() => {
    setGuestCount(defaultGuestCount);
    setName("");
    setPhone("");
    setCountryCode("+91");
    setOrderType("DINE_IN");
  }, [defaultGuestCount]);

  const customerData = useSelector((state) => state.customer);
  const location = useLocation();

  useEffect(() => {
    if (!isOpen) return;
    if (location.state?.retainCart || location.pathname === "/menu") {
      setGuestCount(customerData.guests || defaultGuestCount);
      setName(customerData.customerName || "");
      setPhone(customerData.customerPhone?.replace("+91", "") || "");
      setOrderType(customerData.orderType || "DINE_IN");
      return;
    }
    resetForm();
    dispatch(removeCustomer());
    dispatch(removeAllItems());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, location.state?.retainCart, location.pathname, defaultGuestCount]);

  const handleCancel = () => {
    if (!location.state?.retainCart && location.pathname !== "/menu") {
      resetForm();
      dispatch(removeCustomer());
      dispatch(removeAllItems());
    }
    onClose();
  };

  const handleCreateOrder = () => {
    if (!name.trim() || !phone.trim() || guestCount < 1) {
      enqueueSnackbar("Enter customer name, phone and guest count", {
        variant: "warning",
      });
      return;
    }
    if (isTableFirst && guestCount > selectedCapacity) {
      enqueueSnackbar(
        `Selected tables have ${selectedCapacity} seats. Add another compatible table or reduce the guest count.`,
        { variant: "warning" },
      );
      return;
    }
    if (
      isTableFirst &&
      initialTables.length === 1 &&
      guestCount < Number(initialTables[0].minSeats || 1)
    ) {
      enqueueSnackbar(
        `This table requires at least ${initialTables[0].minSeats} guests.`,
        { variant: "warning" },
      );
      return;
    }

    dispatch(
      setCustomer({
        name: name.trim(),
        phone: `${countryCode}${phone.trim()}`,
        guests: guestCount,
        orderType: isTableFirst ? "DINE_IN" : orderType,
        tables: isTableFirst ? initialTables : [],
      }),
    );
    onClose();
    if (isTableFirst) {
      navigate("/menu", { state: { orderFlow: "ACTIVE" } });
      return;
    }
    navigate(orderType === "DINE_IN" ? "/tables" : "/menu", {
      state: {
        orderFlow: orderType === "DINE_IN" ? "DETAILS_FIRST" : "ACTIVE",
      },
    });
  };

  const fieldClass = dashboardVariant
    ? "dashboard-modal-field"
    : "flex items-center rounded-lg p-3 px-4 bg-[#1f1f1f]";
  const inputClass = dashboardVariant
    ? "dashboard-modal-input"
    : "bg-transparent flex-1 text-white focus:outline-none";
  const labelClass = dashboardVariant
    ? "dashboard-modal-label"
    : "block text-[#ababab] mb-2 text-sm font-medium";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={isTableFirst ? "Customer details" : "Create Order"}
      dashboardVariant={dashboardVariant}
    >
      {isTableFirst && (
        <div className="dashboard-selected-table-summary mb-5">
          <span>Selected table{initialTables.length === 1 ? "" : "s"}</span>
          <strong>
            {initialTables.map((table) => table.label).join(" + ")}
          </strong>
          <small>{selectedCapacity} seats total</small>
        </div>
      )}

      {!isTableFirst && (
        <div className="flex gap-3 mb-5">
          {[
            ["DINE_IN", "Dine In"],
            ["TAKEAWAY", "Takeaway"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setOrderType(value)}
              className={
                dashboardVariant
                  ? `dashboard-order-type ${
                      orderType === value ? "is-active" : ""
                    }`
                  : `w-full px-4 py-3 rounded-lg font-semibold ${
                      orderType === value
                        ? "bg-[#f6b100] text-[#1f1f1f]"
                        : "bg-[#1f1f1f] text-[#ababab]"
                    }`
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <label className={labelClass}>Customer Name</label>
      <div className={fieldClass}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          type="text"
          placeholder="Enter customer name"
          className={inputClass}
          autoFocus
        />
      </div>

      <label className={`${labelClass} mt-4`}>Customer Phone</label>
      <div className={fieldClass}>
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className={
            dashboardVariant
              ? "bg-transparent text-[var(--dash-text)] outline-none border-none pr-1 mr-2 border-r border-[var(--dash-border)] cursor-pointer"
              : "bg-transparent text-white outline-none border-none pr-1 mr-2 border-r border-[#333] cursor-pointer"
          }
        >
          <option value="+91">🇮🇳 +91</option>
          <option value="+1">🇺🇸 +1</option>
          <option value="+44">🇬🇧 +44</option>
          <option value="+61">🇦🇺 +61</option>
          <option value="+971">🇦🇪 +971</option>
        </select>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
          type="tel"
          placeholder="9999999999"
          className={inputClass}
        />
      </div>

      <label className={`${labelClass} mt-4`}>Guests</label>
      <div
        className={
          dashboardVariant
            ? "dashboard-guest-picker"
            : "flex items-center justify-between bg-[#1f1f1f] px-4 py-3 rounded-lg"
        }
      >
        <button
          type="button"
          onClick={() => setGuestCount((count) => Math.max(1, count - 1))}
          aria-label="Remove guest"
        >
          &minus;
        </button>
        <label className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max={maximumGuestCount}
            value={guestCount}
            onChange={(event) =>
              setGuestCount(
                Math.min(
                  maximumGuestCount,
                  Math.max(1, Number(event.target.value) || 1),
                ),
              )
            }
            className="w-16 bg-transparent text-center font-semibold outline-none"
            aria-label="Guest count"
          />
          <span>{guestCount === 1 ? "Person" : "People"}</span>
        </label>
        <button
          type="button"
          onClick={() =>
            setGuestCount((count) => Math.min(maximumGuestCount, count + 1))
          }
          aria-label="Add guest"
        >
          &#43;
        </button>
      </div>

      <button
        type="button"
        onClick={handleCreateOrder}
        className={
          dashboardVariant
            ? "dashboard-primary-button mt-7 w-full"
            : "w-full bg-[#F6B100] text-[#f5f5f5] rounded-lg py-3 mt-8 hover:bg-yellow-700"
        }
      >
        {isTableFirst
          ? "Continue to menu"
          : orderType === "DINE_IN"
            ? "Continue to tables"
            : "Start takeaway order"}
      </button>
    </Modal>
  );
};

export default CreateOrderModal;
