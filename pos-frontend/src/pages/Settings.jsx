import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useDispatch, useSelector } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  MdOutlineAdminPanelSettings,
  MdOutlineRestaurant,
  MdOutlineSecurity,
} from "react-icons/md";
import { changePassword, getErrorMessage, updateMyRestaurant } from "../https";
import { setRestaurant } from "../redux/slices/userSlice";
import useDashboardPreferences from "../hooks/useDashboardPreferences";
import useRole from "../hooks/useRole";

const Settings = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const { theme } = useDashboardPreferences();
  const { isOwner } = useRole();
  const canEditRestaurant =
    isOwner && user.restaurant?.status === "APPROVED";
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
  });

  useEffect(() => {
    // title set via Helmet
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
      enqueueSnackbar("Restaurant profile updated", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const updatePassword = (event) => {
    event.preventDefault();
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

  return (
    <section
      className={`dashboard-shell theme-${theme} min-h-[calc(100vh-5rem)] px-10 py-8 bg-[var(--dash-bg)] text-[var(--dash-text)] overflow-y-auto`}
    >
      <div className="settings-hero">
        <div>
          <span>{isOwner ? "Workspace Settings" : "Account Settings"}</span>
          <h1>Settings</h1>
          <p>
            {isOwner
              ? "Manage account security and restaurant profile details."
              : "Manage your account security and password."}
          </p>
        </div>
        <div className="settings-identity-card">
          <span>
            {(user.name || user.email || "U").trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{user.name || user.email}</strong>
            <small>{user.role}</small>
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="settings-meta-panel">
          <span>
            <MdOutlineAdminPanelSettings />
          </span>
          <div>
            <strong>{user.restaurant?.name || "Restaurant workspace"}</strong>
            <small>
              {user.restaurant?.status || "NO STATUS"} ·{" "}
              {user.restaurant?.plan || "STARTER"} plan
            </small>
          </div>
        </div>
      )}

      <div
        className={`settings-grid grid ${
          canEditRestaurant ? "grid-cols-2" : "grid-cols-1 max-w-[680px]"
        } gap-6`}
      >
        <form onSubmit={updatePassword} className="settings-panel">
          <div className="settings-panel-header">
            <span>
              <MdOutlineSecurity />
            </span>
            <div>
              <h2>Account Security</h2>
              <p>
                {user.email} · {user.role}
              </p>
            </div>
          </div>

          {[
            ["currentPassword", "Current password"],
            ["newPassword", "New password"],
            ["confirmPassword", "Confirm new password"],
          ].map(([name, placeholder]) => (
            <label key={name} className="dashboard-modal-label">
              {placeholder}
              <div className="dashboard-modal-field mt-1.5 mb-4">
                <input
                  value={password[name]}
                  onChange={(event) =>
                    setPassword({ ...password, [name]: event.target.value })
                  }
                  type="password"
                  placeholder={placeholder}
                  minLength="8"
                  required
                  className="dashboard-modal-input w-full"
                />
              </div>
            </label>
          ))}

          <button className="dashboard-primary-button w-full mt-4 py-3">
            Change Password
          </button>
        </form>

        {canEditRestaurant && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              restaurantMutation.mutate({
                ...restaurant,
                logo: restaurant.logo || undefined,
                description: restaurant.description || undefined,
              });
            }}
            className="settings-panel"
          >
            <div className="settings-panel-header">
              <span>
                <MdOutlineRestaurant />
              </span>
              <div>
                <h2>Restaurant Profile</h2>
                <p>Public restaurant details and billing currency.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                ["name", "Restaurant Name"],
                ["address", "Address"],
                ["city", "City"],
                ["phone", "Phone"],
                ["email", "Email"],
                ["logo", "Logo URL"],
              ].map(([name, placeholder]) => (
                <label key={name} className="dashboard-modal-label">
                  {placeholder}
                  <div className="dashboard-modal-field mt-1.5">
                    <input
                      value={restaurant[name]}
                      onChange={(event) =>
                        setRestaurantForm({
                          ...restaurant,
                          [name]: event.target.value,
                        })
                      }
                      placeholder={placeholder}
                      type={
                        name === "email"
                          ? "email"
                          : name === "logo"
                            ? "url"
                            : "text"
                      }
                      required={name !== "logo"}
                      className="dashboard-modal-input w-full"
                    />
                  </div>
                </label>
              ))}
            </div>

            <label className="dashboard-modal-label mt-4 block">
              Currency
              <div className="dashboard-modal-field mt-1.5">
                <select
                  value={restaurant.currency}
                  onChange={(event) =>
                    setRestaurantForm({
                      ...restaurant,
                      currency: event.target.value,
                    })
                  }
                  className="bg-transparent text-[var(--dash-text)] outline-none border-none w-full cursor-pointer"
                  required
                >
                  <option value="INR">INR - India</option>
                  <option value="USD">USD - United States</option>
                  <option value="EUR">EUR - Europe</option>
                  <option value="GBP">GBP - United Kingdom</option>
                  <option value="AUD">AUD - Australia</option>
                </select>
              </div>
            </label>

            <label className="dashboard-modal-label mt-4 block">
              Description
              <div className="dashboard-modal-field mt-1.5 h-auto items-start py-2">
                <textarea
                  value={restaurant.description}
                  onChange={(event) =>
                    setRestaurantForm({
                      ...restaurant,
                      description: event.target.value,
                    })
                  }
                  placeholder="Description"
                  className="dashboard-modal-input w-full min-h-[80px] resize-y"
                />
              </div>
            </label>

            <button className="dashboard-primary-button w-full py-3 mt-6">
              Save Restaurant Profile
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default Settings;
