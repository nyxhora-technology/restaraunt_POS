import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getErrorMessage, getMyRestaurant, registerRestaurant, logout, validateReferralCode } from "../https";
import { removeUser, setRestaurant, setUser } from "../redux/slices/userSlice";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/images/logo.png";
import {
  HiOutlineOfficeBuilding,
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiArrowRight,
  HiArrowLeft,
  HiCheckCircle,
  HiClock,
  HiX,
  HiOutlineRefresh,
} from "react-icons/hi";

const STEPS = [
  { id: "basics",   label: "Restaurant Info", icon: HiOutlineOfficeBuilding },
  { id: "contact",  label: "Contact",          icon: HiOutlinePhone },
  { id: "details",  label: "Details",          icon: HiOutlineDocumentText },
];

const CURRENCIES = [
  { value: "INR", label: "₹ INR — India" },
  { value: "USD", label: "$ USD — United States" },
  { value: "EUR", label: "€ EUR — Europe" },
  { value: "GBP", label: "£ GBP — United Kingdom" },
  { value: "AUD", label: "$ AUD — Australia" },
];

const STATUS_CONFIG = {
  PENDING: {
    icon: HiClock,
    color: "#f6b100",
    bg: "rgba(246,177,0,.1)",
    border: "rgba(246,177,0,.25)",
    title: "Application under review",
    message: "We've received your restaurant details and they're being reviewed by our team. This usually takes less than 24 hours.",
    next: "You'll be able to access your workspace once approved.",
  },
  REJECTED: {
    icon: HiX,
    color: "#ef4444",
    bg: "rgba(239,68,68,.08)",
    border: "rgba(239,68,68,.2)",
    title: "Application not approved",
    message: null, // dynamic
    next: "You can edit your details and resubmit below.",
  },
  SUSPENDED: {
    icon: HiX,
    color: "#ef4444",
    bg: "rgba(239,68,68,.08)",
    border: "rgba(239,68,68,.2)",
    title: "Account suspended",
    message: "This restaurant account has been suspended. Please contact our support team for assistance.",
    next: null,
  },
};

export default function Onboarding() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useSelector((s) => s.user);
  const { email, name: userName, restaurant } = user;

  // Referral code from URL (?ref=xxx) — persist across step navigation
  const [referralCode] = useState(() => searchParams.get("ref") || "");

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: email || "",
    description: "",
    currency: "INR",
  });
  const [resubmit, setResubmit] = useState(false);

  // Validate referral code (public endpoint — no auth needed)
  const refValidation = useQuery({
    queryKey: ["referral-validate", referralCode],
    queryFn: () => validateReferralCode(referralCode),
    enabled: Boolean(referralCode),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const refData = refValidation.data?.data?.data;
  const refValid = refData?.valid === true;

  useEffect(() => { document.title = "Restro | Restaurant Setup"; }, []);

  // If approved, bounce to dashboard
  useEffect(() => {
    if (restaurant?.status === "APPROVED") navigate("/", { replace: true });
  }, [navigate, restaurant?.status]);

  // Poll status every 15 s while pending
  const statusQuery = useQuery({
    queryKey: ["my-restaurant-status"],
    queryFn: getMyRestaurant,
    enabled: Boolean(restaurant && restaurant.status === "PENDING"),
    refetchInterval: 15_000,
  });
  useEffect(() => {
    const latest = statusQuery.data?.data.data;
    if (!latest) return;
    dispatch(setRestaurant(latest));
    if (latest.status === "APPROVED") navigate("/", { replace: true });
  }, [dispatch, navigate, statusQuery.data]);

  const mutation = useMutation({
    mutationFn: registerRestaurant,
    onSuccess: ({ data }) => {
      dispatch(setRestaurant(data.data));
      dispatch(setUser({ ...user, role: "OWNER", restaurantId: data.data.id }));
      const msg = data.referralApplied
        ? "Restaurant submitted! Your referral bonus will be credited on approval."
        : "Restaurant submitted for approval!";
      enqueueSnackbar(msg, { variant: "success" });
      setResubmit(false);
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error, "Registration failed"), { variant: "error" }),
  });

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    dispatch(removeUser());
    navigate("/", { replace: true });
  };

  const update = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const canProceed = () => {
    if (step === 0) return formData.name.trim().length >= 2;
    if (step === 1) return formData.phone.trim() && formData.email.trim() && formData.city.trim() && formData.address.trim();
    return true;
  };

  // ── Status screen (restaurant already registered but not approved) ──────────
  if (restaurant && !resubmit) {
    const cfg = STATUS_CONFIG[restaurant.status];
    const StatusIcon = cfg?.icon ?? HiClock;
    const dynamicMessage = restaurant.status === "REJECTED"
      ? (restaurant.rejectionReason
          ? `Your application was not approved: ${restaurant.rejectionReason}`
          : "Your application was not approved. Please review your details and resubmit.")
      : cfg?.message;

    return (
      <main className="onboarding-shell">
        <Helmet>
          <title>{restaurant.status === "PENDING" ? "Application Under Review" : restaurant.status === "REJECTED" ? "Application Not Approved" : "Account Suspended"} — Restro</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <header className="onboarding-topbar">
          <a className="onboarding-brand" href="/"><img src={logo} alt="" /><span>Restro</span></a>
          <button className="onboarding-logout" onClick={handleLogout}>Sign out</button>
        </header>

        {restaurant.status === "PENDING" ? (
          /* ── Waiting Room ─────────────────────────────────────────────── */
          <div className="onboarding-waiting-room">
            <div className="onboarding-waiting-hero">
              <div className="onboarding-waiting-pulse">✅</div>
              <h1>Application submitted!</h1>
              <p className="onboarding-waiting-sub">
                We received <strong>{restaurant.name}</strong>&apos;s details and our team is reviewing them now.
              </p>
              <div className="onboarding-waiting-eta">
                <span className="onboarding-mini-spinner" />
                <strong>Usually approved within 2 hours</strong>
                <span>· We&apos;ll email you at {email}</span>
              </div>
            </div>

            {/* What happens next — reduces anxiety */}
            <div className="onboarding-waiting-timeline">
              <h2>What happens next</h2>
              <div className="onboarding-timeline-steps">
                <div className="onboarding-tl-step is-done">
                  <div className="onboarding-tl-dot">✓</div>
                  <div>
                    <strong>Application submitted</strong>
                    <p>Your restaurant details are in our system.</p>
                  </div>
                </div>
                <div className="onboarding-tl-step is-active">
                  <div className="onboarding-tl-dot is-pulse" />
                  <div>
                    <strong>Team review</strong>
                    <p>A Restro team member verifies your details. Usually under 2 hours.</p>
                  </div>
                </div>
                <div className="onboarding-tl-step">
                  <div className="onboarding-tl-dot" />
                  <div>
                    <strong>Workspace unlocked</strong>
                    <p>You&apos;ll be taken straight to your dashboard — no reload needed.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Things to do while waiting */}
            <div className="onboarding-waiting-tips">
              <h2>While you wait, you can plan</h2>
              <div className="onboarding-tips-grid">
                <div>
                  <span>📋</span>
                  <strong>Write your menu</strong>
                  <p>List your dishes, categories, and prices so you can add them on day one.</p>
                </div>
                <div>
                  <span>👥</span>
                  <strong>Tell your team</strong>
                  <p>Once approved, invite your cashier, waiter, and kitchen staff in 30 seconds.</p>
                </div>
                <div>
                  <span>📱</span>
                  <strong>Bookmark this page</strong>
                  <p>Open it on the tablet or device you&apos;ll use at the counter — it works everywhere.</p>
                </div>
              </div>
            </div>

            <p className="onboarding-waiting-footer">
              This page checks for approval every 15 seconds automatically.
              You&apos;ll be redirected the moment we approve — no action needed.
            </p>
          </div>
        ) : (
          /* ── Rejected / Suspended card ────────────────────────────────── */
          <div className="onboarding-status-card" style={{ "--status-color": cfg?.color, "--status-bg": cfg?.bg, "--status-border": cfg?.border }}>
            <div className="onboarding-status-icon">
              <StatusIcon />
            </div>
            <h1>{cfg?.title}</h1>
            <p className="onboarding-status-name">{restaurant.name}</p>
            <p className="onboarding-status-msg">{dynamicMessage}</p>
            {cfg?.next && <p className="onboarding-status-next">{cfg.next}</p>}

            {restaurant.status === "REJECTED" && (
              <button className="onboarding-resubmit-btn" onClick={() => { setResubmit(true); setStep(0); }}>
                <HiOutlineRefresh /> Edit &amp; resubmit
              </button>
            )}
          </div>
        )}
      </main>
    );
  }

  // ── Form wizard ─────────────────────────────────────────────────────────────
  return (
    <main className="onboarding-shell">
      <header className="onboarding-topbar">
        <a className="onboarding-brand" href="/"><img src={logo} alt="" /><span>Restro</span></a>
        <span className="onboarding-greeting">Welcome, {userName?.split(" ")[0] || "there"} 👋</span>
        <button className="onboarding-logout" onClick={handleLogout}>Sign out</button>
      </header>

      <div className="onboarding-layout">
        {/* Left sidebar */}
        <aside className="onboarding-sidebar">
          <div>
            <p className="onboarding-sidebar-label">Setting up</p>
            <h2 className="onboarding-sidebar-title">Your restaurant workspace</h2>
            <p className="onboarding-sidebar-sub">
              Fill in your restaurant details. After you submit, our team will review and approve your workspace — usually within 24 hours.
            </p>
          </div>
          <nav className="onboarding-steps-nav">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <button
                  key={s.id}
                  className={`onboarding-step-item ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                >
                  <span className="onboarding-step-num">
                    {done ? <HiCheckCircle /> : <Icon />}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="onboarding-sidebar-trust">
            <p><HiCheckCircle /> No hidden fees during setup</p>
            <p><HiCheckCircle /> Your data is fully encrypted</p>
            <p><HiCheckCircle /> Cancel or pause anytime</p>
          </div>
        </aside>

        {/* Form card */}
        <div className="onboarding-card">
          <div className="onboarding-progress">
            <div className="onboarding-progress-bar" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>

          {/* Referral Banner */}
          {refValid && (
            <div className="onboarding-referral-banner">
              <span>🎁</span>
              <div>
                <strong>You were referred by {refData.referredByName} ({refData.referredByRestaurant})</strong>
                <p>Get approved and earn <strong>+{refData.youGet} free days</strong>. They earn <strong>+{refData.theyGet} days</strong> too!</p>
              </div>
            </div>
          )}

          <div className="onboarding-step-header">
            <span className="onboarding-step-badge">Step {step + 1} of {STEPS.length}</span>
            <h2>{step === 0 ? "What's your restaurant called?" : step === 1 ? "How can customers reach you?" : "A little more about your restaurant"}</h2>
            <p>{step === 0 ? "This will be the name shown across your workspace." : step === 1 ? "We'll use these to set up your profile and send approval updates." : "Optional details that help customise your experience."}</p>
          </div>

          <form
            className="onboarding-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (step < STEPS.length - 1) { setStep((s) => s + 1); return; }
              mutation.mutate({
                ...formData,
                ...(referralCode ? { referralCode } : {}),
              });
            }}
          >
            {step === 0 && (
              <div className="onboarding-fields">
                <label className="onboarding-field">
                  <span><HiOutlineOfficeBuilding /> Restaurant Name</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. The Spice Garden"
                    autoFocus
                    required
                    minLength={2}
                  />
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="onboarding-fields">
                <label className="onboarding-field">
                  <span><HiOutlineLocationMarker /> Street Address</span>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="e.g. 42 MG Road"
                    autoFocus
                    required
                  />
                </label>
                <label className="onboarding-field">
                  <span><HiOutlineLocationMarker /> City</span>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="e.g. Bengaluru"
                    required
                  />
                </label>
                <label className="onboarding-field">
                  <span><HiOutlinePhone /> Restaurant Phone</span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    required
                  />
                </label>
                <label className="onboarding-field">
                  <span><HiOutlineMail /> Restaurant Email</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="e.g. hello@spicegarden.com"
                    required
                  />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="onboarding-fields">
                <label className="onboarding-field">
                  <span><HiOutlineCurrencyDollar /> Currency</span>
                  <select
                    value={formData.currency}
                    onChange={(e) => update("currency", e.target.value)}
                    className="onboarding-select"
                    required
                  >
                    {CURRENCIES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="onboarding-field">
                  <span><HiOutlineDocumentText /> Short Description <em>(optional)</em></span>
                  <textarea
                    value={formData.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="A few words about your restaurant — cuisine, vibe, speciality…"
                    rows={4}
                  />
                </label>
              </div>
            )}

            <div className="onboarding-actions">
              {step > 0 && (
                <button type="button" className="onboarding-back" onClick={() => setStep((s) => s - 1)}>
                  <HiArrowLeft /> Back
                </button>
              )}
              <button
                type="submit"
                className="onboarding-next"
                disabled={!canProceed() || mutation.isPending}
              >
                {mutation.isPending
                  ? "Submitting…"
                  : step < STEPS.length - 1
                    ? <><span>Continue</span> <HiArrowRight /></>
                    : <><span>Submit for approval</span> <HiArrowRight /></>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
