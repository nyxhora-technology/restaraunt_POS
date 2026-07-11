import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import {
  MdOutlineAdminPanelSettings,
  MdOutlineRestaurant,
  MdOutlineSecurity,
  MdCheck,
  MdOutlineStorefront,
  MdOutlineEmail,
  MdOutlinePhone,
  MdOutlineLocationOn,
  MdOutlineLink,
  MdOutlineDescription,
  MdOutlinePayment,
  MdLockOutline,
  MdOutlineVisibility,
  MdOutlineVisibilityOff,
  MdOutlineVerified,
  MdOutlineWarningAmber,
  MdOutlineCardGiftcard,
  MdContentCopy,
  MdShare,
  MdOpenInNew,
  MdOutlineAccessTime,
  MdRocketLaunch,
  MdArrowForward,
  MdCheckCircle,
  MdOutlineReceipt,
  MdAdd,
  MdEdit,
  MdDelete,
  MdRefresh,
  MdDevices,
  MdLogout,
} from "react-icons/md";
import {
  changePassword,
  getErrorMessage,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  updateMyRestaurant,
  getMyReferrals,
  getOrderUsage,
  getTaxGroups,
  getStatePresets,
  createTaxGroup,
  updateTaxGroup,
  deleteTaxGroup,
  seedDefaultTaxGroups,
} from "../https";
import { setRestaurant } from "../redux/slices/userSlice";
import useDashboardPreferences from "../hooks/useDashboardPreferences";
import useRole from "../hooks/useRole";
import useFeature from "../hooks/useFeature";
import CustomSelect from "../components/shared/CustomSelect";
import UpgradeModal from "../components/shared/UpgradeModal";

const CURRENCIES = [
  {
    code: "INR",
    label: "INR",
    sublabel: "Indian Rupee",
    symbol: "Rs",
    region: "India",
  },
  {
    code: "USD",
    label: "USD",
    sublabel: "US Dollar",
    symbol: "$",
    region: "United States",
  },
  {
    code: "EUR",
    label: "EUR",
    sublabel: "Euro",
    symbol: "EUR",
    region: "Eurozone",
  },
  {
    code: "GBP",
    label: "GBP",
    sublabel: "British Pound",
    symbol: "GBP",
    region: "United Kingdom",
  },
  {
    code: "AUD",
    label: "AUD",
    sublabel: "Australian Dollar",
    symbol: "$",
    region: "Australia",
  },
];

const FieldIcon = ({ icon: Icon }) => (
  <span className="settings-field-icon">
    <Icon />
  </span>
);

const PasswordField = ({ label, name, value, onChange, placeholder }) => {
  const [visible, setVisible] = useState(false);
  return (
    <label className="settings-field-group">
      <span className="settings-field-label">{label}</span>
      <div className="settings-field-wrap">
        <FieldIcon icon={MdLockOutline} />
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          minLength="8"
          required
          className="settings-field-input"
          autoComplete="new-password"
        />
        <button
          type="button"
          className="settings-field-eye"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <MdOutlineVisibilityOff /> : <MdOutlineVisibility />}
        </button>
      </div>
    </label>
  );
};

const formatSessionDate = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSessionDeviceDetails = (userAgent = "") => {
  const ua = userAgent.toLowerCase();
  const browser =
    ua.includes("edg/")
      ? "Edge"
      : ua.includes("chrome/")
        ? "Chrome"
        : ua.includes("firefox/")
          ? "Firefox"
          : ua.includes("safari/")
            ? "Safari"
            : "Unknown browser";
  const os =
    ua.includes("windows")
      ? "Windows"
      : ua.includes("android")
        ? "Android"
        : ua.includes("iphone") || ua.includes("ipad")
          ? "iOS"
          : ua.includes("mac os")
            ? "macOS"
            : ua.includes("linux")
              ? "Linux"
              : "Unknown OS";
  const device =
    ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")
      ? "Mobile"
      : ua.includes("ipad") || ua.includes("tablet")
        ? "Tablet"
        : ua
          ? "Desktop"
          : "Unknown device";
  return { browser, os, device, label: `${browser} on ${os}` };
};

const maskSessionId = (id = "") =>
  id ? `${id.slice(0, 8)}...${id.slice(-4)}` : "Unknown";

const Settings = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const { theme } = useDashboardPreferences();
  const { isOwner, hasRole } = useRole();
  const canEditRestaurant = isOwner && user.restaurant?.status === "APPROVED";
  const canManageTaxes =
    hasRole("OWNER", "MANAGER") && user.restaurant?.status === "APPROVED";
  const [activeSection, setActiveSection] = useState(
    canEditRestaurant ? "restaurant" : "account",
  );

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [restaurant, setRestaurantForm] = useState({
    name: user.restaurant?.name || "",
    address: user.restaurant?.address || "",
    city: user.restaurant?.city || "",
    phone: user.restaurant?.phone || "",
    email: user.restaurant?.email || "",
    description: user.restaurant?.description || "",
    logo: user.restaurant?.logo || "",
    currency: user.restaurant?.currency || "INR",
    timezone: user.restaurant?.timezone || "Asia/Kolkata",
    gstin: user.restaurant?.gstin || "",
    stateCode: user.restaurant?.stateCode || "",
  });

  // Sync form when redux restaurant updates (e.g. after save)
  useEffect(() => {
    if (user.restaurant) {
      setRestaurantForm({
        name: user.restaurant.name || "",
        address: user.restaurant.address || "",
        city: user.restaurant.city || "",
        phone: user.restaurant.phone || "",
        email: user.restaurant.email || "",
        description: user.restaurant.description || "",
        logo: user.restaurant.logo || "",
        currency: user.restaurant.currency || "INR",
        timezone: user.restaurant.timezone || "Asia/Kolkata",
        gstin: user.restaurant.gstin || "",
        stateCode: user.restaurant.stateCode || "",
      });
    }
  }, [user.restaurant]);

  useEffect(() => {
    document.title = "Settings | POS";
    document.documentElement.style.colorScheme = theme;
    return () => {
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, [theme]);

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      enqueueSnackbar("Password changed successfully", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error, "Password change failed"), {
        variant: "error",
      }),
  });

  const restaurantMutation = useMutation({
    mutationFn: updateMyRestaurant,
    onSuccess: ({ data }) => {
      dispatch(setRestaurant(data.data));
      enqueueSnackbar("Restaurant profile saved", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const handlePasswordChange = (name, value) =>
    setPassword((prev) => ({ ...prev, [name]: value }));

  const updatePassword = (e) => {
    e.preventDefault();
    if (password.newPassword !== password.confirmPassword) {
      enqueueSnackbar("New passwords do not match", { variant: "warning" });
      return;
    }
    passwordMutation.mutate({
      currentPassword: password.currentPassword,
      newPassword: password.newPassword,
      revokeOtherSessions: true,
    });
  };

  const selectedCurrency =
    CURRENCIES.find((c) => c.code === restaurant.currency) || CURRENCIES[0];

  const statusColors = {
    APPROVED: {
      bg: "var(--dash-primary-soft)",
      color: "var(--dash-primary-strong)",
      dot: "var(--dash-primary)",
    },
    PENDING: { bg: "#fff7e6", color: "#b45309", dot: "#f59e0b" },
    REJECTED: { bg: "#fef2f2", color: "#b91c1c", dot: "#ef4444" },
  };

  const restaurantStatus = user.restaurant?.status || "PENDING";
  const statusStyle = statusColors[restaurantStatus] || statusColors.PENDING;

  return (
    <section className={`dashboard-shell theme-${theme} settings-page`}>
      <div className="settings-page-header">
        <div className="settings-page-header-left">
          <span className="settings-page-eyebrow">
            {isOwner ? "Workspace" : "Account"} / Settings
          </span>
          <h1 className="settings-page-title">Settings</h1>
          <p className="settings-page-subtitle">
            {isOwner
              ? "Manage your account security and restaurant profile."
              : "Manage your account security and password."}
          </p>
        </div>

        <div className="settings-id-card">
          <div className="settings-id-avatar">
            {(user.name || user.email || "U").trim().charAt(0).toUpperCase()}
          </div>
          <div className="settings-id-info">
            <strong>{user.name || user.email}</strong>
            <span>{user.email}</span>
            <div className="settings-id-badge">{user.role}</div>
          </div>
        </div>
      </div>

      {isOwner && user.restaurant && (
        <PlanStatusBanner restaurant={user.restaurant} user={user} statusStyle={statusStyle} restaurantStatus={restaurantStatus} />
      )}

      <div className="settings-workspace-layout">
        <aside className="settings-section-nav" aria-label="Settings sections">
          <p className="settings-section-nav-label">Settings menu</p>
          {canEditRestaurant && (
            <>
              <button
                type="button"
                className={`settings-section-nav-link ${activeSection === "restaurant" ? "is-active" : ""}`}
                onClick={() => setActiveSection("restaurant")}
              >
                <MdOutlineRestaurant />
                <span><strong>Restaurant</strong><small>Profile & preferences</small></span>
              </button>
            </>
          )}
          {canManageTaxes && (
            <button
              type="button"
              className={`settings-section-nav-link ${activeSection === "taxes" ? "is-active" : ""}`}
              onClick={() => setActiveSection("taxes")}
            >
              <MdOutlineReceipt />
              <span><strong>Taxes</strong><small>Rates & defaults</small></span>
            </button>
          )}
          <button
            type="button"
            className={`settings-section-nav-link ${activeSection === "account" ? "is-active" : ""}`}
            onClick={() => setActiveSection("account")}
          >
            <MdOutlineSecurity />
            <span><strong>Account</strong><small>Password & sign-in</small></span>
          </button>
          {canEditRestaurant && (
            <>
              <button
                type="button"
                className={`settings-section-nav-link ${activeSection === "plan" ? "is-active" : ""}`}
                onClick={() => setActiveSection("plan")}
              >
                <MdRocketLaunch />
                <span><strong>Plan</strong><small>Usage & limits</small></span>
              </button>
              <button
                type="button"
                className={`settings-section-nav-link ${activeSection === "referrals" ? "is-active" : ""}`}
                onClick={() => setActiveSection("referrals")}
              >
                <MdOutlineCardGiftcard />
                <span><strong>Referrals</strong><small>Rewards & activity</small></span>
              </button>
            </>
          )}
        </aside>

        <main
          className="settings-cards-grid one-col settings-section-content"
        >
        <div className={`settings-card ${activeSection !== "account" ? "settings-section-hidden" : ""}`} id="account-security">
          <div className="settings-card-header">
            <div className="settings-card-icon-wrap security">
              <MdOutlineSecurity />
            </div>
            <div>
              <h2>Account Security</h2>
              <p>Change your login password</p>
            </div>
          </div>

          <form onSubmit={updatePassword} className="settings-card-body">
            <div className="settings-info-row">
              <MdOutlineEmail />
              <span>{user.email}</span>
              <span className="settings-readonly-badge">
                Login email / read-only
              </span>
            </div>

            <div className="settings-divider" />

            <PasswordField
              label="Current Password"
              name="currentPassword"
              value={password.currentPassword}
              onChange={handlePasswordChange}
              placeholder="Enter current password"
            />
            <PasswordField
              label="New Password"
              name="newPassword"
              value={password.newPassword}
              onChange={handlePasswordChange}
              placeholder="Min. 8 characters"
            />
            <PasswordField
              label="Confirm New Password"
              name="confirmPassword"
              value={password.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Repeat new password"
            />

            <div className="settings-security-note">
              <MdOutlineWarningAmber />
              All other active sessions will be signed out after password
              change.
            </div>

            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="settings-save-button"
            >
              {passwordMutation.isPending ? (
                <span className="settings-spinner" />
              ) : (
                <MdCheck />
              )}
              {passwordMutation.isPending ? "Updating..." : "Update Password"}
            </button>

            <AccountSessions />
          </form>
        </div>

        {canEditRestaurant && (
          <div className={`settings-card ${activeSection !== "restaurant" ? "settings-section-hidden" : ""}`} id="restaurant-profile">
            <div className="settings-card-header">
              <div className="settings-card-icon-wrap restaurant">
                <MdOutlineRestaurant />
              </div>
              <div>
                <h2>Restaurant Profile</h2>
                <p>Public details and billing settings</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                restaurantMutation.mutate({
                  ...restaurant,
                  logo: restaurant.logo || undefined,
                  description: restaurant.description || undefined,
                });
              }}
              className="settings-card-body"
            >
              <div className="settings-field-row">
                <label className="settings-field-group">
                  <span className="settings-field-label">Restaurant Name</span>
                  <div className="settings-field-wrap">
                    <FieldIcon icon={MdOutlineStorefront} />
                    <input
                      value={restaurant.name}
                      onChange={(e) =>
                        setRestaurantForm({
                          ...restaurant,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g. Spice Garden"
                      required
                      className="settings-field-input"
                    />
                  </div>
                </label>
                <label className="settings-field-group">
                  <span className="settings-field-label">City</span>
                  <div className="settings-field-wrap">
                    <FieldIcon icon={MdOutlineLocationOn} />
                    <input
                      value={restaurant.city}
                      onChange={(e) =>
                        setRestaurantForm({
                          ...restaurant,
                          city: e.target.value,
                        })
                      }
                      placeholder="e.g. Mumbai"
                      required
                      className="settings-field-input"
                    />
                  </div>
                </label>
              </div>

              <label className="settings-field-group">
                <span className="settings-field-label">Address</span>
                <div className="settings-field-wrap">
                  <FieldIcon icon={MdOutlineLocationOn} />
                  <input
                    value={restaurant.address}
                    onChange={(e) =>
                      setRestaurantForm({
                        ...restaurant,
                        address: e.target.value,
                      })
                    }
                    placeholder="Street, Building, Area"
                    required
                    className="settings-field-input"
                  />
                </div>
              </label>

              <div className="settings-field-row">
                <label className="settings-field-group">
                  <span className="settings-field-label">Contact Phone</span>
                  <div className="settings-field-wrap">
                    <FieldIcon icon={MdOutlinePhone} />
                    <input
                      value={restaurant.phone}
                      onChange={(e) =>
                        setRestaurantForm({
                          ...restaurant,
                          phone: e.target.value,
                        })
                      }
                      placeholder="+91 98765 43210"
                      required
                      className="settings-field-input"
                    />
                  </div>
                </label>
                <label className="settings-field-group">
                  <span className="settings-field-label">Contact Email</span>
                  <div className="settings-field-wrap">
                    <FieldIcon icon={MdOutlineEmail} />
                    <input
                      type="email"
                      value={restaurant.email}
                      onChange={(e) =>
                        setRestaurantForm({
                          ...restaurant,
                          email: e.target.value,
                        })
                      }
                      placeholder="contact@restaurant.com"
                      required
                      className="settings-field-input"
                    />
                  </div>
                </label>
              </div>

              <label className="settings-field-group">
                <span className="settings-field-label">
                  Logo URL <em className="settings-optional">(optional)</em>
                </span>
                <div className="settings-field-wrap">
                  <FieldIcon icon={MdOutlineLink} />
                  <input
                    type="url"
                    value={restaurant.logo}
                    onChange={(e) =>
                      setRestaurantForm({ ...restaurant, logo: e.target.value })
                    }
                    placeholder="https://example.com/logo.png"
                    className="settings-field-input"
                  />
                </div>
              </label>

              <label className="settings-field-group">
                <span className="settings-field-label">
                  Description <em className="settings-optional">(optional)</em>
                </span>
                <div className="settings-field-wrap settings-field-wrap--textarea">
                  <FieldIcon icon={MdOutlineDescription} />
                  <textarea
                    value={restaurant.description}
                    onChange={(e) =>
                      setRestaurantForm({
                        ...restaurant,
                        description: e.target.value,
                      })
                    }
                    placeholder="Tell guests about your restaurant..."
                    rows={3}
                    className="settings-field-input settings-field-textarea"
                  />
                </div>
              </label>

              <div className="settings-field-group">
                <span className="settings-field-label">
                  <MdOutlinePayment
                    style={{
                      display: "inline",
                      marginRight: 5,
                      verticalAlign: "middle",
                    }}
                  />
                  Billing Currency
                </span>
                <div className="settings-currency-grid">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      className={`settings-currency-option ${restaurant.currency === c.code ? "is-selected" : ""}`}
                      onClick={() =>
                        setRestaurantForm({ ...restaurant, currency: c.code })
                      }
                    >
                      <span className="settings-currency-symbol">
                        {c.symbol}
                      </span>
                      <span className="settings-currency-code">{c.code}</span>
                      <span className="settings-currency-name">
                        {c.sublabel}
                      </span>
                      <span className="settings-currency-region">
                        {c.region}
                      </span>
                      {restaurant.currency === c.code && (
                        <MdCheck className="settings-currency-check" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="settings-currency-hint">
                  Currently using{" "}
                  <strong>
                    {selectedCurrency.code} ({selectedCurrency.symbol})
                  </strong>
                  . Affects all revenue displays across the dashboard.
                </p>
              </div>

              <div className="settings-field-group">
                <span className="settings-field-label">
                  <MdOutlineAccessTime
                    style={{
                      display: "inline",
                      marginRight: 5,
                      verticalAlign: "middle",
                    }}
                  />
                  Operating Timezone
                </span>
                <div className="settings-field-wrap" style={{ overflow: "visible" }}>
                  <FieldIcon icon={MdOutlineAccessTime} />
                  <CustomSelect
                    value={restaurant.timezone}
                    onChange={(e) => setRestaurantForm({ ...restaurant, timezone: e.target.value })}
                    name="timezone"
                    buttonClassName="settings-field-input cursor-pointer flex items-center justify-between w-full"
                    searchable={true}
                    options={(() => {
                      const tzs = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ["UTC", "Asia/Kolkata", "America/New_York", "Europe/London"];
                      if (!tzs.includes("Asia/Kolkata")) tzs.push("Asia/Kolkata");
                      return tzs.sort().map(tz => ({ label: tz, value: tz }));
                    })()}
                  />
                </div>
                <p className="settings-currency-hint">
                  Affects the &quot;Today&apos;s Orders&quot; reset time and analytics
                  boundaries.
                </p>
              </div>

              {/* GST Filing Details */}
              <div className="settings-field-group">
                <span className="settings-field-label">
                  GSTIN <small style={{ fontWeight: 400, color: "var(--dash-muted)" }}>(for GSTR-1 export)</small>
                </span>
                <div className="settings-field-wrap">
                  <input
                    className="settings-field-input"
                    value={restaurant.gstin}
                    onChange={(e) => setRestaurantForm({ ...restaurant, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 27AABCU9603R1ZX"
                    maxLength={15}
                    style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
                  />
                </div>
                <p className="settings-currency-hint">15-character GST Identification Number. Required to download GSTR-1 JSON.</p>
              </div>

              <div className="settings-field-group">
                <span className="settings-field-label">
                  State Code <small style={{ fontWeight: 400, color: "var(--dash-muted)" }}>(for GSTR-1 export)</small>
                </span>
                <div className="settings-field-wrap" style={{ overflow: "visible", zIndex: 10 }}>
                  <CustomSelect
                    value={restaurant.stateCode}
                    onChange={(e) => setRestaurantForm({ ...restaurant, stateCode: e.target.value })}
                    name="stateCode"
                    searchable={true}
                    buttonClassName="settings-field-input cursor-pointer flex items-center justify-between w-full"
                    options={[
                      { value: "", label: "Select your state" },
                      { value: "01", label: "01 – Jammu and Kashmir" },
                      { value: "02", label: "02 – Himachal Pradesh" },
                      { value: "03", label: "03 – Punjab" },
                      { value: "04", label: "04 – Chandigarh" },
                      { value: "05", label: "05 – Uttarakhand" },
                      { value: "06", label: "06 – Haryana" },
                      { value: "07", label: "07 – Delhi" },
                      { value: "08", label: "08 – Rajasthan" },
                      { value: "09", label: "09 – Uttar Pradesh" },
                      { value: "10", label: "10 – Bihar" },
                      { value: "11", label: "11 – Sikkim" },
                      { value: "12", label: "12 – Arunachal Pradesh" },
                      { value: "13", label: "13 – Nagaland" },
                      { value: "14", label: "14 – Manipur" },
                      { value: "15", label: "15 – Mizoram" },
                      { value: "16", label: "16 – Tripura" },
                      { value: "17", label: "17 – Meghalaya" },
                      { value: "18", label: "18 – Assam" },
                      { value: "19", label: "19 – West Bengal" },
                      { value: "20", label: "20 – Jharkhand" },
                      { value: "21", label: "21 – Odisha" },
                      { value: "22", label: "22 – Chhattisgarh" },
                      { value: "23", label: "23 – Madhya Pradesh" },
                      { value: "24", label: "24 – Gujarat" },
                      { value: "26", label: "26 – Dadra and Nagar Haveli and Daman and Diu" },
                      { value: "27", label: "27 – Maharashtra" },
                      { value: "28", label: "28 – Andhra Pradesh (old)" },
                      { value: "29", label: "29 – Karnataka" },
                      { value: "30", label: "30 – Goa" },
                      { value: "31", label: "31 – Lakshadweep" },
                      { value: "32", label: "32 – Kerala" },
                      { value: "33", label: "33 – Tamil Nadu" },
                      { value: "34", label: "34 – Puducherry" },
                      { value: "35", label: "35 – Andaman and Nicobar Islands" },
                      { value: "36", label: "36 – Telangana" },
                      { value: "37", label: "37 – Andhra Pradesh" },
                      { value: "38", label: "38 – Ladakh" },
                    ]}
                  />
                </div>
                <p className="settings-currency-hint">Used as Place of Supply (POS) in GSTR-1 b2cs table.</p>
              </div>

              <button
                type="submit"
                disabled={restaurantMutation.isPending}
                className="settings-save-button"
              >
                {restaurantMutation.isPending ? (
                  <span className="settings-spinner" />
                ) : (
                  <MdCheck />
                )}
                {restaurantMutation.isPending
                  ? "Saving..."
                  : "Save Restaurant Profile"}
              </button>
            </form>
          </div>
        )}
        {canEditRestaurant && <ReferralCard isActive={activeSection === "referrals"} />}
        {canEditRestaurant && <PlanCard isActive={activeSection === "plan"} />}
        {canManageTaxes && (
          <TaxSettings isActive={activeSection === "taxes"} />
        )}
        </main>
      </div>
    </section>
  );
};

const ReferralCard = ({ isActive }) => {
  const [copied, setCopied] = useState(false);
  const { data: refRes, isLoading } = useQuery({
    queryKey: ["my-referrals"],
    queryFn: getMyReferrals,
    staleTime: 0, // always refetch on mount so lazy-generated code is picked up
  });
  const ref = refRes?.data?.data;

  const copyLink = () => {
    if (!ref?.referralLink) return;
    navigator.clipboard.writeText(ref.referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const share = () => {
    if (!ref?.referralLink) return;
    if (navigator.share) {
      navigator
        .share({
          title: "Join me on Restro POS",
          text: "Sign up through my referral link and get bonus free days!",
          url: ref.referralLink,
        })
        .catch(() => {});
    } else {
      copyLink();
      enqueueSnackbar("Link copied to clipboard!", { variant: "info" });
    }
  };

  const statusBadge = (status) => {
    const map = {
      PENDING: {
        label: "Pending",
        color: "#f59e0b",
        bg: "rgba(245,158,11,0.12)",
      },
      COMPLETED: {
        label: "Completed",
        color: "#10b981",
        bg: "rgba(16,185,129,0.12)",
      },
      EXPIRED: {
        label: "Expired",
        color: "#6b7280",
        bg: "rgba(107,114,128,0.12)",
      },
    };
    const s = map[status] || map.PENDING;
    return (
      <span
        style={{
          background: s.bg,
          color: s.color,
          fontSize: 11,
          fontWeight: 750,
          padding: "2px 8px",
          borderRadius: 999,
          whiteSpace: "nowrap",
        }}
      >
        {s.label}
      </span>
    );
  };

  return (
    <div className={`settings-card settings-card--span ${!isActive ? "settings-section-hidden" : ""}`} id="referral-program">
      <div className="settings-card-header">
        <div className="settings-card-icon-wrap referral">
          <MdOutlineCardGiftcard />
        </div>
        <div>
          <h2>Referral Program</h2>
          <p>Each restaurant you refer earns you both free days - that&apos;s real value back in your account</p>
        </div>
      </div>

      <div className="settings-card-body">
        {isLoading ? (
          <div className="settings-referral-loading">
            Loading referral data...
          </div>
        ) : !ref?.active ? (
          <div className="settings-referral-inactive">
            <MdOutlineCardGiftcard />
            <p>{ref?.message || "Referral program unlocks after approval."}</p>
          </div>
        ) : (
          <>
            {/* Rewards summary */}
            <div className="settings-referral-rewards">
              <div className="settings-referral-reward-pill you">
                <span className="reward-icon">
                  <MdOutlineVerified />
                </span>
                <div>
                  <strong>+{ref.rewardsPerReferral.youGet} days</strong>
                  <span>You earn per referral</span>
                </div>
              </div>
              <div className="settings-referral-reward-divider">+</div>
              <div className="settings-referral-reward-pill they">
                <span className="reward-icon">
                  <MdOutlineCardGiftcard />
                </span>
                <div>
                  <strong>+{ref.rewardsPerReferral.theyGet} days</strong>
                  <span>They earn on signup</span>
                </div>
              </div>
              <div className="settings-referral-reward-divider">=</div>
              <div className="settings-referral-reward-pill total">
                <span className="reward-icon">
                  <MdOutlinePayment />
                </span>
                <div>
                  <strong>{ref.creditDays} days</strong>
                  <span>Total credit earned</span>
                </div>
              </div>
            </div>

            {/* Referral link */}
            <div className="settings-field-group">
              <span className="settings-field-label">Your Referral Link</span>
              <div className="settings-referral-link-row">
                <div className="settings-referral-link-box">
                  <MdOpenInNew />
                  <span>{ref.referralLink}</span>
                </div>
                <button
                  type="button"
                  className={`settings-referral-copy-btn ${copied ? "is-copied" : ""}`}
                  onClick={copyLink}
                >
                  <MdContentCopy />
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  type="button"
                  className="settings-referral-share-btn"
                  onClick={share}
                >
                  <MdShare />
                  Share
                </button>
              </div>
              <p className="settings-currency-hint">
                Code: <strong>{ref.referralCode}</strong> / Links expire 90 days
                after a restaurant signs up (not after code generation).
              </p>
            </div>

            {/* Stats */}
            <div className="settings-referral-stats">
              <div className="settings-referral-stat">
                <strong>{ref.pending}</strong>
                <span>Pending</span>
              </div>
              <div className="settings-referral-stat">
                <strong>{ref.completed}</strong>
                <span>Approved</span>
              </div>
              <div className="settings-referral-stat is-accent">
                <strong>{ref.creditDays}</strong>
                <span>Days earned</span>
              </div>
            </div>

            {/* History */}
            {ref.referrals.length > 0 && (
              <div className="settings-referral-history">
                <p className="settings-field-label" style={{ marginBottom: 8 }}>
                  Referral History
                </p>
                <div className="settings-referral-table-wrap">
                  <table className="settings-referral-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Signed up</th>
                        <th>Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ref.referrals.map((r) => (
                        <tr key={r.id}>
                          <td>{r.refereeName}</td>
                          <td className="settings-ref-email">
                            {r.refereeEmail}
                          </td>
                          <td>{statusBadge(r.status)}</td>
                          <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td
                            style={{
                              color:
                                new Date(r.expiresAt) < new Date()
                                  ? "var(--dash-danger)"
                                  : "var(--dash-muted)",
                            }}
                          >
                            {new Date(r.expiresAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const AccountSessions = () => {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: listSessions,
    staleTime: 30_000,
  });

  const sessions = Array.isArray(sessionsQuery.data?.data?.data)
    ? sessionsQuery.data.data.data
    : [];
  const otherSessionsCount = sessions.filter(
    (session) => !session.isCurrent,
  ).length;

  const refreshSessions = () => {
    queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
  };

  const revokeOneMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      enqueueSnackbar("Session revoked", { variant: "success" });
      refreshSessions();
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error, "Could not revoke session"), {
        variant: "error",
      }),
  });

  const revokeOtherMutation = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: () => {
      enqueueSnackbar("Other sessions revoked", { variant: "success" });
      refreshSessions();
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error, "Could not revoke other sessions"), {
        variant: "error",
      }),
  });

  const sessionErrorMessage = sessionsQuery.error
    ? getErrorMessage(
        sessionsQuery.error,
        "Session list needs a fresh login. Sign in again to manage sessions.",
      )
    : "";

  return (
    <div className="settings-session-panel">
      <div className="settings-session-panel-header">
        <div>
          <p className="settings-session-eyebrow">Active sessions</p>
          <h3>Signed-in devices</h3>
          <span>
            Review where your account is active and revoke anything you do not
            recognize.
          </span>
        </div>
        <div className="settings-session-header-actions">
          <button
            type="button"
            className="settings-session-secondary-btn"
            onClick={refreshSessions}
            disabled={sessionsQuery.isFetching}
          >
            <MdRefresh /> Refresh
          </button>
          <button
            type="button"
            className="settings-session-danger-btn"
            onClick={() => revokeOtherMutation.mutate()}
            disabled={revokeOtherMutation.isPending || otherSessionsCount === 0}
          >
            <MdLogout /> Revoke others
          </button>
        </div>
      </div>

      {sessionsQuery.isLoading ? (
        <div className="settings-session-loading">
          <span className="settings-spinner" /> Loading sessions...
        </div>
      ) : sessionsQuery.error ? (
        <div className="settings-session-error">
          <MdOutlineWarningAmber />
          <span>{sessionErrorMessage}</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="settings-session-empty">
          <MdDevices />
          <span>No active sessions found.</span>
        </div>
      ) : (
        <div className="settings-session-list">
          {sessions.map((session) => {
            const isCurrent = Boolean(session.isCurrent);
            const details = getSessionDeviceDetails(session.userAgent);
            return (
              <div
                key={session.id || session.token}
                className={`settings-session-row ${isCurrent ? "is-current" : ""}`}
              >
                <div className="settings-session-device-icon">
                  <MdDevices />
                </div>
                <div className="settings-session-main">
                  <div className="settings-session-title-row">
                    <strong>{details.label}</strong>
                    {isCurrent && (
                      <span className="settings-session-current-badge">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="settings-session-detail-grid">
                    <span><strong>Session</strong>{maskSessionId(session.id)}</span>
                    <span><strong>IP</strong>{session.ipAddress || "Unknown"}</span>
                    <span><strong>Location</strong>Not stored</span>
                    <span><strong>Browser</strong>{details.browser}</span>
                    <span><strong>Device</strong>{details.device}</span>
                    <span><strong>OS</strong>{details.os}</span>
                    <span><strong>Created</strong>{formatSessionDate(session.createdAt)}</span>
                    <span><strong>Last seen</strong>{formatSessionDate(session.updatedAt)}</span>
                    <span><strong>Expires</strong>{formatSessionDate(session.expiresAt)}</span>
                  </div>
                  {session.userAgent && (
                    <p className="settings-session-user-agent">
                      {session.userAgent}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="settings-session-revoke-btn"
                  onClick={() => revokeOneMutation.mutate(session.id)}
                  disabled={
                    isCurrent ||
                    revokeOneMutation.isPending
                  }
                  title={
                    isCurrent
                      ? "Use sign out to end your current session"
                      : "Revoke this session"
                  }
                >
                  <MdLogout /> Revoke
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Settings;

/* â”€â”€â”€ PlanStatusBanner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const PlanStatusBanner = ({ restaurant, statusStyle, restaurantStatus }) => {
  const user = useSelector((s) => s.user);
  const { plan, planLabel, planColor } = useFeature();
  const [modalOpen, setModalOpen] = useState(false);
  const isStarter = plan === "STARTER";

  const { data: usageData } = useQuery({
    queryKey: ["order-usage", user.restaurantId],
    queryFn: getOrderUsage,
    enabled: Boolean(user.restaurantId) && isStarter,
    staleTime: 60_000,
  });
  const usage = usageData?.data?.data;

  return (
    <>
      <div
        className="settings-status-banner settings-status-banner--rich"
        style={{ background: statusStyle.bg, color: statusStyle.color }}
      >
        <span className="settings-status-dot" style={{ background: statusStyle.dot }} />
        <MdOutlineAdminPanelSettings />
        <div className="settings-status-main">
          <strong>{restaurant.name}</strong>
          <span>
            {restaurantStatus}
            {" Â· "}
            <span
              className="settings-plan-badge"
              style={{ background: `${planColor}22`, color: planColor, border: `1px solid ${planColor}44` }}
            >
              {planLabel}
            </span>
            {usage && !usage.unlimited && (
              <span className="settings-plan-usage-inline">
                {" Â· "}{usage.ordersThisMonth}/{usage.limit} orders this month
              </span>
            )}
          </span>
        </div>
        <div className="settings-status-right">
          {restaurantStatus === "APPROVED" ? (
            <MdOutlineVerified className="settings-status-badge-icon" />
          ) : (
            <MdOutlineWarningAmber className="settings-status-badge-icon" />
          )}
          {isStarter && restaurantStatus === "APPROVED" && (
            <button
              type="button"
              className="settings-status-upgrade-cta"
              onClick={() => setModalOpen(true)}
            >
              <MdRocketLaunch /> Upgrade <MdArrowForward />
            </button>
          )}
        </div>
      </div>
      {usage && !usage.unlimited && (
        <div className="settings-plan-usage-bar-wrap">
          <div className="settings-plan-usage-track">
            <div
              className="settings-plan-usage-fill"
              style={{
                width: `${Math.min(usage.percentage, 100)}%`,
                background: usage.percentage >= 90 ? "#ef4444" : usage.percentage >= 70 ? "#eab308" : "var(--dash-primary)",
              }}
            />
          </div>
          <span className="settings-plan-usage-pct">{usage.percentage}%</span>
        </div>
      )}
      {modalOpen && <UpgradeModal onClose={() => setModalOpen(false)} />}
    </>
  );
};

/* â”€â”€â”€ PlanCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const PlanCard = ({ isActive }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const user = useSelector((s) => s.user);
  const { plan, planLabel, planColor } = useFeature();
  const isStarter = plan === "STARTER";
  const isPro = plan === "PROFESSIONAL";

  const { data: usageData } = useQuery({
    queryKey: ["order-usage", user.restaurantId],
    queryFn: getOrderUsage,
    enabled: Boolean(user.restaurantId) && isStarter,
    staleTime: 60_000,
  });
  const usage = usageData?.data?.data;

  return (
    <div className={`settings-card settings-card--span settings-plan-card ${!isActive ? "settings-section-hidden" : ""}`} id="subscription-plan">
      <div className="settings-card-header">
        <div className="settings-card-icon-wrap plan">
          <MdRocketLaunch />
        </div>
        <div>
          <h2>Your Plan</h2>
          <p>
            Currently on{" "}
            <span style={{ color: planColor, fontWeight: 700 }}>{planLabel}</span>
            {isStarter && " Â· hard limits apply"}
          </p>
        </div>
      </div>

      <div className="settings-card-body">
        {/* Usage snapshot for Starter */}
        {isStarter && usage && !usage.unlimited && (
          <div className="settings-plan-section">
            <p className="settings-plan-section-label">Monthly order usage</p>
            <div className="settings-plan-usage-row">
              <div className="settings-plan-usage-track settings-plan-usage-track--lg">
                <div
                  className="settings-plan-usage-fill"
                  style={{
                    width: `${Math.min(usage.percentage, 100)}%`,
                    background: usage.percentage >= 90 ? "#ef4444" : usage.percentage >= 70 ? "#eab308" : "var(--dash-primary)",
                  }}
                />
              </div>
              <span className="settings-plan-usage-count">
                {usage.ordersThisMonth} / {usage.limit}
              </span>
            </div>
            {usage.percentage >= 70 && (
              <p className="settings-plan-warn">
                âš ï¸ {usage.percentage >= 100
                  ? "Order limit reached - new orders are blocked until the month resets."
                  : `${usage.limit - usage.ordersThisMonth} orders left before service blocks.`}
              </p>
            )}
          </div>
        )}

        {/* What's on your plan */}
        <div className="settings-plan-section">
          <p className="settings-plan-section-label">
            {isStarter ? "Starter includes" : "Professional includes"}
          </p>
          <ul className="settings-plan-features">
            {(isStarter ? [
              "300 orders/month (blocks at limit)",
              "30 menu items, 10 tables",
              "3 staff accounts",
              "7-day order history",
            ] : [
              "Unlimited orders, menu items, tables",
              "Up to 10 staff accounts",
              "90-day revenue analytics",
              "Inventory & supplier tracking",
              "Up to 50 QR digital menus",
              "Reservations & CSV exports",
            ]).map((item) => (
              <li key={item}>
                <MdCheckCircle className="settings-plan-check" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Upgrade CTA - Starter only */}
        {isStarter && (
          <div className="settings-plan-upgrade-cta-wrap">
            <div className="settings-plan-upgrade-pricing">
              <strong>â‚¹2,499<span>/month</span></strong>
              <span>~â‚¹83/day Â· no contract</span>
            </div>
            <button
              type="button"
              className="settings-plan-upgrade-btn"
              onClick={() => setModalOpen(true)}
            >
              <MdRocketLaunch /> Upgrade to Professional <MdArrowForward />
            </button>
            <div className="settings-plan-trust-row">
              {["Cancel anytime", "Your data stays yours", "Activates same day"].map((t) => (
                <span key={t}><MdCheckCircle /> {t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Downgrade warning - Professional only */}
        {isPro && (
          <div className="settings-plan-downgrade-warn">
            <p className="settings-plan-section-label">If you downgrade to Starter</p>
            <ul className="settings-plan-downgrade-list">
              <li>Orders will be capped at 300/month - service blocks when reached</li>
              <li>Menu items beyond 30 become read-only (not deleted)</li>
              <li>Staff beyond 3 accounts will lose login access</li>
              <li>Analytics history remains but the 90-day range is locked</li>
              <li>QR menus, inventory, and reservations are suspended</li>
            </ul>
            <p className="settings-plan-downgrade-note">
              Contact support to request a plan change. Your data is never deleted on downgrade.
            </p>
          </div>
        )}
      </div>

      {modalOpen && <UpgradeModal onClose={() => setModalOpen(false)} />}
    </div>
  );
};

// â”€â”€â”€ Tax Settings Sub-Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TAX_TYPE_META = {
  GST:      { label: "GST",          color: "#0f9fa4", bg: "#e0f7fa", desc: "CGST + SGST on top of price" },
  VAT:      { label: "VAT/Excise",   color: "#7c3aed", bg: "#f3e8ff", desc: "State VAT on alcohol/liquor" },
  INCLUDED: { label: "MRP Incl.",    color: "#d97706", bg: "#fef3c7", desc: "Tax already inside MRP price" },
  EXEMPT:   { label: "Exempt",       color: "#16a34a", bg: "#dcfce7", desc: "No tax at all" },
};

const EMPTY_FORM = {
  name: "",
  type: "GST",
  cgst: "",
  sgst: "",
  igst: "",
  vatRate: "",
  stateName: "",
  hsnSacCode: "",
  isDefault: false,
};

const TaxSettings = ({ isActive }) => {
  const { isOwner, hasRole } = useRole();
  const canManage = hasRole("OWNER", "MANAGER");
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stateSearch, setStateSearch] = useState("");

  const taxGroupsQuery = useQuery({
    queryKey: ["tax-groups"],
    queryFn: getTaxGroups,
  });
  const presetsQuery = useQuery({
    queryKey: ["state-presets"],
    queryFn: getStatePresets,
    enabled: form.type === "VAT" && showForm,
  });

  const groups = taxGroupsQuery.data?.data?.data || [];
  const statePresets = presetsQuery.data?.data?.data || [];
  const filteredStates = statePresets.filter((s) =>
    s.state.toLowerCase().includes(stateSearch.toLowerCase())
  );
  const defaultGroup = groups.find((group) => group.isDefault);
  const typeCounts = groups.reduce((counts, group) => {
    counts[group.type] = (counts[group.type] || 0) + 1;
    return counts;
  }, {});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tax-groups"] });

  const createMutation = useMutation({
    mutationFn: createTaxGroup,
    onSuccess: () => {
      enqueueSnackbar("Tax group created", { variant: "success" });
      setShowForm(false);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: updateTaxGroup,
    onSuccess: () => {
      enqueueSnackbar("Tax group updated", { variant: "success" });
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTaxGroup,
    onSuccess: () => {
      enqueueSnackbar("Tax group deleted", { variant: "success" });
      invalidate();
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const seedMutation = useMutation({
    mutationFn: seedDefaultTaxGroups,
    onSuccess: ({ data }) => {
      enqueueSnackbar(data.data?.message || "Default tax groups added", { variant: "success" });
      invalidate();
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (group) => {
    setEditingId(group.id);
    setForm({
      name: group.name,
      type: group.type,
      cgst: group.cgst,
      sgst: group.sgst,
      igst: group.igst,
      vatRate: group.vatRate,
      stateName: group.stateName || "",
      hsnSacCode: group.hsnSacCode || "",
      isDefault: group.isDefault,
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      cgst: Number(form.cgst) || 0,
      sgst: Number(form.sgst) || 0,
      igst: Number(form.igst) || 0,
      vatRate: Number(form.vatRate) || 0,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const applyStatePreset = (preset) => {
    const rate = preset.beerVat; // use beer as default representative rate
    setForm((f) => ({
      ...f,
      vatRate: rate,
      stateName: preset.state,
      name: f.name || `${preset.state} Alcohol VAT (${rate}%)`,
    }));
    setStateSearch("");
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className={`settings-card settings-tax-card ${!isActive ? "settings-section-hidden" : ""}`} id="tax-groups">
      <div className="settings-card-header settings-tax-header">
        <div className="settings-card-icon-wrap tax">
          <MdOutlineReceipt />
        </div>
        <div className="settings-tax-title">
          <h2>Tax Groups</h2>
          <p>Assign GST, VAT, MRP-inclusive, and exempt rates used during billing.</p>
        </div>
        {canManage && (
          <div className="settings-tax-actions">
            <button
              type="button"
              className="settings-tax-secondary-action"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              title="Adds missing default GST groups (GST 5%, GST 18%, MRP, Exempt)"
            >
              <MdRefresh /> Seed Defaults
            </button>
            <button
              type="button"
              className="settings-tax-primary-action"
              onClick={openCreate}
            >
              <MdAdd /> New Tax Group
            </button>
          </div>
        )}
      </div>

      <div className="settings-card-body">
        <div className="settings-tax-overview">
          <div className="settings-tax-overview-item">
            <span>Total groups</span>
            <strong>{groups.length}</strong>
          </div>
          <div className="settings-tax-overview-item">
            <span>Default</span>
            <strong>{defaultGroup?.name || "Not set"}</strong>
          </div>
          <div className="settings-tax-overview-item settings-tax-overview-item--types">
            <span>Types</span>
            <strong>
              GST {typeCounts.GST || 0} / VAT {typeCounts.VAT || 0} / MRP {typeCounts.INCLUDED || 0}
            </strong>
          </div>
        </div>

        {taxGroupsQuery.isLoading ? (
          <p className="settings-tax-muted">Loading tax groups...</p>
        ) : groups.length === 0 ? (
          <div className="settings-tax-empty">
            <MdOutlineReceipt />
            <h3>No tax groups yet</h3>
            <p>Add common defaults first, then adjust rates for alcohol, MRP items, or exempt items.</p>
            {canManage && (
              <div className="settings-tax-empty-actions">
                <button
                  type="button"
                  className="settings-tax-primary-action"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                >
                  <MdRefresh /> Seed Defaults
                </button>
                <button
                  type="button"
                  className="settings-tax-secondary-action"
                  onClick={openCreate}
                >
                  <MdAdd /> Create Manually
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="settings-tax-list">
            {groups.map((group) => {
              const meta = TAX_TYPE_META[group.type] || TAX_TYPE_META.EXEMPT;
              return (
                <div
                  key={group.id}
                  className={`settings-tax-row ${group.isDefault ? "is-default" : ""}`}
                >
                  <span
                    className="settings-tax-type-badge"
                    style={{ color: meta.color, background: meta.bg }}
                  >
                    {meta.label}
                  </span>

                  <div className="settings-tax-row-main">
                    <div className="settings-tax-row-title">
                      <strong>{group.name}</strong>
                      {group.isDefault && (
                        <span className="settings-tax-chip is-default">DEFAULT</span>
                      )}
                      {group.isSystem && (
                        <span className="settings-tax-chip">SYSTEM</span>
                      )}
                    </div>
                    <p>
                      {group.type === "GST" && `CGST ${group.cgst}% + SGST ${group.sgst}% = ${group.cgst + group.sgst}% GST`}
                      {group.type === "VAT" && `VAT ${group.vatRate}%${group.stateName ? ` - ${group.stateName}` : ""}`}
                      {group.type === "INCLUDED" && `Tax incl. in MRP - CGST ${group.cgst}% + SGST ${group.sgst}%`}
                      {group.type === "EXEMPT" && "No tax"}
                      {group.hsnSacCode && ` - HSN/SAC: ${group.hsnSacCode}`}
                    </p>
                  </div>

                  {canManage && (
                    <div className="settings-tax-row-actions">
                      <button
                        type="button"
                        className="settings-tax-icon-action"
                        onClick={() => openEdit(group)}
                        title="Edit tax group"
                      >
                        <MdEdit /> Edit
                      </button>
                      <button
                        type="button"
                        className="settings-tax-icon-action is-danger"
                        onClick={() => deleteMutation.mutate(group.id)}
                        disabled={deleteMutation.isPending}
                        title="Delete tax group"
                      >
                        <MdDelete /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showForm && canManage && (
          <div className="settings-tax-form-panel">
            <div className="settings-tax-form-heading">
              <div>
                <h3>{editingId ? "Edit Tax Group" : "New Tax Group"}</h3>
                <p>{editingId ? "Update the rate used by existing menu items." : "Create a reusable rate for menu pricing and billing."}</p>
              </div>
              <button
                type="button"
                className="settings-tax-secondary-action"
                onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleSubmit} className="settings-tax-form">
              <label className="settings-field-group">
                <span className="settings-field-label">Name</span>
                <input
                  className="settings-field-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. GST 5% Food, Alcohol VAT Maharashtra"
                  required
                />
              </label>

              <div className="settings-field-group">
                <span className="settings-field-label">Type</span>
                <div className="settings-tax-type-grid">
                  {Object.entries(TAX_TYPE_META).map(([type, meta]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type }))}
                      className={`settings-tax-type-option ${form.type === type ? "is-selected" : ""}`}
                      style={{
                        borderColor: form.type === type ? meta.color : undefined,
                        background: form.type === type ? meta.bg : "transparent",
                        color: form.type === type ? meta.color : undefined,
                      }}
                    >
                      {meta.label}
                      <span>{meta.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(form.type === "GST" || form.type === "INCLUDED") && (
                <div className="settings-tax-field-grid">
                  <label className="settings-field-group">
                    <span className="settings-field-label">CGST %</span>
                    <input className="settings-field-input" type="number" step="0.01" min="0" max="50"
                      value={form.cgst}
                      onChange={(e) => setForm((f) => ({ ...f, cgst: e.target.value, igst: (Number(e.target.value) + Number(f.sgst || 0)).toFixed(2) }))}
                      placeholder="e.g. 2.5"
                    />
                  </label>
                  <label className="settings-field-group">
                    <span className="settings-field-label">SGST %</span>
                    <input className="settings-field-input" type="number" step="0.01" min="0" max="50"
                      value={form.sgst}
                      onChange={(e) => setForm((f) => ({ ...f, sgst: e.target.value, igst: (Number(f.cgst || 0) + Number(e.target.value)).toFixed(2) }))}
                      placeholder="e.g. 2.5"
                    />
                  </label>
                </div>
              )}

              {form.type === "VAT" && (
                <div className="settings-tax-vat-block">
                  <label className="settings-field-group">
                    <span className="settings-field-label">VAT Rate %</span>
                    <input className="settings-field-input" type="number" step="0.1" min="0" max="200"
                      value={form.vatRate}
                      onChange={(e) => setForm((f) => ({ ...f, vatRate: e.target.value }))}
                      placeholder="e.g. 25"
                      required
                    />
                  </label>

                  <div className="settings-field-group">
                    <span className="settings-field-label">State VAT Presets</span>
                    <input
                      className="settings-field-input"
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      placeholder="Search state e.g. Maharashtra, Goa..."
                    />
                    {stateSearch && (
                      <div className="settings-tax-preset-menu">
                        {filteredStates.length === 0 ? (
                          <div className="settings-tax-preset-empty">No matching state</div>
                        ) : (
                          filteredStates.map((s) => (
                            <button
                              key={s.state}
                              type="button"
                              onClick={() => applyStatePreset(s)}
                              className={`settings-tax-preset-option ${s.beerVat === 0 ? "is-disabled" : ""}`}
                            >
                              {s.state} - Beer {s.beerVat}% | Wine {s.wineVat}% | Spirits {s.spiritsVat}%
                              {s.beerVat === 0 && " (Dry state / Prohibition)"}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    <label className="settings-field-group">
                      <span className="settings-field-label">State / UT Name</span>
                      <input className="settings-field-input"
                        value={form.stateName}
                        onChange={(e) => setForm((f) => ({ ...f, stateName: e.target.value }))}
                        placeholder="e.g. Maharashtra"
                      />
                    </label>
                  </div>
                </div>
              )}

              <label className="settings-field-group">
                <span className="settings-field-label">HSN / SAC Code (optional)</span>
                <input className="settings-field-input"
                  value={form.hsnSacCode}
                  onChange={(e) => setForm((f) => ({ ...f, hsnSacCode: e.target.value }))}
                  placeholder="e.g. 996331 (restaurant service) or 22021090 (packaged drinks)"
                />
              </label>

              <label className="settings-tax-default-toggle">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                />
                <span>Set as default for new menu items</span>
              </label>

              {(form.type === "GST" || form.type === "INCLUDED") && (
                <div className="settings-tax-rate-summary">
                  Total GST: {((Number(form.cgst) || 0) + (Number(form.sgst) || 0)).toFixed(2)}%
                  {" "} (CGST {form.cgst || 0}% + SGST {form.sgst || 0}%)
                </div>
              )}

              <div className="settings-tax-form-actions">
                <button type="submit" className="settings-tax-primary-action" disabled={isPending}>
                  <MdCheck />
                  {isPending ? "Saving..." : editingId ? "Update Group" : "Create Group"}
                </button>
                <button
                  type="button"
                  className="settings-tax-secondary-action"
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
