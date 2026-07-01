import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  getMenu,
  createInventoryItem,
  updateInventoryItem,
  getErrorMessage,
} from "../../https";
import { IoMdClose } from "react-icons/io";

const InventoryModal = ({ action, record, onClose }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: record?.name || "",
    unit: record?.unit || "kg",
    currentStock: record?.currentStock || "",
    totalStock: record?.totalStock || "",
    alertThreshold: record?.alertThreshold || 30,
    alertEnabled: record?.alertEnabled ?? true,
    menuItemId: record?.menuItemId || "",
    variantLabel: record?.variantLabel || "",
  });

  const { data: menuData } = useQuery({
    queryKey: ["menu"],
    queryFn: getMenu,
  });

  const categories = menuData?.data.data || [];
  // Flatten categories → actual menu items for the link dropdown
  const menuItems = categories.flatMap((cat) =>
    (cat.menuItems || []).map((item) => ({ ...item, categoryName: cat.name })),
  );

  // Find variants if a menu item is selected
  const selectedMenuItem = menuItems.find((m) => m.id === formData.menuItemId);
  const variants = selectedMenuItem?.variants || [];

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const addMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      enqueueSnackbar("Inventory item added", { variant: "success" });
      onClose();
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: updateInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      enqueueSnackbar("Inventory item updated", { variant: "success" });
      onClose();
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      currentStock: Number(formData.currentStock),
      totalStock: Number(formData.totalStock || formData.currentStock),
      alertThreshold: Number(formData.alertThreshold),
    };

    if (action === "edit") {
      updateMutation.mutate({ itemId: record.id, ...payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <div
      className="dashboard-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={
        action === "edit" ? "Edit Inventory Item" : "Add Inventory Item"
      }
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dashboard-detail-modal rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center p-5 border-b border-[var(--dash-border)] sticky top-0 bg-[var(--dash-surface)] z-10">
          <h2 className="text-[var(--dash-text)] text-xl font-bold">
            {action === "edit" ? "Edit Inventory Item" : "Add Inventory Item"}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--dash-muted)] hover:text-[var(--dash-text)]"
          >
            <IoMdClose size={24} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 flex flex-col gap-5 text-[var(--dash-text)]"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--dash-muted)] mb-1">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] p-3 rounded-lg focus:outline-none focus:border-[var(--dash-primary)]"
                placeholder="e.g. Tomatoes"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--dash-muted)] mb-1">
                Unit *
              </label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                className="w-full bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] p-3 rounded-lg focus:outline-none focus:border-[var(--dash-primary)]"
                placeholder="kg, ml, units, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--dash-muted)] mb-1">
                Current Stock *
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={formData.currentStock}
                onChange={(e) =>
                  setFormData({ ...formData, currentStock: e.target.value })
                }
                className="w-full bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] p-3 rounded-lg focus:outline-none focus:border-[var(--dash-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--dash-muted)] mb-1">
                Total Capacity (Optional)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.totalStock}
                onChange={(e) =>
                  setFormData({ ...formData, totalStock: e.target.value })
                }
                placeholder="Defaults to current stock"
                className="w-full bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] p-3 rounded-lg focus:outline-none focus:border-[var(--dash-primary)]"
              />
            </div>
          </div>

          <div className="border border-[var(--dash-border)] p-4 rounded-lg bg-[var(--dash-surface-muted)]">
            <h3 className="font-semibold mb-3">
              Auto-deduction Link (Optional)
            </h3>
            <p className="text-xs text-[var(--dash-muted)] mb-4">
              Link this inventory item to a menu item so it auto-deducts when
              ordered. Usually 1 unit of stock is deducted per order item.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--dash-muted)] mb-1">
                  Link Menu Item
                </label>
                <select
                  value={formData.menuItemId || ""}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      menuItemId: e.target.value,
                      variantLabel: "",
                    });
                  }}
                  className="w-full bg-[var(--dash-surface)] border border-[var(--dash-border)] p-3 rounded-lg focus:outline-none"
                >
                  <option value="">-- No linked item --</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.categoryName})
                    </option>
                  ))}
                </select>
              </div>

              {variants.length > 0 && (
                <div>
                  <label className="block text-sm text-[var(--dash-muted)] mb-1">
                    Specific Variant
                  </label>
                  <select
                    value={formData.variantLabel || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, variantLabel: e.target.value })
                    }
                    className="w-full bg-[var(--dash-surface)] border border-[var(--dash-border)] p-3 rounded-lg focus:outline-none"
                  >
                    <option value="">-- All variants --</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.label}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="border border-[var(--dash-border)] p-4 rounded-lg bg-[var(--dash-surface-muted)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Low Stock Alerts</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.alertEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, alertEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-[var(--dash-primary)]"
                />
                <span className="text-sm">Enable</span>
              </label>
            </div>

            <div>
              <label className="block text-sm text-[var(--dash-muted)] mb-1">
                Alert Threshold (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                disabled={!formData.alertEnabled}
                value={formData.alertThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, alertThreshold: e.target.value })
                }
                className="w-full bg-[var(--dash-surface)] border border-[var(--dash-border)] p-3 rounded-lg focus:outline-none disabled:opacity-50"
              />
              <p className="text-xs text-[var(--dash-muted)] mt-2">
                Get a warning when stock falls below this percentage.
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-4 sticky bottom-0 bg-[var(--dash-surface)] pt-2">
            <button
              type="button"
              onClick={onClose}
              className="dashboard-secondary-button flex-1 py-3 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="dashboard-primary-button flex-1 py-3 font-bold rounded-lg disabled:opacity-70"
            >
              {isPending ? "Saving..." : "Save Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryModal;
