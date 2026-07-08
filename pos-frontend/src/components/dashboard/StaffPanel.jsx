import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  getErrorMessage,
  getStaff,
  inviteStaff,
  removeStaff,
  resetStaffPassword,
} from "../../https";
import useRoleDashboard from "../../hooks/useRoleDashboard";
import useRole from "../../hooks/useRole";
import PlanLimitBadge from "../shared/PlanLimitBadge";
import { MdCheck, MdClose } from "react-icons/md";

const ROLE_DETAILS = {
  MANAGER: {
    label: "Manager",
    description: "Full access to daily operations.",
    scopes: [
      { text: "Manage Staff & Menu", allowed: true },
      { text: "View Finance & Metrics", allowed: true },
      { text: "Manage Tables & Orders", allowed: true },
    ],
  },
  CASHIER: {
    label: "Cashier",
    description: "Handle orders and payments.",
    scopes: [
      { text: "Process Payments", allowed: true },
      { text: "Manage Tables & Orders", allowed: true },
      { text: "Manage Staff or Menu", allowed: false },
    ],
  },
  KITCHEN: {
    label: "Kitchen Staff",
    description: "Dedicated kitchen display screen access.",
    scopes: [
      { text: "View Kitchen Orders", allowed: true },
      { text: "Process Payments", allowed: false },
      { text: "Manage Tables", allowed: false },
    ],
  },
  WAITER: {
    label: "Waiter",
    description: "Take orders and manage dining tables.",
    scopes: [
      { text: "Take Orders & Manage Tables", allowed: true },
      { text: "Process Payments", allowed: false },
      { text: "Manage Menu", allowed: false },
    ],
  },
};

const StaffPanel = () => {
  const { canManageStaff } = useRoleDashboard();
  const { isOwner } = useRole();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "CASHIER",
  });
  const [latestPassword, setLatestPassword] = useState(null);

  const staffQuery = useQuery({
    queryKey: ["staff"],
    queryFn: getStaff,
    enabled: canManageStaff,
  });

  const inviteMutation = useMutation({
    mutationFn: inviteStaff,
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setForm({ name: "", email: "", phone: "", role: "CASHIER" });
      if (data.temporaryPassword) {
        setLatestPassword({
          staffId: data.data.id,
          name: data.data.name,
          email: data.data.email,
          temporaryPassword: data.temporaryPassword,
          action: "created",
        });
      }
      enqueueSnackbar(
        data.temporaryPassword
          ? "Staff created. Temporary password is shown in the Staff panel."
          : data.message,
        { variant: "success", autoHideDuration: 10000 },
      );
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (staff) => resetStaffPassword(staff.id),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setLatestPassword({
        staffId: data.data.id,
        name: data.data.name,
        email: data.data.email,
        temporaryPassword: data.temporaryPassword,
        action: "reset",
      });
      enqueueSnackbar("Temporary password reset and shown in the Staff panel.", {
        variant: "success",
        autoHideDuration: 10000,
      });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const removeMutation = useMutation({
    mutationFn: removeStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      enqueueSnackbar("Staff member removed", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const assignableRoles = isOwner
    ? ["MANAGER", "KITCHEN", "CASHIER", "WAITER"]
    : ["KITCHEN", "CASHIER", "WAITER"];
  const canRemove = (staffRole) =>
    isOwner
      ? staffRole !== "OWNER"
      : ["KITCHEN", "CASHIER", "WAITER"].includes(staffRole);

  const copyTemporaryPassword = async () => {
    if (!latestPassword?.temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(latestPassword.temporaryPassword);
      enqueueSnackbar("Temporary password copied", { variant: "success" });
    } catch {
      enqueueSnackbar("Copy failed. Select and copy the password manually.", {
        variant: "warning",
      });
    }
  };

  if (!canManageStaff) return null;

  return (
    <div className="container mx-auto grid grid-cols-2 gap-5 text-[var(--dash-text)]">
      <div className="dashboard-management-panel p-5 rounded-lg">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-xl font-semibold">Staff</h2>
          <PlanLimitBadge resource="staff_seats" warnAt={3} />
        </div>
        <p className="text-sm text-[var(--dash-muted)] mb-4">
          {isOwner
            ? "Manage all restaurant staff."
            : "Manage cashier, kitchen and waiter staff."}
        </p>
        {(staffQuery.data?.data.data || []).map((staff) => (
          <div
            key={staff.id}
            className="dashboard-staff-row flex justify-between items-center gap-3 p-3"
          >
            <div className="min-w-0">
              <p>{staff.name}</p>
              <p className="text-xs text-[var(--dash-muted)]">
                {staff.email} - {staff.phone || "No phone"} - {staff.role}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              {isOwner && staff.role !== "OWNER" && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Reset password for ${staff.name}? They will be signed out and must change the new temporary password on next login.`,
                      )
                    ) {
                      resetPasswordMutation.mutate(staff);
                    }
                  }}
                  disabled={resetPasswordMutation.isPending}
                  className="dashboard-link-button disabled:opacity-50"
                >
                  Reset Password
                </button>
              )}
              {canRemove(staff.role) && (
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(staff.id)}
                  disabled={removeMutation.isPending}
                  className="dashboard-danger-link disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          inviteMutation.mutate(form);
        }}
        className="dashboard-management-panel p-5 rounded-lg"
      >
        <h2 className="text-xl font-semibold mb-4">Create Staff Account</h2>
        {["name", "email", "phone"].map((field) => (
          <input
            key={field}
            value={form[field]}
            onChange={(event) =>
              setForm({ ...form, [field]: event.target.value })
            }
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            type={field === "email" ? "email" : "text"}
            required={field !== "phone"}
            className="dashboard-form-control w-full rounded-lg p-3 mb-3 focus:outline-none"
          />
        ))}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-3">Select Role</label>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {assignableRoles.map((roleKey) => {
              const details = ROLE_DETAILS[roleKey];
              const isSelected = form.role === roleKey;
              return (
                <div
                  key={roleKey}
                  onClick={() => setForm({ ...form, role: roleKey })}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-[var(--primary)] bg-[var(--primary)] bg-opacity-10"
                      : "border-[var(--dash-border)] hover:border-[var(--dash-muted)]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-[var(--primary)]" : "border-[var(--dash-muted)]"}`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />}
                    </div>
                    <span className="font-semibold">{details.label}</span>
                  </div>
                  <p className="text-xs text-[var(--dash-muted)] mb-3 pl-6">{details.description}</p>
                  <div className="pl-6 flex flex-col gap-1.5">
                    {details.scopes.map((scope, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {scope.allowed ? (
                          <MdCheck className="text-green-500 text-sm" />
                        ) : (
                          <MdClose className="text-red-500 text-sm" />
                        )}
                        <span className={scope.allowed ? "text-[var(--dash-text)]" : "text-[var(--dash-muted)]"}>
                          {scope.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {latestPassword && (
          <div className="staff-temp-password-panel mb-4">
            <p className="staff-temp-password-label">
              Temporary password{" "}
              {latestPassword.action === "reset" ? "reset" : "created"} for{" "}
              <strong>{latestPassword.name}</strong>
            </p>
            <div className="staff-temp-password-value">
              <code>{latestPassword.temporaryPassword}</code>
              <button type="button" onClick={copyTemporaryPassword}>
                Copy
              </button>
            </div>
            <p className="staff-temp-password-help">
              Share this with {latestPassword.email}. It is only shown for this action.
            </p>
          </div>
        )}
        <button
          disabled={inviteMutation.isPending}
          className="dashboard-primary-button w-full font-bold rounded-lg py-3 disabled:opacity-50"
        >
          {inviteMutation.isPending ? "Creating..." : "Create Staff Account"}
        </button>
      </form>
    </div>
  );
};

export default StaffPanel;
