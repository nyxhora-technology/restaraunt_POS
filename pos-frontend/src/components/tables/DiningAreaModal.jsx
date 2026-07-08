import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { addDiningArea, getErrorMessage, updateDiningArea } from "../../https";
import Modal from "../shared/Modal";
import { CLIMATE_LABELS, EXPERIENCE_LABELS } from "./tableOptions";


const createInitialForm = (area) => ({
  name: area?.name ?? "",
  code: area?.code ?? "",
  floor: area?.floor ?? "",
  climate: area?.climate ?? "AC",
  experience: area?.experience ?? "STANDARD",
  color: area?.color ?? "#F6B100",
  sortOrder: area?.sortOrder ?? 0,
});

const DiningAreaModal = ({ isOpen, onClose, area = null }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => createInitialForm(area));
  const isEditing = Boolean(area);

  useEffect(() => {
    if (isOpen) setForm(createInitialForm(area));
  }, [area, isOpen]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEditing
        ? updateDiningArea({ areaId: area.id, ...payload })
        : addDiningArea(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dining-areas"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      enqueueSnackbar(
        isEditing ? "Dining area updated" : "Dining area created",
        {
          variant: "success",
        },
      );
      onClose();
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error, "Unable to save dining area"), {
        variant: "error",
      }),
  });

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    mutation.mutate({
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      floor: form.floor.trim() || undefined,
      sortOrder: Number(form.sortOrder),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit dining area" : "Add dining area"}
      dashboardVariant
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="dashboard-modal-label">Area name</span>
            <div className="dashboard-modal-field">
              <input
                className="dashboard-modal-input"
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="VIP Lounge"
                maxLength="80"
                required
              />
            </div>
          </label>
          <label>
            <span className="dashboard-modal-label">Short code</span>
            <div className="dashboard-modal-field">
              <input
                className="dashboard-modal-input"
                name="code"
                value={form.code}
                onChange={updateField}
                placeholder="VIP"
                maxLength="16"
                required
              />
            </div>
          </label>
        </div>

        <label>
          <span className="dashboard-modal-label">Floor or location</span>
          <div className="dashboard-modal-field">
            <input
              className="dashboard-modal-input"
              name="floor"
              value={form.floor}
              onChange={updateField}
              placeholder="Ground Floor"
              maxLength="80"
            />
          </div>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="dashboard-modal-label">Climate</span>
            <div className="flex gap-2 flex-wrap mt-1">
              {Object.entries(CLIMATE_LABELS).map(([climateValue, climateLabel]) => (
                <button
                  key={climateValue}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, climate: climateValue }))}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                    form.climate === climateValue
                      ? "border-[var(--dash-primary)] bg-[var(--dash-primary)]/10 text-[var(--dash-primary)]"
                      : "border-[var(--dash-border)] text-[var(--dash-muted)] hover:border-[var(--dash-text)] hover:text-[var(--dash-text)]"
                  }`}
                >
                  {climateLabel}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="dashboard-modal-label">Experience</span>
            <div className="flex gap-2 flex-wrap mt-1">
              {Object.entries(EXPERIENCE_LABELS).map(([expValue, expLabel]) => (
                <button
                  key={expValue}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, experience: expValue }))}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                    form.experience === expValue
                      ? "border-[var(--dash-primary)] bg-[var(--dash-primary)]/10 text-[var(--dash-primary)]"
                      : "border-[var(--dash-border)] text-[var(--dash-muted)] hover:border-[var(--dash-text)] hover:text-[var(--dash-text)]"
                  }`}
                >
                  {expLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="dashboard-modal-label">Display colour</span>
            <div className="dashboard-modal-field gap-3">
              <input
                type="color"
                name="color"
                value={form.color}
                onChange={updateField}
                className="h-7 w-9 cursor-pointer border-0 bg-transparent"
              />
              <span className="text-sm text-[var(--dash-muted)]">
                {form.color.toUpperCase()}
              </span>
            </div>
          </label>
          <label>
            <span className="dashboard-modal-label">Display order</span>
            <div className="dashboard-modal-field">
              <input
                className="dashboard-modal-input"
                type="number"
                name="sortOrder"
                value={form.sortOrder}
                onChange={updateField}
                min="0"
                max="10000"
              />
            </div>
          </label>
        </div>

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
                : "Create area"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DiningAreaModal;
