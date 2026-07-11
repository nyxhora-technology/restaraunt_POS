import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { MdArrowForward, MdInsights, MdLockOutline, MdDownload, MdReceipt, MdWarning, MdCheckCircle, MdChevronLeft, MdChevronRight } from "react-icons/md";
import { getAnalytics, getGstrSummary, downloadGstrJson, downloadGstrCsv } from "../https";
import useFeature from "../hooks/useFeature";
import Tooltip from "../components/shared/Tooltip";
import UpgradeModal from "../components/shared/UpgradeModal";
import { enqueueSnackbar } from "notistack";
import dayjs from "dayjs";

const COLORS = ["#18b979", "#5b8def", "#f6a723", "#a878e8", "#ef6b67"];
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Preview = () => (
  <div className="analytics-preview" aria-hidden="true">
    <div className="analytics-preview-bars">
      {[38, 58, 44, 78, 64, 91, 72, 48, 84, 68, 96, 76].map((height, index) => (
        <span key={index} style={{ height: `${height}%` }} />
      ))}
    </div>
    <div className="analytics-preview-row">
      <div className="analytics-preview-donut" />
      <div className="analytics-preview-lines">
        <i /><i /><i /><i />
      </div>
    </div>
  </div>
);

const AnalyticsLocked = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <main className="analytics-shell analytics-locked-shell">
      <div className="analytics-locked-preview"><Preview /></div>
      <section className="analytics-lock-card">
        <span className="analytics-lock-icon"><MdLockOutline /></span>
        <p className="analytics-eyebrow">Professional analytics</p>
        <h1>Know where every rupee is earned.</h1>
        <p>
          Revenue trends, profitable dishes, peak service hours, payment mix,
          and completion performance in one decision-ready workspace.
        </p>
        <div className="analytics-lock-benefits">
          <span>90-day revenue history</span>
          <span>Peak-hour heatmap</span>
          <span>Dish profitability</span>
        </div>
        <button
          type="button"
          className="analytics-upgrade-button"
          onClick={() => setModalOpen(true)}
        >
          Upgrade to unlock analytics <MdArrowForward />
        </button>
        <small>~₹83/day · Available to restaurant owners and managers.</small>
        {modalOpen && <UpgradeModal onClose={() => setModalOpen(false)} />}
      </section>
    </main>
  );
};

// ─── GST Report Tab ──────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

const triggerBlobDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const GstReport = () => {
  // Default to previous month
  const [month, setMonth] = useState(dayjs().subtract(1, "month").format("YYYY-MM"));

  const { data, isLoading, isError } = useQuery({
    queryKey: ["gstr-summary", month],
    queryFn: () => getGstrSummary(month),
    staleTime: 60_000,
  });
  const report = data?.data?.data;

  const [dlgJson, setDlgJson] = useState(false);
  const [dlgCsv, setDlgCsv] = useState(false);

  const handleDownload = async (type) => {
    if (type === "json") setDlgJson(true);
    else setDlgCsv(true);
    try {
      const res = type === "json"
        ? await downloadGstrJson(month)
        : await downloadGstrCsv(month);
      const ext = type === "json" ? "json" : "csv";
      const m = month.replace("-", "");
      triggerBlobDownload(res.data, `GSTR1_${m}.${ext}`);
    } catch (err) {
      enqueueSnackbar(
        type === "json" && err?.response?.status === 400
          ? "GSTIN not configured. Set it in Settings → Restaurant Profile."
          : "Download failed. Try again.",
        { variant: "error" }
      );
    } finally {
      if (type === "json") setDlgJson(false);
      else setDlgCsv(false);
    }
  };

  const prevMonth = () => setMonth(dayjs(month + "-01").subtract(1, "month").format("YYYY-MM"));
  const nextMonth = () => {
    const next = dayjs(month + "-01").add(1, "month");
    if (next.isAfter(dayjs(), "month")) return; // can't go into future
    setMonth(next.format("YYYY-MM"));
  };

  const label = dayjs(month + "-01").format("MMMM YYYY");
  const isFuture = dayjs(month + "-01").add(1, "month").isAfter(dayjs(), "month");

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MdReceipt style={{ fontSize: 24, color: "var(--dash-primary)" }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--dash-text)" }}>GST Report</h2>
        </div>
        {/* Month picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{ background: "var(--dash-surface-2)", border: "1px solid var(--dash-border)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "var(--dash-text)" }}
          >
            <MdChevronLeft style={{ fontSize: 18 }} />
          </button>
          <span style={{ minWidth: 130, textAlign: "center", fontWeight: 600, color: "var(--dash-text)", fontSize: 15 }}>
            {label}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            disabled={isFuture}
            style={{ background: "var(--dash-surface-2)", border: "1px solid var(--dash-border)", borderRadius: 8, padding: "6px 10px", cursor: isFuture ? "not-allowed" : "pointer", color: isFuture ? "var(--dash-muted)" : "var(--dash-text)", opacity: isFuture ? 0.5 : 1 }}
          >
            <MdChevronRight style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* GSTIN Status */}
      {!isLoading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", borderRadius: 10, marginBottom: 20,
          background: report?.gstinMissing ? "rgba(239,68,68,0.08)" : "rgba(22,163,74,0.08)",
          border: `1px solid ${report?.gstinMissing ? "rgba(239,68,68,0.3)" : "rgba(22,163,74,0.3)"}`,
        }}>
          {report?.gstinMissing
            ? <MdWarning style={{ color: "#ef4444", fontSize: 18 }} />
            : <MdCheckCircle style={{ color: "#16a34a", fontSize: 18 }} />
          }
          <span style={{ fontSize: 13, color: "var(--dash-text)" }}>
            {report?.gstinMissing
              ? <><strong>GSTIN not set</strong> — Go to <strong>Settings → Restaurant Profile</strong> to add it. Required for GSTR-1 JSON export.</>
              : <><strong>GSTIN:</strong> {report.gstin} &nbsp;|&nbsp; <strong>State:</strong> {report.stateName || report.stateCode}</>
            }
          </span>
        </div>
      )}

      {/* Summary Table */}
      <div style={{ background: "var(--dash-surface-2)", borderRadius: 14, border: "1px solid var(--dash-border)", overflow: "hidden", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--dash-surface-3, rgba(0,0,0,0.08))" }}>
              {["GST Rate", "HSN/SAC", "Taxable Value", "CGST", "SGST", "Total GST", "Orders"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "var(--dash-muted)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--dash-muted)" }}>Loading…</td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#ef4444" }}>Failed to load GST data</td>
              </tr>
            ) : (report?.summary || []).length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--dash-muted)" }}>
                  No GST-eligible orders found for {label}
                </td>
              </tr>
            ) : (
              (report.summary || []).map((row, i) => {
                const rate = ((row.cgstRate || 0) + (row.sgstRate || 0)) * 2;
                return (
                  <tr key={i} style={{ borderTop: "1px solid var(--dash-border)" }}>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700, color: "var(--dash-primary)" }}>
                      {rate}%
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: "monospace", fontSize: 12 }}>
                      {row.hsnCode || "9963"}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>{fmt(row.taxableValue)}</td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>{fmt(row.cgstTotal)}</td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>{fmt(row.sgstTotal)}</td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700 }}>
                      {fmt((row.cgstTotal || 0) + (row.sgstTotal || 0))}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right", color: "var(--dash-muted)" }}>{row.orders}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {!isLoading && !isError && (report?.summary || []).length > 0 && (
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--dash-border)", background: "var(--dash-surface-3, rgba(0,0,0,0.06))" }}>
                <td colSpan={2} style={{ padding: "11px 14px", fontWeight: 700, color: "var(--dash-text)", textAlign: "right" }}>TOTAL</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700 }}>{fmt(report?.totals?.totalTaxableValue)}</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700 }}>{fmt(report?.totals?.totalCgst)}</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700 }}>{fmt(report?.totals?.totalSgst)}</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 800, color: "var(--dash-primary)" }}>{fmt(report?.totals?.totalGst)}</td>
                <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700 }}>
                  {(report?.summary || []).reduce((s, r) => s + (r.orders || 0), 0)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* VAT note */}
      {!isLoading && report?.vatSummary?.totalVatCollected > 0 && (
        <div style={{
          padding: "10px 16px", borderRadius: 10, marginBottom: 20,
          background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.25)",
          fontSize: 13, color: "var(--dash-text)",
        }}>
          <strong style={{ color: "#7c3aed" }}>Alcohol VAT collected: {fmt(report.vatSummary.totalVatCollected)}</strong>
          {" "}— This is NOT included in the GSTR-1 JSON. File separately with your state excise authority.
        </div>
      )}

      {/* Invoice range info */}
      {!isLoading && report?.invoiceRange?.total > 0 && (
        <div style={{ fontSize: 12, color: "var(--dash-muted)", marginBottom: 20 }}>
          Invoice range: Order #{report.invoiceRange.from} – #{report.invoiceRange.to}
          &nbsp;·&nbsp; {report.invoiceRange.total} total &nbsp;·&nbsp; {report.invoiceRange.cancelled} cancelled
        </div>
      )}

      {/* Download buttons */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={dlgCsv}
          onClick={() => handleDownload("csv")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14,
            background: "var(--dash-surface-2)", border: "1px solid var(--dash-border)",
            color: "var(--dash-text)", cursor: "pointer",
          }}
        >
          <MdDownload /> {dlgCsv ? "Downloading…" : "Download CSV"}
          <span style={{ fontSize: 11, color: "var(--dash-muted)", marginLeft: 2 }}>(for CA / Tally)</span>
        </button>

        <button
          type="button"
          disabled={dlgJson || report?.gstinMissing}
          onClick={() => handleDownload("json")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14,
            background: report?.gstinMissing ? "var(--dash-surface-2)" : "var(--dash-primary)",
            border: "1px solid var(--dash-border)",
            color: report?.gstinMissing ? "var(--dash-muted)" : "#fff",
            cursor: report?.gstinMissing ? "not-allowed" : "pointer",
            opacity: report?.gstinMissing ? 0.6 : 1,
          }}
          title={report?.gstinMissing ? "Set GSTIN in Settings first" : ""}
        >
          <MdDownload /> {dlgJson ? "Generating…" : "Download GSTR-1 JSON"}
          <span style={{ fontSize: 11, opacity: 0.8, marginLeft: 2 }}>(GST portal upload)</span>
        </button>
      </div>

      {/* Disclaimer */}
      <p style={{ marginTop: 20, fontSize: 11, color: "var(--dash-muted)", lineHeight: 1.6 }}>
        ⚠️ This file is intended for upload via the <strong>GST Offline Tool</strong> or import into Tally/Busy.
        Always verify totals with your CA before filing. This system does not file directly to the GSTN portal.
      </p>
    </div>
  );
};

// ─── Main Analytics Component ────────────────────────────────────────────────

const Analytics = () => {
  const { hasAnalytics } = useFeature();
  const restaurant = useSelector((state) => state.user.restaurant);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState("revenue");

  const { data, isLoading } = useQuery({
    queryKey: ["revenue-analytics", days],
    queryFn: () => getAnalytics(days),
    enabled: hasAnalytics && tab === "revenue",
  });
  const report = data?.data?.data;
  const money = useMemo(() => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: restaurant?.currency || "INR",
    maximumFractionDigits: 0,
  }), [restaurant?.currency]);

  if (!hasAnalytics) return <AnalyticsLocked />;

  const revenue = report?.revenue || [];
  const totalRevenue = revenue.reduce((sum, item) => sum + item.amount, 0);
  const maxRevenue = Math.max(...revenue.map((item) => item.amount), 1);
  const paymentTotal = (report?.paymentSplit || []).reduce(
    (sum, item) => sum + item.amount, 0,
  );
  const heatMax = Math.max(...(report?.heatmap || []).flat(), 1);

  return (
    <main className="analytics-shell">
      <header className="analytics-header">
        <div>
          <p className="analytics-eyebrow"><MdInsights /> Revenue intelligence</p>
          <h1>Performance analytics</h1>
          <p>Operational patterns and revenue signals for better daily decisions.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 4, background: "var(--dash-surface-2)", borderRadius: 10, padding: 4, border: "1px solid var(--dash-border)" }}>
            {[{ id: "revenue", label: "Revenue" }, { id: "gst", label: "GST Report" }].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  padding: "6px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13,
                  background: tab === t.id ? "var(--dash-primary)" : "transparent",
                  color: tab === t.id ? "#fff" : "var(--dash-muted)",
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "revenue" && (
            <div className="analytics-range" aria-label="Analytics date range">
              {[7, 30, 90].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={days === value ? "is-active" : ""}
                  onClick={() => setDays(value)}
                >
                  {value} days
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── GST Report Tab ── */}
      {tab === "gst" && (
        <section style={{ padding: "0 0 40px" }}>
          <GstReport />
        </section>
      )}

      {/* ── Revenue Tab ── */}
      {tab === "revenue" && (
        <>
          <section className="analytics-summary">
            <article>
              <span>Revenue in period</span>
              <strong>{isLoading ? "—" : money.format(totalRevenue)}</strong>
              <small>Paid orders across {days} days</small>
            </article>
            <article>
              <span>Completion rate</span>
              <strong>{isLoading ? "—" : `${report?.completion?.rate || 0}%`}</strong>
              <small>{report?.completion?.completed || 0} completed orders</small>
            </article>
            <article>
              <span>Best-performing dish</span>
              <strong className="analytics-summary-dish">
                {isLoading ? "—" : report?.topDishes?.[0]?.name || "No sales yet"}
              </strong>
              <small>
                {report?.topDishes?.[0]
                  ? money.format(report.topDishes[0].amount)
                  : "Revenue contribution"}
              </small>
            </article>
          </section>

          <section className="analytics-grid">
            <article className="analytics-card analytics-revenue-card">
              <div className="analytics-card-heading">
                <div><h2>Revenue rhythm</h2><p>Daily paid revenue</p></div>
              </div>
              <div className="analytics-bars">
                {revenue.map((item) => (
                  <Tooltip key={item.date} className="analytics-bar-col" content={`${item.date}: ${money.format(item.amount)}`} position="top">
                    <span style={{ height: `${Math.max(3, (item.amount / maxRevenue) * 100)}%` }} />
                    <small>{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: days > 30 ? undefined : "short" })}</small>
                  </Tooltip>
                ))}
              </div>
            </article>

            <article className="analytics-card">
              <div className="analytics-card-heading">
                <div><h2>Top dishes</h2><p>Ranked by revenue contribution</p></div>
              </div>
              <div className="analytics-ranking">
                {(report?.topDishes || []).map((dish, index) => (
                  <div key={dish.name}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <span><strong>{dish.name}</strong><i style={{ width: `${(dish.amount / Math.max(report.topDishes[0]?.amount || 1, 1)) * 100}%` }} /></span>
                    <em>{money.format(dish.amount)}</em>
                  </div>
                ))}
              </div>
            </article>

            <article className="analytics-card analytics-heat-card">
              <div className="analytics-card-heading">
                <div><h2>Peak service hours</h2><p>Order concentration by weekday and hour</p></div>
                <span className="analytics-heat-key">Quiet <i /> Busy</span>
              </div>
              <div className="analytics-heatmap">
                <span />
                {[0, 4, 8, 12, 16, 20].map((hour) => <small key={hour}>{hour}:00</small>)}
                {(report?.heatmap || []).map((row, day) => (
                  <div className="analytics-heat-row" key={day}>
                    <b>{dayLabels[day]}</b>
                    {row.map((count, hour) => (
                      <Tooltip key={hour} className="analytics-heat-col" content={`${dayLabels[day]} ${hour}:00 — ${count} orders`} position="top">
                        <i style={{ opacity: count ? 0.18 + (count / heatMax) * 0.82 : 0.06 }} />
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </article>

            <article className="analytics-card">
              <div className="analytics-card-heading">
                <div><h2>Payment mix</h2><p>Paid revenue by method</p></div>
              </div>
              <div className="analytics-payment">
                <div
                  className="analytics-donut"
                  style={{
                    background: `conic-gradient(${(report?.paymentSplit || []).map((item, index, list) => {
                      const before = list.slice(0, index).reduce((sum, entry) => sum + entry.amount, 0);
                      const start = paymentTotal ? (before / paymentTotal) * 100 : 0;
                      const end = paymentTotal ? ((before + item.amount) / paymentTotal) * 100 : 0;
                      return `${COLORS[index % COLORS.length]} ${start}% ${end}%`;
                    }).join(", ") || "#293341 0 100%"})`,
                  }}
                >
                  <span><strong>{report?.paymentSplit?.length || 0}</strong>methods</span>
                </div>
                <div className="analytics-payment-legend">
                  {(report?.paymentSplit || []).map((item, index) => (
                    <div key={item.method}>
                      <i style={{ background: COLORS[index % COLORS.length] }} />
                      <span>{item.method}</span>
                      <strong>{money.format(item.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </section>
        </>
      )}
    </main>
  );
};

export default Analytics;
