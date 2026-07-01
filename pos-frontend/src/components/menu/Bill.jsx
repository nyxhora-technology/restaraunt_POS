import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addOrder, getErrorMessage } from "../../https";
import { getTotalPrice, removeAllItems } from "../../redux/slices/cartSlice";
import { removeCustomer, setCustomer } from "../../redux/slices/customerSlice";
import CreateOrderModal from "../shared/CreateOrderModal";
import {
  openOrderTicketWindow,
  printOrderTicket,
  showOrderTicketError,
} from "../../utils/orderTicket";

const Bill = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const queryClient = useQueryClient();
  const customerData = useSelector((state) => state.customer);
  const cartData = useSelector((state) => state.cart);
  const restaurant = useSelector((state) => state.user.restaurant);
  const total = useSelector(getTotalPrice);
  // ARCH-5: Tax rate must match orderController.js (line ~111).
  // TODO: Move to a per-restaurant setting stored in the DB and Redux store.
  const taxRate = 5;
  const tax = (total * taxRate) / 100;
  const totalPriceWithTax = total + tax;

  const orderMutation = useMutation({
    mutationFn: ({ payload }) => addOrder(payload),
    onSuccess: ({ data }, { printWindow }) => {
      const billOpened = printOrderTicket(
        printWindow,
        data.data,
        restaurant,
        { autoPrint: false },
      );
      dispatch(removeCustomer());
      dispatch(removeAllItems());
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      enqueueSnackbar(
        billOpened
          ? `Order #${data.data.orderNo} placed. Bill generated; print it only if needed.`
          : `Order #${data.data.orderNo} placed. View or print its bill from Orders.`,
        {
          variant: billOpened ? "success" : "warning",
        },
      );
      navigate("/", { replace: true });
    },
    onError: (error, { printWindow }) => {
      showOrderTicketError(printWindow);
      enqueueSnackbar(getErrorMessage(error, "Order could not be placed"), {
        variant: "error",
      });
    },
  });

  const handlePlaceOrder = () => {
    if (!cartData.length) {
      enqueueSnackbar("Add at least one menu item", { variant: "warning" });
      return;
    }

    const needsTable = customerData.orderType === "DINE_IN" && !customerData.tables?.length;
    if (needsTable) {
      navigate("/tables", { state: { retainCart: true } });
      enqueueSnackbar("Please select a table to assign this order", { variant: "info" });
      return;
    }

    const needsDetails =
      !customerData.customerName ||
      !customerData.customerPhone ||
      customerData.guests < 1;

    if (needsDetails) {
      setShowCustomerModal(true);
      return;
    }

    placeOrderWithDetails(customerData);
  };

  const placeOrderWithDetails = (details) => {
    const printWindow = openOrderTicketWindow();
    orderMutation.mutate({
      printWindow,
      payload: {
        orderType: details.orderType,
        ...(details.orderType === "DINE_IN"
          ? {
              tableIds: details.tables.map((table) => table.tableId),
            }
          : {}),
        customerName: details.customerName,
        customerPhone: String(details.customerPhone),
        guests: Number(details.guests),
        items: cartData.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          variantId: item.variantId,
        })),
      },
    });
  };

  return (
    <div>
      <div className="menu-bill">
        <div className="flex items-center justify-between">
          <p>Items({cartData.length})</p>
          <h1>
            {"\u20B9"}
            {total.toFixed(2)}
          </h1>
        </div>
        <div className="flex items-center justify-between">
          <p>Tax({taxRate}%)</p>
          <h1>
            {"\u20B9"}
            {tax.toFixed(2)}
          </h1>
        </div>
        <div className="flex items-center justify-between">
          <p>Total With Tax</p>
          <h1>
            {"\u20B9"}
            {totalPriceWithTax.toFixed(2)}
          </h1>
        </div>
      </div>
      <p className="mt-4 px-5 text-xs text-[var(--dash-muted)]">
        Payment is collected from the order after it is ready or served.
      </p>
      <div className="mt-3 px-5">
        <button
          type="button"
          disabled={orderMutation.isPending}
          onClick={handlePlaceOrder}
          className="dashboard-primary-button w-full rounded-lg px-4 py-3 text-lg font-semibold disabled:opacity-60"
        >
          {orderMutation.isPending ? "Placing..." : "Place Order"}
        </button>
      </div>

      <CreateOrderModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        dashboardVariant={false}
      />
    </div>
  );
};

export default Bill;
