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
import CustomSelect from "../shared/CustomSelect";

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
        <CustomSelect
          className="w-full mb-3"
          name="role"
          value={form.role}
          onChange={(event) => setForm({ ...form, role: event.target.value })}
          options={assignableRoles.map((item) => ({ value: item, label: item }))}
        />
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
