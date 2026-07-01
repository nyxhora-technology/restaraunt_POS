import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  getInventoryItems,
  deleteInventoryItem,
  getErrorMessage,
  restockInventoryItem,
} from "../../https";
import InventoryModal from "./InventoryModal";
import useFeature from "../../hooks/useFeature";
import useRole from "../../hooks/useRole";
import UpgradeBanner from "../shared/UpgradeBanner";

const InventoryManagement = () => {
  const { hasInventory } = useFeature();
  const { isManagement } = useRole();
  const canAccessInventory = isManagement && hasInventory;
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    if (modal?.action !== "restock") return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [modal]);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () =>
      canAccessInventory
        ? getInventoryItems()
        : Promise.resolve({ data: { data: [] } }),
    enabled: canAccessInventory,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["inventory"] });

  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => {
      refresh();
      enqueueSnackbar("Item deleted", { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const restockMutation = useMutation({
    mutationFn: restockInventoryItem,
    onSuccess: () => {
      refresh();
      enqueueSnackbar("Stock added", { variant: "success" });
      setModal(null);
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const allItems = data?.data.data || [];

  // Build unique category list from the enriched menuItem.category data
  const categories = [];
  const seenCatIds = new Set();
  allItems.forEach((item) => {
    const cat = item.menuItem?.category;
    if (cat && !seenCatIds.has(cat.id)) {
      seenCatIds.add(cat.id);
      categories.push(cat);
    }
  });

  // Apply category filter
  const items =
    categoryFilter === "all"
      ? allItems
      : allItems.filter(
          (item) => item.menuItem?.category?.id === categoryFilter,
        );

  const lowStockCount = allItems.filter(
    (i) => i.stockPercent <= i.alertThreshold,
  ).length;
  const outOfStockCount = allItems.filter((i) => i.currentStock <= 0).length;

  const handleRestock = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const quantity = formData.get("quantity");
    const note = formData.get("note");
    restockMutation.mutate({
      itemId: modal.record.id,
      data: { quantity: Number(quantity), note },
    });
  };

  if (!isManagement) return null;
  if (!hasInventory) return <UpgradeBanner feature="INVENTORY" />;

  return (
    <div className="dashboard-inventory container mx-auto dashboard-panel p-5 rounded-lg text-[var(--dash-text)] max-h-[650px] overflow-y-auto scrollbar-hide">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Inventory Management</h2>
        <button
          onClick={() => setModal({ action: "add" })}
          className="dashboard-primary-button px-4 py-2 rounded-lg font-semibold"
        >
          Add Item
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="dashboard-inventory-stat">
          <h3>Total Tracked Items</h3>
          <p>{items.length}</p>
        </div>
        <div className="dashboard-inventory-stat">
          <h3>Low Stock Alerts</h3>
          <p className="text-2xl font-bold text-yellow-500 mt-1">
            {lowStockCount}
          </p>
        </div>
        <div className="dashboard-inventory-stat">
          <h3>Out of Stock</h3>
          <p className="text-2xl font-bold text-red-500 mt-1">
            {outOfStockCount}
          </p>
        </div>
      </div>

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              categoryFilter === "all"
                ? "dashboard-primary-button"
                : "dashboard-secondary-button"
            }`}
          >
            All ({allItems.length})
          </button>
          {categories.map((cat) => {
            const count = allItems.filter(
              (i) => i.menuItem?.category?.id === cat.id,
            ).length;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  categoryFilter === cat.id
                    ? "dashboard-primary-button"
                    : "dashboard-secondary-button"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-[var(--dash-muted)]">
          Loading inventory...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 bg-[var(--dash-surface-muted)] rounded-lg border border-dashed border-[var(--dash-border)] text-[var(--dash-muted)]">
          {categoryFilter === "all"
            ? "No inventory items tracked yet."
            : "No items in this category. Link items to menu items to filter by category."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const isCritical = item.stockPercent <= item.alertThreshold / 2;
            const isWarning =
              !isCritical && item.stockPercent <= item.alertThreshold;
            const barColor = isCritical
              ? "bg-red-500"
              : isWarning
                ? "bg-yellow-500"
                : "bg-[#02ca3a]";

            return (
              <div key={item.id} className="dashboard-inventory-card">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-[var(--dash-text)]">
                      {item.name}
                    </h3>
                    {item.variantLabel && (
                      <span className="dashboard-inventory-variant">
                        Variant: {item.variantLabel}
                      </span>
                    )}
                    {item.menuItem && (
                      <span className="text-xs text-[var(--dash-muted)] mt-0.5 block">
                        📦 {item.menuItem.name}
                        {item.menuItem.category
                          ? ` · ${item.menuItem.category.name}`
                          : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setModal({ action: "restock", record: item })
                      }
                      className="dashboard-text-button text-xs px-3 py-1 rounded font-semibold"
                    >
                      Restock
                    </button>
                    <button
                      onClick={() => setModal({ action: "edit", record: item })}
                      className="dashboard-secondary-button text-xs px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="dashboard-danger-button text-xs px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-1 mt-4">
                  <span className="text-[var(--dash-muted)]">
                    {item.currentStock.toFixed(1)} /{" "}
                    {item.totalStock.toFixed(1)} {item.unit}
                  </span>
                  <span
                    className={
                      isCritical
                        ? "text-red-500 font-bold"
                        : isWarning
                          ? "text-yellow-500 font-bold"
                          : "text-[#02ca3a] font-bold"
                    }
                  >
                    {item.stockPercent}%
                  </span>
                </div>

                <div className="w-full bg-[var(--dash-surface-muted)] rounded-full h-2">
                  <div
                    className={`${barColor} h-2 rounded-full transition-all duration-500`}
                    style={{
                      width: `${Math.min(100, Math.max(0, item.stockPercent))}%`,
                    }}
                  ></div>
                </div>

                {item.alertEnabled &&
                  item.stockPercent <= item.alertThreshold && (
                    <p
                      className={`text-xs mt-2 ${isCritical ? "text-red-400" : "text-yellow-400"}`}
                    >
                      ⚠️ Stock drops below threshold ({item.alertThreshold}%)
                    </p>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {/* Restock Modal */}
      {modal?.action === "restock" && (
        <div
          className="dashboard-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          role="dialog"
          aria-modal="true"
          aria-label={`Restock ${modal.record.name}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <form
            onSubmit={handleRestock}
            className="dashboard-detail-modal p-6 rounded-lg w-[400px]"
          >
            <h2 className="text-xl font-semibold mb-2">
              Restock {modal.record.name}
            </h2>
            <p className="text-sm text-[var(--dash-muted)] mb-4">
              Current stock: {modal.record.currentStock} {modal.record.unit}
            </p>

            <label className="block text-sm text-[var(--dash-muted)] mb-1">
              Quantity to add
            </label>
            <input
              name="quantity"
              type="number"
              min="0.01"
              step="any"
              className="dashboard-modal-input w-full bg-[var(--dash-surface-muted)] p-4 rounded-lg mb-4 focus:outline-none border border-[var(--dash-border)]"
              required
            />

            <label className="block text-sm text-[var(--dash-muted)] mb-1">
              Note (Optional)
            </label>
            <input
              name="note"
              type="text"
              placeholder="e.g. Received from supplier"
              className="dashboard-modal-input w-full bg-[var(--dash-surface-muted)] p-4 rounded-lg mb-6 focus:outline-none border border-[var(--dash-border)]"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="dashboard-secondary-button flex-1 px-4 py-3 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={restockMutation.isPending}
                className="dashboard-primary-button flex-1 font-bold rounded-lg py-3 disabled:opacity-60"
              >
                {restockMutation.isPending ? "Adding..." : "Add Stock"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(modal?.action === "add" || modal?.action === "edit") && (
        <InventoryModal
          action={modal.action}
          record={modal.record}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default InventoryManagement;
