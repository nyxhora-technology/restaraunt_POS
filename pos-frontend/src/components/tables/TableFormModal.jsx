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
import CustomSelect from "../shared/CustomSelect";

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
            <CustomSelect
              className="w-full"
              name="areaId"
              value={form.areaId}
              onChange={updateField}
              options={
                activeAreas.length === 0
                  ? [{ value: "", label: "Main Dining (created automatically)" }]
                  : activeAreas.map((area) => ({ value: area.id, label: area.name }))
              }
            />
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
            <div className="flex gap-2 flex-wrap mt-1">
              {Object.entries(SHAPE_LABELS).map(([shapeValue, shapeLabel]) => (
                <button
                  key={shapeValue}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, shape: shapeValue }))}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                    form.shape === shapeValue
                      ? "border-[var(--dash-primary)] bg-[var(--dash-primary)]/10 text-[var(--dash-primary)]"
                      : "border-[var(--dash-border)] text-[var(--dash-muted)] hover:border-[var(--dash-text)] hover:text-[var(--dash-text)]"
                  }`}
                >
                  {shapeLabel}
                </button>
              ))}
            </div>
          </label>
          {isEditing && (
            <label>
              <span className="dashboard-modal-label">Operational status</span>
              <div className="flex gap-2 flex-wrap mt-1">
                {getEditableStatuses(table.status).map((statusValue) => (
                  <button
                    key={statusValue}
                    type="button"
                    disabled={table.status === "OCCUPIED"}
                    onClick={() => setForm((f) => ({ ...f, status: statusValue }))}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      form.status === statusValue
                        ? "border-[var(--dash-primary)] bg-[var(--dash-primary)]/10 text-[var(--dash-primary)]"
                        : "border-[var(--dash-border)] text-[var(--dash-muted)] hover:border-[var(--dash-text)] hover:text-[var(--dash-text)]"
                    }`}
                  >
                    {TABLE_STATUS_LABELS[statusValue]}
                  </button>
                ))}
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
