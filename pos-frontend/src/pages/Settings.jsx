import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQuery } from "@tanstack/react-query";
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
} from "react-icons/md";
import {
  changePassword,
  getErrorMessage,
  updateMyRestaurant,
  getMyReferrals,
} from "../https";
import { setRestaurant } from "../redux/slices/userSlice";
import useDashboardPreferences from "../hooks/useDashboardPreferences";
import useRole from "../hooks/useRole";
import CustomSelect from "../components/shared/CustomSelect";

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

const Settings = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const { theme } = useDashboardPreferences();
  const { isOwner } = useRole();
  const canEditRestaurant = isOwner && user.restaurant?.status === "APPROVED";

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
        <div
          className="settings-status-banner"
          style={{ background: statusStyle.bg, color: statusStyle.color }}
        >
          <span
            className="settings-status-dot"
            style={{ background: statusStyle.dot }}
          />
          <MdOutlineAdminPanelSettings />
          <div>
            <strong>{user.restaurant.name}</strong>
            <span>
              {restaurantStatus} / {user.restaurant.plan || "STARTER"} plan
            </span>
          </div>
          {restaurantStatus === "APPROVED" ? (
            <MdOutlineVerified className="settings-status-badge-icon" />
          ) : (
            <MdOutlineWarningAmber className="settings-status-badge-icon" />
          )}
        </div>
      )}

      <div
        className={`settings-cards-grid ${canEditRestaurant ? "two-col" : "one-col"}`}
      >
        <div className="settings-card">
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
          </form>
        </div>

        {canEditRestaurant && (
          <div className="settings-card">
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
                  Affects the "Today's Orders" reset time and analytics boundaries.
                </p>
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
        {canEditRestaurant && <ReferralCard />}
      </div>
    </section>
  );
};

const ReferralCard = () => {
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
    <div className="settings-card settings-card--span">
      <div className="settings-card-header">
        <div className="settings-card-icon-wrap referral">
          <MdOutlineCardGiftcard />
        </div>
        <div>
          <h2>Referral Program</h2>
          <p>Earn free days for every restaurant you bring aboard</p>
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

export default Settings;
