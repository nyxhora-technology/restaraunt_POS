import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { getOrderTableLabel } from "../tables/tableOptions";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const Invoice = ({
  orderInfo,
  setShowInvoice,
  copyType = "REPRINT",
  onPrint,
}) => {
  const invoiceRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const restaurant = useSelector((state) => state.user.restaurant);
  const payment = orderInfo.payment;
  const isReprint = copyType === "REPRINT";

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowInvoice(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [setShowInvoice]);

  const handlePrint = async () => {
    const printWindow = window.open("", "", "width=500,height=700");
    if (!printWindow) return;

    setIsPrinting(true);
    try {
      const printContent = invoiceRef.current.innerHTML;
      await onPrint?.();
      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Receipt R-${orderInfo.orderNo}</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; padding: 18px; color: #111; font: 13px/1.45 "Courier New", monospace; }
              .receipt-document { width: 100%; max-width: 360px; margin: 0 auto; }
              .receipt-header, .receipt-title, .receipt-footer { text-align: center; }
              .receipt-header h2 { margin: 0; font-size: 20px; text-transform: uppercase; }
              .receipt-header p, .receipt-footer p { margin: 2px 0; }
              .receipt-divider { margin: 12px 0; border-top: 1px dashed #555; }
              .receipt-title h3 { margin: 0; font-size: 16px; text-transform: uppercase; }
              .receipt-copy { margin-top: 4px; font-weight: 700; }
              .receipt-meta p { display: flex; justify-content: space-between; gap: 12px; margin: 3px 0; }
              .receipt-meta strong { text-align: right; }
              .receipt-table { width: 100%; border-collapse: collapse; }
              .receipt-table th, .receipt-table td { padding: 4px 2px; vertical-align: top; }
              .receipt-table th { border-bottom: 1px solid #777; text-align: left; }
              .receipt-table .number { text-align: right; white-space: nowrap; }
              .receipt-totals { margin-left: auto; width: 72%; }
              .receipt-total-row { display: flex; justify-content: space-between; margin: 3px 0; }
              .receipt-grand-total { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #555; font-size: 15px; font-weight: 700; }
              .receipt-payment { margin-top: 12px; padding: 8px; border: 1px solid #777; }
              .receipt-payment p { display: flex; justify-content: space-between; gap: 12px; margin: 2px 0; }
              .receipt-payment strong { max-width: 62%; overflow-wrap: anywhere; text-align: right; }
              @page { margin: 8mm; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } catch {
      printWindow.close();
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div
      className="dashboard-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={`Payment receipt for order ${orderInfo.orderNo}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShowInvoice(false);
      }}
    >
      <div className="max-h-[92vh] w-[420px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-xl bg-white p-4 text-gray-900 shadow-2xl">
        <div ref={invoiceRef} className="receipt-document p-3">
          <div className="receipt-header text-center">
            <h2 className="text-xl font-bold uppercase">
              {restaurant?.name || "Restaurant"}
            </h2>
            {restaurant?.address && <p>{restaurant.address}</p>}
            {restaurant?.phone && <p>Phone: {restaurant.phone}</p>}
          </div>

          <div className="receipt-divider my-3 border-t border-dashed border-gray-400" />

          <div className="receipt-title text-center">
            <h3 className="font-bold uppercase">Payment Receipt</h3>
            {isReprint && (
              <p className="receipt-copy text-xs font-bold">DUPLICATE COPY</p>
            )}
          </div>

          <div className="receipt-meta mt-4 text-sm">
            <p>
              <span>Receipt No.</span>
              <strong>R-{orderInfo.orderNo}</strong>
            </p>
            <p>
              <span>Order No.</span>
              <strong>#{orderInfo.orderNo}</strong>
            </p>
            <p>
              <span>Paid at</span>
              <strong>
                {new Date(
                  payment?.createdAt || orderInfo.updatedAt,
                ).toLocaleString()}
              </strong>
            </p>
            <p>
              <span>Customer</span>
              <strong>{orderInfo.customerName}</strong>
            </p>
            <p>
              <span>Order type</span>
              <strong>{orderInfo.orderType.replaceAll("_", " ")}</strong>
            </p>
            {orderInfo.orderType === "DINE_IN" && (
              <p>
                <span>Table(s)</span>
                <strong>{getOrderTableLabel(orderInfo)}</strong>
              </p>
            )}
          </div>

          <div className="receipt-divider my-3 border-t border-dashed border-gray-400" />

          <table className="receipt-table w-full text-sm">
            <thead>
              <tr>
                <th>Item</th>
                <th className="number text-right">Qty</th>
                <th className="number text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orderInfo.items.map((item, index) => (
                <tr
                  key={
                    item.id ||
                    `${item.menuItemId}:${item.variantId || "base"}:${index}`
                  }
                >
                  <td>
                    {item.name}
                    {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                    <small className="block text-gray-500">
                      {money(item.price)} each
                    </small>
                  </td>
                  <td className="number text-right">{item.quantity}</td>
                  <td className="number text-right">
                    {money(Number(item.price) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="receipt-divider my-3 border-t border-dashed border-gray-400" />

          <div className="receipt-totals ml-auto w-3/4 text-sm">
            <div className="receipt-total-row flex justify-between">
              <span>Subtotal</span>
              <span>{money(orderInfo.subtotal)}</span>
            </div>

            {/* Discount line */}
            {Number(orderInfo.discountAmt) > 0 && (
              <div className="receipt-total-row flex justify-between text-green-700">
                <span>
                  Discount
                  {orderInfo.discountType === "PERCENT"
                    ? ` (${orderInfo.discountValue}%)`
                    : orderInfo.discountType === "FLAT"
                    ? " (Flat)"
                    : ""}
                </span>
                <span>-{money(orderInfo.discountAmt)}</span>
              </div>
            )}

            {/* Per-type tax breakdown (new orders) */}
            {Number(orderInfo.cgstTotal) > 0 && (
              <div className="receipt-total-row flex justify-between text-gray-600">
                <span>CGST</span>
                <span>{money(orderInfo.cgstTotal)}</span>
              </div>
            )}
            {Number(orderInfo.sgstTotal) > 0 && (
              <div className="receipt-total-row flex justify-between text-gray-600">
                <span>SGST</span>
                <span>{money(orderInfo.sgstTotal)}</span>
              </div>
            )}
            {Number(orderInfo.igstTotal) > 0 && (
              <div className="receipt-total-row flex justify-between text-gray-600">
                <span>IGST</span>
                <span>{money(orderInfo.igstTotal)}</span>
              </div>
            )}
            {Number(orderInfo.vatTotal) > 0 && (
              <div className="receipt-total-row flex justify-between text-gray-600">
                <span>VAT (Alcohol/Excise)</span>
                <span>{money(orderInfo.vatTotal)}</span>
              </div>
            )}

            {/* Legacy fallback — for old orders that only have taxRate/tax */}
            {!orderInfo.cgstTotal && !orderInfo.vatTotal && Number(orderInfo.tax) > 0 && (
              <div className="receipt-total-row flex justify-between text-gray-600">
                <span>Tax ({Number(orderInfo.taxRate || 0)}%)</span>
                <span>{money(orderInfo.tax)}</span>
              </div>
            )}

            <div className="receipt-total-row receipt-grand-total mt-2 flex justify-between border-t border-dashed pt-2 font-bold">
              <span>Total Paid</span>
              <span>{money(orderInfo.totalWithTax)}</span>
            </div>
          </div>

          <div className="receipt-payment mt-4 rounded border p-2 text-sm">
            <p>
              <span>Payment method: </span>
              <strong>{payment?.method || orderInfo.paymentMethod}</strong>
            </p>
            {/* <p>
              <span>Payment reference: </span>
              <strong className="max-w-[62%] break-all text-right">
                {payment?.paymentId || orderInfo.razorpayPaymentId}
              </strong>
            </p> */}
            <p>
              <span>Status: </span>
              <strong>PAID</strong>
            </p>
          </div>

          <div className="receipt-footer mt-4 text-center text-xs">
            <p>Thank you for dining with us.</p>
          </div>
        </div>

        <div className="mt-4 flex justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowInvoice(false)}
            className="dashboard-secondary-button flex-1 rounded-lg px-4 py-2"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="dashboard-primary-button flex-1 rounded-lg px-4 py-2 disabled:opacity-60"
          >
            {isPrinting
              ? "Preparing..."
              : isReprint
                ? "Print Duplicate"
                : "Print Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
