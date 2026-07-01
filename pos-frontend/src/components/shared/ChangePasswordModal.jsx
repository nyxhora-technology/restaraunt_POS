import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import { MdLock, MdVisibility, MdVisibilityOff, MdWarning } from "react-icons/md";
import { changeFirstPassword, getErrorMessage } from "../../https";
import { setUser } from "../../redux/slices/userSlice";

/**
 * Full-screen blocking modal shown to staff on first login.
 * Cannot be dismissed — the user MUST set a new password.
 */
const ChangePasswordModal = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState("");

  const mutation = useMutation({
    mutationFn: changeFirstPassword,
    onSuccess: () => {
      dispatch(setUser({ ...user, mustChangePassword: false }));
      enqueueSnackbar("Password changed successfully. Welcome!", { variant: "success" });
    },
    onError: (error) => {
      const msg = getErrorMessage(error, "Password change failed");
      setLocalError(msg);
      enqueueSnackbar(msg, { variant: "error" });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    if (!form.currentPassword) {
      setLocalError("Please enter your temporary password");
      return;
    }
    if (form.newPassword.length < 8) {
      setLocalError("New password must be at least 8 characters");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setLocalError("New passwords do not match");
      return;
    }
    if (form.currentPassword === form.newPassword) {
      setLocalError("New password must be different from the temporary password");
      return;
    }

    mutation.mutate({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
  };

  const fields = [
    {
      key: "currentPassword",
      label: "Temporary Password",
      placeholder: "Enter the temporary password you were given",
      show: showCurrent,
      toggle: () => setShowCurrent((v) => !v),
      autoComplete: "current-password",
    },
    {
      key: "newPassword",
      label: "New Password",
      placeholder: "Min. 8 characters",
      show: showNew,
      toggle: () => setShowNew((v) => !v),
      autoComplete: "new-password",
      hint: form.newPassword ? `${form.newPassword.length}/8 minimum` : "",
      hintOk: form.newPassword.length >= 8,
    },
    {
      key: "confirmPassword",
      label: "Confirm New Password",
      placeholder: "Repeat your new password",
      show: showConfirm,
      toggle: () => setShowConfirm((v) => !v),
      autoComplete: "new-password",
      hint: form.confirmPassword
        ? form.newPassword === form.confirmPassword
          ? "✓ Matches"
          : "Passwords do not match"
        : "",
      hintOk: form.confirmPassword && form.newPassword === form.confirmPassword,
    },
  ];

  return (
    <div className="force-change-password-overlay">
      <div className="force-change-password-card">
        {/* Icon */}
        <div className="force-change-password-icon">
          <MdLock size={32} />
        </div>

        {/* Heading */}
        <h1 className="force-change-password-title">Set Your Password</h1>
        <p className="force-change-password-subtitle">
          Your account was created with a temporary password.
          <br />
          Please set a new password before continuing.
        </p>

        {/* Inline error banner */}
        {localError && (
          <div className="force-change-password-error">
            <MdWarning size={16} />
            <span>{localError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="force-change-password-form">
          {fields.map(({ key, label, placeholder, show, toggle, autoComplete, hint, hintOk }) => (
            <div key={key} className="force-change-password-field">
              <label className="force-change-password-label">{label}</label>
              <div className="force-change-password-input-wrap">
                <input
                  type={show ? "text" : "password"}
                  value={form[key]}
                  onChange={(e) => {
                    setLocalError("");
                    setForm((prev) => ({ ...prev, [key]: e.target.value }));
                  }}
                  placeholder={placeholder}
                  required
                  autoComplete={autoComplete}
                  className="force-change-password-input"
                />
                <button
                  type="button"
                  onClick={toggle}
                  className="force-change-password-toggle"
                  tabIndex={-1}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
              {hint && (
                <span className={`force-change-password-hint ${hintOk ? "is-ok" : "is-warn"}`}>
                  {hint}
                </span>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="force-change-password-submit"
          >
            {mutation.isPending ? "Changing Password…" : "Set New Password"}
          </button>
        </form>

        <p className="force-change-password-footer">
          Logged in as <strong>{user.email}</strong>
        </p>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
