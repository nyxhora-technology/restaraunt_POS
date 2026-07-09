import React from "react";

const Sparkline = ({ trend = 0, tone, data = [] }) => {
  let path = "";
  if (!data || data.length < 2) {
    const paths = {
      positive: "M2 30 C12 29 15 16 24 19 S36 34 46 24 S58 11 68 15 S80 19 92 4",
      negative: "M2 12 C12 17 17 7 26 16 S39 33 50 29 S63 18 73 21 S84 12 92 7",
      neutral:  "M2 24 C16 22 22 14 34 18 S51 29 63 20 S80 14 92 15",
    };
    const direction = trend > 0 ? "positive" : trend < 0 ? "negative" : "neutral";
    path = paths[direction];
  } else {
    const max = Math.max(...data) || 1;
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = 90 / (data.length - 1);
    
    path = data.map((d, i) => {
      const x = 2 + i * step;
      const y = 34 - ((d - min) / range) * 30;
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    }).join(" ");
  }

  const gradientId = `dashboard-sparkline-${tone}`;

  return (
    <svg
      className={`dashboard-sparkline tone-${tone}`}
      viewBox="0 0 94 38"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="dashboard-sparkline-fill"
        d={`${path} L92 38 L2 38 Z`}
        fill={`url(#${gradientId})`}
      />
      <path className="dashboard-sparkline-line" d={path} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const MiniCard = ({
  title,
  icon,
  number,
  prefix = "",
  footer,
  tone = "teal",
  trend,
  data = [],
  isLoading = false,
  hideTrend = false,
  onClick,
}) => {
  return (
    <article 
      className={`dashboard-metric-card ${onClick ? "is-clickable" : ""}`} 
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="dashboard-metric-header">
        <span className={`dashboard-metric-icon tone-${tone}`}>{icon}</span>
        <p>{title}</p>
      </div>

      {isLoading ? (
        /* Skeleton shimmer — perceived performance */
        <div className="dashboard-metric-skeleton" aria-hidden="true" />
      ) : (
        <div className="dashboard-metric-value">
          <div className="dashboard-metric-number-row">
            <h2>
              {prefix}
              {number}
            </h2>
            {!hideTrend && <Sparkline trend={trend} tone={tone} data={data} />}
          </div>
          {!hideTrend && (
            <div
              className={`dashboard-metric-trend ${
                trend > 0 ? "is-positive" : trend < 0 ? "is-negative" : ""
              }`}
            >
              {typeof trend === "number" && (
                <strong>
                  {trend > 0 ? "↑ " : trend < 0 ? "↓ " : ""}
                  {Math.abs(trend).toFixed(0)}%
                </strong>
              )}
              <span>{footer}</span>
            </div>
          )}
          {hideTrend && footer && (
            <div className="dashboard-metric-trend">
              <span>{footer}</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default MiniCard;
