import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  createOrderRazorpay,
  getErrorMessage,
  getOrders,
  getPaymentHistory,
  recordCashPayment,
  recordReceiptPrint,
  verifyPaymentRazorpay,
} from "../../https";
import { formatDateAndTime } from "../../utils";
import useRoleDashboard from "../../hooks/useRoleDashboard";
import Invoice from "../invoice/Invoice";
import { getOrderTableLabel } from "../tables/tableOptions";

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const PaymentPanel = () => {
  const [receipt, setReceipt] = useState(null);
  const queryClient = useQueryClient();
  const { canViewPayments, canViewPaymentHistory } = useRoleDashboard();
  const ordersQuery = useQuery({
    queryKey: ["orders", "payment"],
    queryFn: () => getOrders(),
    enabled: canViewPayments,
  });
  const payableOrders = (ordersQuery.data?.data.data || []).filter(
    (order) =>
      order.paymentStatus === "UNPAID" &&
      ["READY", "SERVED"].includes(order.orderStatus),
  );
  const historyQuery = useQuery({
    queryKey: ["payment-history"],
    queryFn: getPaymentHistory,
    enabled: canViewPaymentHistory,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    queryClient.invalidateQueries({ queryKey: ["payment-history"] });
  };

  const cashMutation = useMutation({
    mutationFn: (order) => recordCashPayment(order.id),
    onSuccess: ({ data }, order) => {
      setReceipt({
        order: {
          ...order,
          orderStatus: "COMPLETED",
          paymentStatus: "PAID",
          paymentMethod: data.data.method,
          payment: data.data,
        },
        copyType: "ORIGINAL",
      });
      refresh();
      enqueueSnackbar("Cash payment recorded", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const payOnline = async (order) => {
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
        enqueueSnackbar("Razorpay key is not configured", {
          variant: "warning",
        });
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
            setReceipt({
              order: {
                ...order,
                orderStatus: "COMPLETED",
                paymentStatus: "PAID",
                paymentMethod: verification.data.method,
                payment: verification.data,
              },
              copyType: "ORIGINAL",
            });
            refresh();
            enqueueSnackbar("Online payment verified", { variant: "success" });
          } catch (error) {
            enqueueSnackbar(
              getErrorMessage(error, "Payment verification failed"),
              {
                variant: "error",
              },
            );
          }
        },
        theme: { color: "#025cca" },
      }).open();
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, "Unable to start payment"), {
        variant: "error",
      });
    }
  };

  if (!canViewPayments) return null;

  return (
    <div className="dashboard-management-panel container mx-auto p-4 rounded-lg">
      <h2 className="text-[var(--dash-text)] text-xl font-semibold mb-4">
        Ready for Payment
      </h2>
      {!payableOrders.length ? (
        <p className="text-[var(--dash-muted)]">No ready unpaid orders.</p>
      ) : (
        payableOrders.map((order) => (
          <div
            key={order.id}
            className="dashboard-payment-row grid grid-cols-6 gap-4 items-center p-4"
          >
            <span>#{order.orderNo}</span>
            <span>{order.customerName}</span>
            <span>
              {order.orderType === "TAKEAWAY"
                ? "Takeaway"
                : getOrderTableLabel(order)}
            </span>
            <span>₹{order.totalWithTax.toFixed(2)}</span>
            <button
              onClick={() => cashMutation.mutate(order)}
              className="dashboard-success-button px-4 py-2 rounded-lg"
            >
              Cash
            </button>
            <button
              onClick={() => payOnline(order)}
              className="dashboard-primary-button px-4 py-2 rounded-lg"
            >
              Online
            </button>
          </div>
        ))
      )}
      {canViewPaymentHistory && (
        <div className="mt-8">
          <h2 className="text-[var(--dash-text)] text-xl font-semibold mb-4">
            Payment History
          </h2>
          <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
            {(historyQuery.data?.data.data || []).map((payment) => (
              <div
                key={payment.id}
                className="dashboard-payment-row grid grid-cols-7 items-center gap-4 p-3 text-sm"
              >
                <span>#{payment.order.orderNo}</span>
                <span>{payment.order.customerName}</span>
                <span>₹{payment.amount.toFixed(2)}</span>
                <span>{payment.method}</span>
                <span>{payment.status}</span>
                <span className="text-[var(--dash-muted)]">
                  {formatDateAndTime(payment.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setReceipt({
                      order: { ...payment.order, payment },
                      copyType: "REPRINT",
                    })
                  }
                  className="dashboard-secondary-button rounded-lg px-3 py-2 font-semibold"
                >
                  Reprint
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {receipt && (
        <Invoice
          orderInfo={receipt.order}
          setShowInvoice={(open) => {
            if (!open) setReceipt(null);
          }}
          copyType={receipt.copyType}
          onPrint={async () => {
            try {
              await recordReceiptPrint({
                orderId: receipt.order.id,
                copyType: receipt.copyType,
              });
              setReceipt((current) =>
                current ? { ...current, copyType: "REPRINT" } : current,
              );
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
    </div>
  );
};

export default PaymentPanel;
