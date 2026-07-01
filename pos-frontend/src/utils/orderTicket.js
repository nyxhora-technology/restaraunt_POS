const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatMoney = (value, currency = "INR") => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
};

const getTableLabels = (order) => {
  const assigned = (order.tableAssignments || [])
    .map((assignment) => assignment.table)
    .filter(Boolean);
  const tables = assigned.length ? assigned : order.table ? [order.table] : [];
  return tables
    .map((table) => table.label || `Table ${table.tableNo}`)
    .join(" + ");
};

export const openOrderTicketWindow = () => {
  const printWindow = window.open("", "", "width=500,height=700");
  if (!printWindow) return null;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Preparing order bill</title>
        <style>
          body { display: grid; min-height: 80vh; place-items: center; margin: 0; color: #333; font: 14px Arial, sans-serif; }
        </style>
      </head>
      <body>Preparing order bill…</body>
    </html>
  `);
  printWindow.document.close();
  return printWindow;
};

export const showOrderTicketError = (printWindow) => {
  if (!printWindow || printWindow.closed) return;
  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head><title>Order bill could not be created</title></head>
      <body style="font-family:Arial,sans-serif;padding:24px">
        <h2>Order could not be created</h2>
        <p>Close this window, correct the order, and try again.</p>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const printOrderTicket = (
  printWindow,
  order,
  restaurant,
  { autoPrint = true } = {},
) => {
  if (!printWindow || printWindow.closed) return false;

  const currency = restaurant?.currency || "INR";
  const tableLabels = getTableLabels(order);
  const rows = (order.items || [])
    .map(
      (item) => `
        <tr>
          <td>
            ${escapeHtml(item.name)}
            ${item.variantLabel ? `<small> · ${escapeHtml(item.variantLabel)}</small>` : ""}
            ${item.note ? `<em>${escapeHtml(item.note)}</em>` : ""}
          </td>
          <td class="number">${Number(item.quantity)}</td>
          <td class="number">${escapeHtml(
            formatMoney(Number(item.price) * Number(item.quantity), currency),
          )}</td>
        </tr>
      `,
    )
    .join("");

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Bill ${escapeHtml(order.orderNo)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 18px; color: #111; font: 13px/1.45 "Courier New", monospace; }
          main { width: 100%; max-width: 360px; margin: 0 auto; }
          header, .title, footer { text-align: center; }
          h1 { margin: 0; font: bold 20px/1.2 Arial, sans-serif; text-transform: uppercase; }
          header p, footer p { margin: 2px 0; }
          .divider { margin: 12px 0; border-top: 1px dashed #555; }
          .title h2 { margin: 0; font-size: 16px; }
          .pending { margin: 5px 0 0; font-weight: bold; }
          .meta p, .total-row { display: flex; justify-content: space-between; gap: 12px; margin: 3px 0; }
          .meta strong { max-width: 62%; overflow-wrap: anywhere; text-align: right; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 5px 2px; vertical-align: top; text-align: left; }
          th { border-bottom: 1px solid #777; }
          .number { text-align: right; white-space: nowrap; }
          td small, td em { display: block; color: #555; font-size: 11px; }
          .totals { width: 72%; margin-left: auto; }
          .grand-total { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #555; font-size: 15px; font-weight: bold; }
          .notice { margin-top: 12px; border: 1px solid #777; padding: 8px; text-align: center; font-weight: bold; }
          footer { margin-top: 14px; font-size: 11px; }
          .actions { display: flex; gap: 10px; width: 100%; max-width: 360px; margin: 18px auto 0; }
          .actions button { flex: 1; border: 1px solid #222; border-radius: 6px; background: #fff; padding: 10px 12px; color: #111; font: 700 13px Arial, sans-serif; cursor: pointer; }
          .actions .primary { background: #111; color: #fff; }
          @page { margin: 8mm; }
          @media print { body { padding: 0; } .actions { display: none; } }
        </style>
      </head>
      <body>
        <main>
          <header>
            <h1>${escapeHtml(restaurant?.name || "Restaurant")}</h1>
            ${restaurant?.address ? `<p>${escapeHtml(restaurant.address)}</p>` : ""}
            ${restaurant?.phone ? `<p>Phone: ${escapeHtml(restaurant.phone)}</p>` : ""}
          </header>

          <div class="divider"></div>

          <section class="title">
            <h2>Order Bill</h2>
            <p class="pending">PAYMENT PENDING</p>
          </section>

          <section class="meta">
            <p><span>Order No.</span><strong>#${escapeHtml(order.orderNo)}</strong></p>
            <p><span>Created</span><strong>${escapeHtml(
              new Date(order.createdAt).toLocaleString(),
            )}</strong></p>
            <p><span>Customer</span><strong>${escapeHtml(order.customerName)}</strong></p>
            <p><span>Phone</span><strong>${escapeHtml(order.customerPhone)}</strong></p>
            <p><span>Guests</span><strong>${escapeHtml(order.guests)}</strong></p>
            <p><span>Order type</span><strong>${escapeHtml(
              String(order.orderType).replaceAll("_", " "),
            )}</strong></p>
            ${
              tableLabels
                ? `<p><span>Table(s)</span><strong>${escapeHtml(tableLabels)}</strong></p>`
                : ""
            }
          </section>

          <div class="divider"></div>

          <table>
            <thead>
              <tr><th>Item</th><th class="number">Qty</th><th class="number">Amount</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="divider"></div>

          <section class="totals">
            <p class="total-row"><span>Subtotal</span><span>${escapeHtml(
              formatMoney(order.subtotal, currency),
            )}</span></p>
            <p class="total-row"><span>Tax (${Number(
              order.taxRate || 0,
            )}%)</span><span>${escapeHtml(
              formatMoney(order.tax, currency),
            )}</span></p>
            <p class="total-row grand-total"><span>Amount due</span><span>${escapeHtml(
              formatMoney(order.totalWithTax, currency),
            )}</span></p>
          </section>

          <div class="notice">NOT A PAYMENT RECEIPT</div>
          <footer>
            <p>The final payment receipt is issued after payment is completed.</p>
          </footer>
        </main>
        ${
          autoPrint
            ? ""
            : `<div class="actions">
                 <button id="close-order-bill" type="button">Close</button>
                 <button id="print-order-bill" class="primary" type="button">Print Bill</button>
               </div>`
        }
      </body>
    </html>
  `);
  printWindow.document.close();

  if (!autoPrint) {
    printWindow.document
      .getElementById("close-order-bill")
      ?.addEventListener("click", () => printWindow.close());
    printWindow.document
      .getElementById("print-order-bill")
      ?.addEventListener("click", () => {
        printWindow.focus();
        printWindow.print();
      });
    printWindow.focus();
    return true;
  }

  printWindow.onafterprint = () => printWindow.close();
  window.setTimeout(() => {
    if (printWindow.closed) return;
    printWindow.focus();
    printWindow.print();
  }, 100);
  return true;
};
