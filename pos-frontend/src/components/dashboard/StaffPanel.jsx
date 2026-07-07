import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  getErrorMessage,
  getStaff,
  inviteStaff,
  removeStaff,
} from "../../https";
import useRoleDashboard from "../../hooks/useRoleDashboard";
import useRole from "../../hooks/useRole";
import PlanLimitBadge from "../shared/PlanLimitBadge";

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
      enqueueSnackbar(
        data.temporaryPassword
          ? `Staff created. Temporary password: ${data.temporaryPassword}`
          : data.message,
        { variant: "success", autoHideDuration: 10000 },
      );
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
            className="dashboard-staff-row flex justify-between items-center p-3"
          >
            <div>
              <p>{staff.name}</p>
              <p className="text-xs text-[var(--dash-muted)]">
                {staff.email} · {staff.phone || "No phone"} · {staff.role}
              </p>
            </div>
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
        <select
          value={form.role}
          onChange={(event) => setForm({ ...form, role: event.target.value })}
          className="dashboard-form-control w-full rounded-lg p-3 mb-3"
        >
          {assignableRoles.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button
          disabled={inviteMutation.isPending}
          className="dashboard-primary-button w-full font-bold rounded-lg py-3 disabled:opacity-50"
        >
          {inviteMutation.isPending ? "Creating…" : "Create Staff Account"}
        </button>
      </form>
    </div>
  );
};

export default StaffPanel;
