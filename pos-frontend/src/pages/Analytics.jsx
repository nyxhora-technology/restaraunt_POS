import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { MdArrowForward, MdInsights, MdLockOutline } from "react-icons/md";
import { getAnalytics } from "../https";
import useFeature from "../hooks/useFeature";

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

const AnalyticsLocked = () => (
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
      <button type="button" className="analytics-upgrade-button">
        Review Professional plan <MdArrowForward />
      </button>
      <small>Available to restaurant owners and managers.</small>
    </section>
  </main>
);

const Analytics = () => {
  const { hasAnalytics } = useFeature();
  const restaurant = useSelector((state) => state.user.restaurant);
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ["revenue-analytics", days],
    queryFn: () => getAnalytics(days),
    enabled: hasAnalytics,
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
      </header>

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
              <div key={item.date} title={`${item.date}: ${money.format(item.amount)}`}>
                <span style={{ height: `${Math.max(3, (item.amount / maxRevenue) * 100)}%` }} />
                <small>{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: days > 30 ? undefined : "short" })}</small>
              </div>
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
                  <i
                    key={hour}
                    title={`${dayLabels[day]} ${hour}:00 — ${count} orders`}
                    style={{ opacity: count ? 0.18 + (count / heatMax) * 0.82 : 0.06 }}
                  />
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
    </main>
  );
};

export default Analytics;
