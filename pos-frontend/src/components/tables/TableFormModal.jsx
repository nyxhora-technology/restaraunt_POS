import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  addTable,
  getDiningAreas,
  getErrorMessage,
  updateTable,
} from "../../https";
import Modal from "../shared/Modal";
import {
  getEditableStatuses,
  SHAPE_LABELS,
  TABLE_STATUS_LABELS,
} from "./tableOptions";

const createInitialForm = (table) => ({
  tableNo: table?.tableNo ?? "",
  label: table?.label ?? "",
  areaId: table?.areaId ?? "",
  minSeats: table?.minSeats ?? 1,
  seats: table?.seats ?? 4,
  shape: table?.shape ?? "SQUARE",
  isCombinable: table?.isCombinable ?? false,
  combinationGroup: table?.combinationGroup ?? "",
  status: table?.status ?? "AVAILABLE",
});

const TableFormModal = ({ isOpen, onClose, table = null }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => createInitialForm(table));
  const isEditing = Boolean(table);
  const areasQuery = useQuery({
    queryKey: ["dining-areas"],
    queryFn: () => getDiningAreas(),
    enabled: isOpen,
  });
  const activeAreas = useMemo(
    () => (areasQuery.data?.data.data || []).filter((area) => area.isActive),
    [areasQuery.data],
  );

  useEffect(() => {
    if (!isOpen) return;
    setForm(createInitialForm(table));
  }, [isOpen, table]);

  useEffect(() => {
    if (!isOpen || form.areaId || activeAreas.length === 0) return;
    setForm((current) => ({ ...current, areaId: activeAreas[0].id }));
  }, [activeAreas, form.areaId, isOpen]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEditing
        ? updateTable({ tableId: table.id, ...payload })
        : addTable(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["dining-areas"] });
      enqueueSnackbar(isEditing ? "Table updated" : "Table created", {
        variant: "success",
      });
      onClose();
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error, "Unable to save table"), {
        variant: "error",
      }),
  });

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const minSeats = Number(form.minSeats);
    const seats = Number(form.seats);
    if (minSeats > seats) {
      enqueueSnackbar("Minimum seats cannot exceed maximum capacity", {
        variant: "warning",
      });
      return;
    }

    mutation.mutate({
      tableNo: Number(form.tableNo),
      label: form.label.trim() || undefined,
      areaId: form.areaId || undefined,
      minSeats,
      seats,
      shape: form.shape,
      isCombinable: form.isCombinable,
      ...(form.isCombinable
        ? { combinationGroup: form.combinationGroup.trim() }
        : isEditing
          ? { combinationGroup: null }
          : {}),
      ...(isEditing && table.status !== "OCCUPIED"
        ? { status: form.status }
        : {}),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit table" : "Add table"}
      dashboardVariant
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="dashboard-modal-label">Table number</span>
            <div className="dashboard-modal-field">
              <input
                className="dashboard-modal-input"
                type="number"
                name="tableNo"
                min="1"
                max="10000"
                value={form.tableNo}
                onChange={updateField}
                required
              />
            </div>
          </label>
          <label>
            <span className="dashboard-modal-label">Display label</span>
            <div className="dashboard-modal-field">
              <input
                className="dashboard-modal-input"
                type="text"
                name="label"
                maxLength="24"
                placeholder={
                  form.tableNo ? `T-${form.tableNo}` : "Example: VIP-01"
                }
                value={form.label}
                onChange={updateField}
              />
            </div>
          </label>
        </div>

        <label>
          <span className="dashboard-modal-label">Dining area</span>
          <div className="dashboard-modal-field">
            <select
              className="dashboard-modal-input"
              name="areaId"
              value={form.areaId}
              onChange={updateField}
            >
              {activeAreas.length === 0 && (
                <option value="">Main Dining (created automatically)</option>
              )}
              {activeAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
          {activeAreas.length === 0 && !areasQuery.isLoading && (
            <p className="mt-2 text-xs text-[var(--dash-muted)]">
              You can configure AC, Non-AC and VIP areas from Table Management.
            </p>
          )}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="dashboard-modal-label">Minimum party size</span>
            <div className="dashboard-modal-field">
              <input
                className="dashboard-modal-input"
                type="number"
                name="minSeats"
                min="1"
                max="100"
                value={form.minSeats}
                onChange={updateField}
                required
              />
            </div>
          </label>
          <label>
            <span className="dashboard-modal-label">Maximum capacity</span>
            <div className="dashboard-modal-field">
              <input
                className="dashboard-modal-input"
                type="number"
                name="seats"
                min="1"
                max="100"
                value={form.seats}
                onChange={updateField}
                required
              />
            </div>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="dashboard-modal-label">Table shape</span>
            <div className="dashboard-modal-field">
              <select
                className="dashboard-modal-input"
                name="shape"
                value={form.shape}
                onChange={updateField}
              >
                {Object.entries(SHAPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </label>
          {isEditing && (
            <label>
              <span className="dashboard-modal-label">Operational status</span>
              <div className="dashboard-modal-field">
                <select
                  className="dashboard-modal-input"
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  disabled={table.status === "OCCUPIED"}
                >
                  {getEditableStatuses(table.status).map((status) => (
                    <option key={status} value={status}>
                      {TABLE_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          )}
        </div>

        <label className="dashboard-check-row">
          <input
            type="checkbox"
            name="isCombinable"
            checked={form.isCombinable}
            onChange={updateField}
          />
          <span>
            <strong>Can be combined</strong>
            <small>Mark tables that staff may join for larger parties.</small>
          </span>
        </label>

        {form.isCombinable && (
          <label>
            <span className="dashboard-modal-label">Combination group</span>
            <div className="dashboard-modal-field">
              <input
                className="dashboard-modal-input"
                type="text"
                name="combinationGroup"
                maxLength="32"
                placeholder="Example: WINDOW-A"
                value={form.combinationGroup}
                onChange={updateField}
                required
              />
            </div>
            <p className="mt-2 text-xs text-[var(--dash-muted)]">
              Only available tables in the same area and group can be joined.
            </p>
          </label>
        )}

        <div className="flex justify-end gap-3 border-t border-[var(--dash-border)] pt-5">
          <button
            type="button"
            onClick={onClose}
            className="dashboard-secondary-button px-5 py-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="dashboard-primary-button px-5 py-3 disabled:opacity-50"
          >
            {mutation.isPending
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Create table"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TableFormModal;
