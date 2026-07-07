import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { removeCustomer, setCustomer } from "../../redux/slices/customerSlice";
import { removeAllItems } from "../../redux/slices/cartSlice";
import Modal from "./Modal";
import { MdShoppingBag, MdTableRestaurant, MdArrowForward } from "react-icons/md";

// ── Step 1: Dine In / Takeaway choice ───────────────────────────────────────
const OrderTypeStep = ({ value, onSelect }) => (
  <div className="order-type-step">
    <p className="order-type-label">What type of order?</p>
    <div className="order-type-choices">
      {[
        {
          id: "DINE_IN",
          label: "Dine In",
          sub: "Seat guests at a table",
          Icon: MdTableRestaurant,
        },
        {
          id: "TAKEAWAY",
          label: "Takeaway",
          sub: "Pack order for collection",
          Icon: MdShoppingBag,
        },
      ].map(({ id, label, sub, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`order-type-card ${value === id ? "is-active" : ""}`}
        >
          <span className="order-type-card-icon">
            <Icon />
          </span>
          <strong>{label}</strong>
          <small>{sub}</small>
          {value === id && <span className="order-type-check">✓</span>}
        </button>
      ))}
    </div>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
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
  // For DETAILS_FIRST: track which step we are on
  const [step, setStep] = useState(0); // 0 = type choice, 1 = customer details
  const nameRef = useRef(null);

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
    setStep(0);
  }, [defaultGuestCount]);

  const customerData = useSelector((state) => state.customer);
  const location = useLocation();

  useEffect(() => {
    if (!isOpen) return;
    if (location.state?.retainCart || location.pathname === "/app/menu") {
      setGuestCount(customerData.guests || defaultGuestCount);
      setName(customerData.customerName || "");
      setPhone(customerData.customerPhone?.replace("+91", "") || "");
      setOrderType(customerData.orderType || "DINE_IN");
      setStep(isTableFirst ? 0 : 1); // skip type step if retaining
      return;
    }
    resetForm();
    dispatch(removeCustomer());
    dispatch(removeAllItems());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, location.state?.retainCart, location.pathname, defaultGuestCount]);

  // Auto-focus name field when entering step 1
  useEffect(() => {
    if (isOpen && step === 1) {
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [isOpen, step]);

  const handleTypeSelect = (type) => {
    setOrderType(type);
    // Small delay for micro-feedback, then advance
    setTimeout(() => setStep(1), 180);
  };

  const handleCancel = () => {
    if (!location.state?.retainCart && location.pathname !== "/app/menu") {
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
        `Selected tables have ${selectedCapacity} seats. Add another table or reduce guests.`,
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
      navigate("/app/menu", { state: { orderFlow: "ACTIVE" } });
      return;
    }
    navigate(orderType === "DINE_IN" ? "/app/tables" : "/app/menu", {
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

  // TABLE_FIRST: unchanged single-step flow
  if (isTableFirst) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        title="Customer details"
        dashboardVariant={dashboardVariant}
      >
        <div className="dashboard-selected-table-summary mb-5">
          <span>Selected table{initialTables.length === 1 ? "" : "s"}</span>
          <strong>{initialTables.map((t) => t.label).join(" + ")}</strong>
          <small>{selectedCapacity} seats total</small>
        </div>

        <label className={labelClass}>Customer Name</label>
        <div className={fieldClass}>
          <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="Customer name" className={inputClass} autoFocus />
        </div>

        <label className={`${labelClass} mt-4`}>Customer Phone</label>
        <div className={fieldClass}>
          <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className={dashboardVariant ? "bg-transparent text-[var(--dash-text)] outline-none border-none pr-1 mr-2 border-r border-[var(--dash-border)] cursor-pointer" : "bg-transparent text-white outline-none border-none pr-1 mr-2 border-r border-[#333] cursor-pointer"}>
            <option value="+91">🇮🇳 +91</option>
            <option value="+1">🇺🇸 +1</option>
            <option value="+44">🇬🇧 +44</option>
            <option value="+61">🇦🇺 +61</option>
            <option value="+971">🇦🇪 +971</option>
          </select>
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} type="tel" placeholder="9999999999" className={inputClass} />
        </div>

        <label className={`${labelClass} mt-4`}>Guests</label>
        <div className={dashboardVariant ? "dashboard-guest-picker" : "flex items-center justify-between bg-[#1f1f1f] px-4 py-3 rounded-lg"}>
          <button type="button" onClick={() => setGuestCount((c) => Math.max(1, c - 1))} aria-label="Remove guest">&minus;</button>
          <label className="flex items-center gap-2">
            <input type="number" min="1" max={maximumGuestCount} value={guestCount} onChange={(e) => setGuestCount(Math.min(maximumGuestCount, Math.max(1, Number(e.target.value) || 1)))} className="w-16 bg-transparent text-center font-semibold outline-none" aria-label="Guest count" />
            <span>{guestCount === 1 ? "Person" : "People"}</span>
          </label>
          <button type="button" onClick={() => setGuestCount((c) => Math.min(maximumGuestCount, c + 1))} aria-label="Add guest">&#43;</button>
        </div>

        <button type="button" onClick={handleCreateOrder} className={dashboardVariant ? "dashboard-primary-button mt-7 w-full" : "w-full bg-[#F6B100] text-[#f5f5f5] rounded-lg py-3 mt-8 hover:bg-yellow-700"}>
          Continue to menu <MdArrowForward className="inline ml-1" />
        </button>
      </Modal>
    );
  }

  // DETAILS_FIRST: 2-step flow (Progressive Disclosure)
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={step === 0 ? "New Order" : orderType === "DINE_IN" ? "Dine In — Customer" : "Takeaway — Customer"}
      dashboardVariant={dashboardVariant}
    >
      {step === 0 ? (
        /* ── Step 1: Order type (large tap targets, auto-advance) ── */
        <OrderTypeStep value={orderType} onSelect={handleTypeSelect} />
      ) : (
        /* ── Step 2: Customer details ── */
        <>
          <label className={labelClass}>Customer Name</label>
          <div className={fieldClass}>
            <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="Enter customer name" className={inputClass} />
          </div>

          <label className={`${labelClass} mt-4`}>Customer Phone</label>
          <div className={fieldClass}>
            <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className={dashboardVariant ? "bg-transparent text-[var(--dash-text)] outline-none border-none pr-1 mr-2 border-r border-[var(--dash-border)] cursor-pointer" : "bg-transparent text-white outline-none border-none pr-1 mr-2 border-r border-[#333] cursor-pointer"}>
              <option value="+91">🇮🇳 +91</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+61">🇦🇺 +61</option>
              <option value="+971">🇦🇪 +971</option>
            </select>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} type="tel" placeholder="9999999999" className={inputClass} />
          </div>

          <label className={`${labelClass} mt-4`}>Guests</label>
          <div className={dashboardVariant ? "dashboard-guest-picker" : "flex items-center justify-between bg-[#1f1f1f] px-4 py-3 rounded-lg"}>
            <button type="button" onClick={() => setGuestCount((c) => Math.max(1, c - 1))} aria-label="Remove guest">&minus;</button>
            <label className="flex items-center gap-2">
              <input type="number" min="1" max={maximumGuestCount} value={guestCount} onChange={(e) => setGuestCount(Math.min(maximumGuestCount, Math.max(1, Number(e.target.value) || 1)))} className="w-16 bg-transparent text-center font-semibold outline-none" aria-label="Guest count" />
              <span>{guestCount === 1 ? "Person" : "People"}</span>
            </label>
            <button type="button" onClick={() => setGuestCount((c) => Math.min(maximumGuestCount, c + 1))} aria-label="Add guest">&#43;</button>
          </div>

          <div className="flex gap-3 mt-7">
            <button type="button" onClick={() => setStep(0)} className={dashboardVariant ? "dashboard-secondary-button flex-1" : "flex-1 border border-[#444] text-[#aaa] rounded-lg py-3"}>
              ← Back
            </button>
            <button type="button" onClick={handleCreateOrder} className={dashboardVariant ? "dashboard-primary-button flex-1" : "flex-1 bg-[#F6B100] text-[#f5f5f5] rounded-lg py-3 hover:bg-yellow-700"}>
              {orderType === "DINE_IN" ? "Choose table →" : "Start order →"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default CreateOrderModal;
