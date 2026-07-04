import logo from "../../assets/images/logo.png";

const FullScreenLoader = () => (
  <div className="fullscreen-loader" role="status" aria-label="Loading your workspace…">
    {/* topbar rendered via ::before pseudo-element */}
    <div className="fullscreen-loader-body">
      <div className="fullscreen-loader-sidebar">
        <div style={{ width: "55%", height: 32, marginBottom: 8 }} />
        <div /><div /><div /><div /><div /><div />
      </div>
      <div className="fullscreen-loader-main">
        {/* Metric cards row */}
        <div className="fullscreen-loader-cards">
          <div className="fullscreen-loader-card" />
          <div className="fullscreen-loader-card" />
          <div className="fullscreen-loader-card" />
          <div className="fullscreen-loader-card" />
        </div>
        {/* Main content rows */}
        <div className="fullscreen-loader-row" />
        <div className="fullscreen-loader-row" style={{ height: 160 }} />
      </div>
    </div>
    {/* Branded centre logo */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        gap: 12,
      }}
    >
      <img
        src={logo}
        alt="Restro"
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          objectFit: "cover",
          opacity: 0.85,
          animation: "status-pulse 2s ease-in-out infinite",
        }}
      />
      <span
        style={{
          color: "rgba(255,255,255,.35)",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Getting your restaurant ready…
      </span>
    </div>
  </div>
);

export default FullScreenLoader;