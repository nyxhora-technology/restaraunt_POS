import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { IoMdClose } from "react-icons/io";
import { MdAddShoppingCart, MdDelete, MdLockOutline, MdSearch } from "react-icons/md";
import { useSelector } from "react-redux";
import {
  createOrderRazorpay,
  getErrorMessage,
  getMenu,
  recordCashPayment,
  recordReceiptPrint,
  updateOrderItems,
  updateOrderStatus,
  verifyPaymentRazorpay,
} from "../../https";
import { formatDateAndTime } from "../../utils";
import {
  openOrderTicketWindow,
  printOrderTicket,
} from "../../utils/orderTicket";
import Invoice from "../invoice/Invoice";
import { getOrderTableLabel } from "../tables/tableOptions";
import useRole from "../../hooks/useRole";
import useFeature from "../../hooks/useFeature";

const transitions = {
  OWNER: {
    PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
    ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "CANCELLED"],
    SERVED: ["CANCELLED"],
  },
  MANAGER: {
    PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
    ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "CANCELLED"],
    SERVED: ["CANCELLED"],
  },
  KITCHEN: {
    PENDING: ["ACCEPTED", "REJECTED"],
    ACCEPTED: ["PREPARING", "READY"],
    PREPARING: ["READY"],
  },
  CASHIER: { PENDING: ["CANCELLED"], READY: ["SERVED"] },
  WAITER: { PENDING: ["CANCELLED"], READY: ["SERVED"] },
};

const itemKey = (item) => `${item.menuItemId}:${item.variantId || "base"}`;

const toOrderItemPayload = (items) =>
  items.map((item) => ({
    menuItemId: item.menuItemId,
    ...(item.variantId ? { variantId: item.variantId } : {}),
    quantity: item.quantity,
    ...(item.note ? { note: item.note } : {}),
  }));

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const OrderDetailsModal = ({ order: initialOrder, onClose }) => {
  const [order, setOrder] = useState(initialOrder);
  const [editedItems, setEditedItems] = useState(initialOrder.items);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCategoryId, setPickerCategoryId] = useState("all");
  const [pickerItemId, setPickerItemId] = useState("");
  const [pickerVariantId, setPickerVariantId] = useState("");
  const [pickerQuantity, setPickerQuantity] = useState(1);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptCopyType, setReceiptCopyType] = useState("REPRINT");
  const { role, canHandleOrders: canViewFinance, hasRole } = useRole();
  const { hasExport } = useFeature();
  const restaurant = useSelector((state) => state.user.restaurant);
  const queryClient = useQueryClient();
  const payable =
    order.paymentStatus === "UNPAID" &&
    ["READY", "SERVED"].includes(order.orderStatus);
  const canTakePayment = hasRole("OWNER", "MANAGER", "CASHIER");
  const canEditItems =
    order.paymentStatus === "UNPAID" &&
    !["COMPLETED", "CANCELLED", "REJECTED"].includes(order.orderStatus);

  const previewSubtotal = editedItems.reduce(
    (acc, item) => acc + Number(item.price || 0) * item.quantity,
    0,
  );
  const previewTax = (previewSubtotal * Number(order.taxRate || 0)) / 100;
  const previewTotal = previewSubtotal + previewTax;
  const menuQuery = useQuery({
    queryKey: ["menu"],
    queryFn: getMenu,
    enabled: canEditItems,
  });
  const menuCategories = (menuQuery.data?.data.data || [])
    .map((category) => ({
      ...category,
      menuItems: (category.menuItems || []).filter((item) => item.available),
    }))
    .filter((category) => category.menuItems.length > 0);
  const menuItems = menuCategories.flatMap((category) =>
    category.menuItems.map((item) => ({
      ...item,
      categoryName: category.name,
      categoryId: category.id,
    })),
  );
  const normalizedSearch = pickerSearch.trim().toLowerCase();
  const pickerItems = menuItems.filter((item) => {
    const matchesCategory =
      pickerCategoryId === "all" || item.categoryId === pickerCategoryId;
    const matchesSearch =
      !normalizedSearch ||
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.categoryName.toLowerCase().includes(normalizedSearch) ||
      (item.description || "").toLowerCase().includes(normalizedSearch) ||
      (item.variants || []).some((variant) =>
        variant.label.toLowerCase().includes(normalizedSearch),
      );
    return matchesCategory && matchesSearch;
  });
  const pickerItem =
    pickerItems.find((item) => item.id === pickerItemId) ||
    pickerItems[0] ||
    null;
  const pickerVariants =
    pickerItem?.variants?.filter((variant) => variant.available) || [];
  const pickerVariant =
    pickerVariants.find((variant) => variant.id === pickerVariantId) ||
    pickerVariants[0] ||
    null;
  const pickerPrice = pickerVariant
    ? Number(pickerVariant.price)
    : Number(pickerItem?.price || 0);

  const editedSignature = JSON.stringify(
    editedItems.map((item) => ({
      key: itemKey(item),
      quantity: item.quantity,
    })),
  );
  const orderSignature = JSON.stringify(
    order.items.map((item) => ({
      key: itemKey(item),
      quantity: item.quantity,
    })),
  );
  const hasChanges = editedSignature !== orderSignature;

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      if (showReceipt) {
        setShowReceipt(false);
        return;
      }
      if (isPickerOpen) {
        setIsPickerOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isPickerOpen, onClose, showReceipt]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const updateQuantity = (item, delta) => {
    if (!canEditItems) {
      enqueueSnackbar("Cannot modify items for this order status", {
        variant: "warning",
      });
      return;
    }

    const targetKey = itemKey(item);
    setEditedItems((prev) =>
      prev
        .map((current) => {
          if (itemKey(current) !== targetKey) return current;
          return { ...current, quantity: current.quantity + delta };
        })
        .filter((current) => current.quantity > 0),
    );
  };

  const removeItem = (item) => {
    if (!canEditItems) return;
    const targetKey = itemKey(item);
    setEditedItems((prev) =>
      prev.filter((current) => itemKey(current) !== targetKey),
    );
  };

  const addSelectedItem = () => {
    if (!canEditItems || !pickerItem) return;
    const variant = pickerVariants.length > 0 ? pickerVariant : null;
    if (pickerVariants.length > 0 && !variant) {
      enqueueSnackbar("Select a variant before adding this item", {
        variant: "warning",
      });
      return;
    }

    const nextItem = {
      menuItemId: pickerItem.id,
      variantId: variant?.id,
      variantLabel: variant?.label,
      name: pickerItem.name,
      price: variant ? Number(variant.price) : Number(pickerItem.price),
      quantity: pickerQuantity,
    };
    const nextKey = itemKey(nextItem);

    setEditedItems((prev) => {
      const existing = prev.find((item) => itemKey(item) === nextKey);
      if (!existing) return [...prev, nextItem];
      return prev.map((item) =>
        itemKey(item) === nextKey
          ? { ...item, quantity: Math.min(100, item.quantity + pickerQuantity) }
          : item,
      );
    });
    setPickerItemId(pickerItem.id);
    setPickerVariantId(variant?.id || "");
    setPickerQuantity(1);
    enqueueSnackbar(`${pickerItem.name} added to order`, {
      variant: "success",
    });
  };

  const itemsMutation = useMutation({
    mutationFn: updateOrderItems,
    onSuccess: ({ data }) => {
      setOrder(data.data);
      setEditedItems(data.data.items);
      refresh();
      enqueueSnackbar("Order items updated", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const statusMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: ({ data }) => {
      setOrder(data.data);
      setEditedItems(data.data.items);
      refresh();
      enqueueSnackbar("Order status updated", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const cashMutation = useMutation({
    mutationFn: recordCashPayment,
    onSuccess: ({ data }) => {
      setOrder((current) => ({
        ...current,
        orderStatus: "COMPLETED",
        paymentStatus: "PAID",
        paymentMethod: data.data.method,
        payment: data.data,
      }));
      setReceiptCopyType("ORIGINAL");
      setShowReceipt(true);
      refresh();
      enqueueSnackbar("Cash payment recorded and order completed", {
        variant: "success",
      });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const payOnline = async () => {
    try {
      if (!(await loadRazorpay())) {
        enqueueSnackbar("Razorpay checkout failed to load", {
          variant: "error",
        });
        return;
      }
      const { data } = await createOrderRazorpay(order.id);
      const razorpayOrder = data.data;
      const key = data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) {
        enqueueSnackbar("Razorpay is not configured", { variant: "warning" });
        return;
      }
      new window.Razorpay({
        key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.id,
        name: "RESTRO",
        description: `Order #${order.orderNo}`,
        prefill: { name: order.customerName, contact: order.customerPhone },
        handler: async (response) => {
          try {
            const { data: verification } = await verifyPaymentRazorpay({
              orderId: order.id,
              ...response,
            });
            setOrder((current) => ({
              ...current,
              orderStatus: "COMPLETED",
              paymentStatus: "PAID",
              paymentMethod: verification.data.method,
              payment: verification.data,
            }));
            setReceiptCopyType("ORIGINAL");
            setShowReceipt(true);
            refresh();
            enqueueSnackbar("Online payment verified and order completed", {
              variant: "success",
            });
          } catch (error) {
            enqueueSnackbar(
              getErrorMessage(error, "Payment verification failed"),
              { variant: "error" },
            );
          }
        },
        theme: { color: "#0f9fa4" },
      }).open();
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, "Unable to start payment"), {
        variant: "error",
      });
    }
  };

  return (
    <div
      className="dashboard-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={`Order ${order.orderNo} details`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="order-detail-modal dashboard-detail-modal">
        <div className="order-detail-header">
          <div>
            <h2>Order #{order.orderNo}</h2>
            <p>{formatDateAndTime(order.createdAt)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close order">
            <IoMdClose size={24} />
          </button>
        </div>

        <div className="order-detail-scroll scrollbar-hide">
          <div className="order-info-grid">
            <div>
              <p>Customer</p>
              <strong>{order.customerName}</strong>
            </div>
            <div>
              <p>Phone</p>
              <strong>{order.customerPhone}</strong>
            </div>
            <div>
              <p>Guests</p>
              <strong>{order.guests}</strong>
            </div>
            <div>
              <p>Type</p>
              <strong>{order.orderType.replaceAll("_", " ")}</strong>
            </div>
            <div>
              <p>Table</p>
              <strong>{getOrderTableLabel(order, "Not applicable")}</strong>
            </div>
            {canViewFinance && (
              <div>
                <p>Payment</p>
                <strong
                  className={
                    order.paymentStatus === "PAID"
                      ? "text-emerald-500"
                      : "text-amber-500"
                  }
                >
                  {order.paymentStatus}
                </strong>
              </div>
            )}
          </div>

          <div className="order-detail-section-title">
            <h3>Items</h3>
            {canEditItems && (
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="dashboard-secondary-button order-add-menu-button"
              >
                <MdAddShoppingCart size={18} />
                Add Menu Item
              </button>
            )}
          </div>
          <div className="order-item-list">
            {editedItems.map((item) => (
              <div key={itemKey(item)} className="order-item-row">
                <div>
                  <strong>
                    {item.name}
                    {item.variantLabel ? ` \u00B7 ${item.variantLabel}` : ""}
                  </strong>
                  {canViewFinance && (
                    <small>
                      {"\u20B9"}
                      {Number(item.price).toFixed(2)} each
                    </small>
                  )}
                </div>
                <div className="order-item-actions">
                  {canEditItems ? (
                    <>
                      <div className="menu-cart-quantity">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item, -1)}
                          aria-label={`Decrease ${item.name}`}
                        >
                          &minus;
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item, 1)}
                          aria-label={`Increase ${item.name}`}
                        >
                          &#43;
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        className="order-remove-item"
                        aria-label={`Remove ${item.name}`}
                      >
                        <MdDelete size={18} />
                      </button>
                    </>
                  ) : (
                    <span className="text-[var(--dash-muted)]">
                      x{item.quantity}
                    </span>
                  )}
                  {canViewFinance && (
                    <strong className="order-line-total">
                      {"\u20B9"}
                      {(Number(item.price) * item.quantity).toFixed(2)}
                    </strong>
                  )}
                </div>
              </div>
            ))}
            {editedItems.length === 0 && (
              <div className="order-empty-state">
                No items left. Add one item before saving this order.
              </div>
            )}
          </div>
          {hasChanges && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  itemsMutation.mutate({
                    orderId: order.id,
                    items: toOrderItemPayload(editedItems),
                  })
                }
                disabled={itemsMutation.isPending || editedItems.length === 0}
                className="dashboard-primary-button rounded-lg px-5 py-2.5 font-semibold disabled:opacity-50"
              >
                {itemsMutation.isPending ? "Updating..." : "Update Order Items"}
              </button>
            </div>
          )}

          {canViewFinance && (
            <div className="order-total-box">
              <div>
                <span>Subtotal</span>
                <strong>
                  {"\u20B9"}
                  {previewSubtotal.toFixed(2)}
                </strong>
              </div>
              <div>
                <span>Tax ({order.taxRate}%)</span>
                <strong>
                  {"\u20B9"}
                  {previewTax.toFixed(2)}
                </strong>
              </div>
              <div>
                <span>Total</span>
                <strong>
                  {"\u20B9"}
                  {previewTotal.toFixed(2)}
                </strong>
              </div>
            </div>
          )}

          {order.paymentStatus === "UNPAID" &&
            !["CANCELLED", "REJECTED"].includes(order.orderStatus) && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = openOrderTicketWindow();
                    if (!printOrderTicket(printWindow, order, restaurant)) {
                      enqueueSnackbar(
                        "Allow pop-ups to print this order bill",
                        { variant: "warning" },
                      );
                    }
                  }}
                  className="dashboard-secondary-button rounded-lg px-5 py-3 font-semibold"
                >
                  Print Order Bill
                </button>
              </div>
            )}

          <div className="order-detail-status">
            <span>Order Status</span>
            <div>
              <button type="button" className="order-status-current">
                {order.orderStatus}
              </button>
              {(transitions[role]?.[order.orderStatus] || []).map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() =>
                    statusMutation.mutate({
                      orderId: order.id,
                      orderStatus: status,
                    })
                  }
                  disabled={statusMutation.isPending}
                  className="dashboard-secondary-button rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
                >
                  Mark as {status}
                </button>
              ))}
            </div>
          </div>

          {canTakePayment && (
            <div className="order-payment-actions">
              <button
                type="button"
                disabled={!payable || cashMutation.isPending}
                onClick={() => cashMutation.mutate(order.id)}
                className="dashboard-primary-button flex-1 disabled:opacity-40"
              >
                Pay Cash
              </button>
              <button
                type="button"
                disabled={!payable}
                onClick={payOnline}
                className="dashboard-secondary-button flex-1 rounded-lg px-5 py-3 font-semibold disabled:opacity-40"
              >
                Pay Online
              </button>
            </div>
          )}
          {!payable && order.paymentStatus === "UNPAID" && canTakePayment && (
            <p className="mt-2 text-right text-xs text-[var(--dash-muted)]">
              Payment becomes available when the order is READY or SERVED.
            </p>
          )}
          {order.paymentStatus === "PAID" && canTakePayment && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!hasExport) {
                    enqueueSnackbar("Downloadable receipts are included with Professional.", {
                      variant: "info",
                    });
                    return;
                  }
                  setReceiptCopyType("REPRINT");
                  setShowReceipt(true);
                }}
                className={`dashboard-secondary-button rounded-lg px-5 py-3 font-semibold ${!hasExport ? "receipt-pro-locked" : ""}`}
              >
                {!hasExport && <MdLockOutline />}
                Download / Print Receipt
                {!hasExport && <span>PRO</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {showReceipt && (
        <Invoice
          orderInfo={order}
          setShowInvoice={setShowReceipt}
          copyType={receiptCopyType}
          onPrint={async () => {
            try {
              await recordReceiptPrint({
                orderId: order.id,
                copyType: receiptCopyType,
              });
              setReceiptCopyType("REPRINT");
            } catch (error) {
              enqueueSnackbar(
                getErrorMessage(error, "Receipt print could not be recorded"),
                { variant: "error" },
              );
              throw error;
            }
          }}
        />
      )}

      {isPickerOpen && (
        <div
          className="order-menu-picker-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Add menu item to order"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsPickerOpen(false);
          }}
        >
          <div className="order-menu-picker dashboard-detail-modal">
            <div className="order-menu-picker-header">
              <div>
                <h3>Add menu item</h3>
                <p>Search dishes, choose variants, then add to this order.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                aria-label="Close menu picker"
              >
                <IoMdClose size={24} />
              </button>
            </div>

            <div className="order-menu-picker-toolbar">
              <label>
                <MdSearch size={20} />
                <input
                  value={pickerSearch}
                  onChange={(event) => setPickerSearch(event.target.value)}
                  placeholder="Search menu, category, variant..."
                  autoFocus
                />
              </label>
              <div className="order-menu-picker-tabs scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setPickerCategoryId("all")}
                  className={pickerCategoryId === "all" ? "is-active" : ""}
                >
                  All
                </button>
                {menuCategories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => setPickerCategoryId(category.id)}
                    className={
                      pickerCategoryId === category.id ? "is-active" : ""
                    }
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="order-menu-picker-body">
              <div className="order-menu-picker-list scrollbar-hide">
                {menuQuery.isLoading ? (
                  <div className="order-menu-picker-empty">
                    Loading menu items...
                  </div>
                ) : pickerItems.length === 0 ? (
                  <div className="order-menu-picker-empty">
                    No matching menu items.
                  </div>
                ) : (
                  pickerItems.map((item) => {
                    const variants =
                      item.variants?.filter((variant) => variant.available) ||
                      [];
                    const startsAt =
                      variants.length > 0
                        ? Math.min(...variants.map((variant) => variant.price))
                        : item.price;

                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setPickerItemId(item.id);
                          setPickerVariantId("");
                        }}
                        className={`order-menu-picker-card ${
                          pickerItem?.id === item.id ? "is-active" : ""
                        }`}
                      >
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.categoryName}</small>
                        </span>
                        <span>
                          {"\u20B9"}
                          {Number(startsAt).toFixed(2)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <aside className="order-menu-picker-detail">
                {pickerItem ? (
                  <>
                    <div>
                      <span>{pickerItem.categoryName}</span>
                      <h4>{pickerItem.name}</h4>
                      {pickerItem.description && (
                        <p>{pickerItem.description}</p>
                      )}
                    </div>

                    {pickerVariants.length > 0 && (
                      <div className="order-menu-picker-variants">
                        <strong>Variant</strong>
                        {pickerVariants.map((variant) => (
                          <button
                            type="button"
                            key={variant.id}
                            onClick={() => setPickerVariantId(variant.id)}
                            className={
                              pickerVariant?.id === variant.id
                                ? "is-active"
                                : ""
                            }
                          >
                            <span>{variant.label}</span>
                            <span>
                              {"\u20B9"}
                              {Number(variant.price).toFixed(2)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="order-menu-picker-summary">
                      <span>
                        {"\u20B9"}
                        {pickerPrice.toFixed(2)} each
                      </span>
                      <div className="menu-cart-quantity">
                        <button
                          type="button"
                          onClick={() =>
                            setPickerQuantity(Math.max(1, pickerQuantity - 1))
                          }
                          aria-label="Decrease picker quantity"
                        >
                          &minus;
                        </button>
                        <span>{pickerQuantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setPickerQuantity(Math.min(100, pickerQuantity + 1))
                          }
                          aria-label="Increase picker quantity"
                        >
                          &#43;
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addSelectedItem}
                      className="dashboard-primary-button order-menu-picker-add"
                    >
                      Add to order - {"\u20B9"}
                      {(pickerPrice * pickerQuantity).toFixed(2)}
                    </button>
                  </>
                ) : (
                  <div className="order-menu-picker-empty">
                    Select an item to add.
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsModal;
