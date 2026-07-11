import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { IoMdClose } from "react-icons/io";
import {
  deleteCategory,
  deleteMenuItem,
  getErrorMessage,
  getMenu,
  toggleMenuItem,
} from "../../https";
import MenuModal from "./MenuModal";
import PlanLimitBadge from "../shared/PlanLimitBadge";

// ─── Inline confirm dialog — no browser prompts ───────────────────────────────
const ConfirmDialog = ({ title, message, confirmLabel = "Delete", confirmClass = "dashboard-danger-button", onConfirm, onCancel, extra }) => (
  <div
    className="dashboard-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    role="dialog"
    aria-modal="true"
    onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
  >
    <div className="dashboard-detail-modal w-[400px] rounded-xl p-6 shadow-2xl">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-bold text-[var(--dash-text)]">{title}</h3>
        <button type="button" onClick={onCancel} className="text-[var(--dash-muted)] hover:text-[var(--dash-text)]">
          <IoMdClose size={20} />
        </button>
      </div>
      <p className="text-sm text-[var(--dash-muted)] mb-6">{message}</p>
      {extra}
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="dashboard-secondary-button px-4 py-2 rounded-lg font-semibold">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className={`${confirmClass} px-4 py-2 rounded-lg font-semibold`}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const MenuManagement = () => {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  // confirm: { type: "category"|"dish", record, blocked? }
  const [confirm, setConfirm] = useState(null);

  const menuQuery = useQuery({ queryKey: ["menu"], queryFn: getMenu });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["menu"] });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      refresh();
      setConfirm(null);
      enqueueSnackbar("Category deleted", { variant: "success" });
    },
    onError: (error) => {
      setConfirm(null);
      enqueueSnackbar(getErrorMessage(error), { variant: "error" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      refresh();
      setConfirm(null);
      enqueueSnackbar("Dish deleted", { variant: "success" });
    },
    onError: (error) => {
      // If the dish is referenced by orders, offer to archive (mark unavailable) instead
      const msg = getErrorMessage(error);
      const isReferenced =
        msg.toLowerCase().includes("referenced") ||
        msg.toLowerCase().includes("not found or is referenced");
      if (isReferenced) {
        setConfirm((prev) => ({ ...prev, blocked: true }));
      } else {
        setConfirm(null);
        enqueueSnackbar(msg, { variant: "error" });
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleMenuItem,
    onSuccess: () => {
      refresh();
      setConfirm(null);
      enqueueSnackbar("Dish marked as unavailable", { variant: "success" });
    },
    onError: (error) => {
      setConfirm(null);
      enqueueSnackbar(getErrorMessage(error), { variant: "error" });
    },
  });

  const handleConfirmDelete = () => {
    if (confirm.type === "category") {
      deleteCategoryMutation.mutate(confirm.record.id);
    } else {
      deleteItemMutation.mutate(confirm.record.id);
    }
  };

  const handleArchive = () => {
    toggleMutation.mutate({ itemId: confirm.record.id, available: false });
  };

  return (
    <div className="dashboard-management-panel container mx-auto p-5 rounded-lg max-h-[650px] overflow-y-auto scrollbar-hide">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Menu Management</h2>
          <PlanLimitBadge resource="menu_items" warnAt={5} />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setModal({ action: "category" })}
            className="dashboard-secondary-button px-4 py-2 rounded-lg"
          >
            Add Category
          </button>
          <button
            onClick={() => setModal({ action: "dishes" })}
            className="dashboard-primary-button px-4 py-2 rounded-lg font-semibold"
          >
            Add Dish
          </button>
        </div>
      </div>

      {(menuQuery.data?.data.data || []).map((category) => (
        <div
          key={category.id}
          className="dashboard-management-section mb-6 rounded-lg p-4"
        >
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-lg font-semibold">{category.name}</h3>
              <p className="text-xs text-[var(--dash-muted)]">
                Sort order: {category.sortOrder}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setModal({ action: "edit-category", record: category })
                }
                className="dashboard-link-button"
              >
                Edit
              </button>
              <button
                onClick={() =>
                  setConfirm({ type: "category", record: category })
                }
                className="dashboard-danger-link"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {category.menuItems.map((item) => (
              <div
                key={item.id}
                className="dashboard-management-row p-4 rounded-lg flex justify-between"
              >
                <div>
                  <p className="font-semibold">{item.name}</p>
                  {item.variants && item.variants.length > 0 ? (
                    <p className="text-sm text-[#ababab]">
                      Multiple Variants · {item.isVeg ? "Veg" : "Non-veg"}
                    </p>
                  ) : (
                    <p className="text-sm text-[#ababab]">
                      ₹{item.price.toFixed(2)} ·{" "}
                      {item.isVeg ? "Veg" : "Non-veg"}
                    </p>
                  )}
                  {item.variants && item.variants.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.variants.map((v) => (
                        <span
                          key={v.id}
                          className="dashboard-inventory-variant"
                        >
                          {v.label}: ₹{v.price}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-[var(--dash-muted)] mt-2">
                    {item.description || "No description"}
                  </p>
                  {/* Tax group badge */}
                  {item.taxGroup ? (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 5,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: item.taxGroup.type === "GST" ? "#e0f7fa"
                          : item.taxGroup.type === "VAT" ? "#f3e8ff"
                          : item.taxGroup.type === "INCLUDED" ? "#fef3c7"
                          : "#dcfce7",
                        color: item.taxGroup.type === "GST" ? "#0f9fa4"
                          : item.taxGroup.type === "VAT" ? "#7c3aed"
                          : item.taxGroup.type === "INCLUDED" ? "#d97706"
                          : "#16a34a",
                      }}
                    >
                      {item.taxGroup.name}
                    </span>
                  ) : (
                    <span style={{ display: "inline-block", marginTop: 5, fontSize: 10, color: "#9ca3af" }}>
                      No tax group
                    </span>
                  )}
                  <button
                    onClick={() =>
                      toggleMutation.mutate({
                        itemId: item.id,
                        available: !item.available,
                      })
                    }
                    className={`mt-2 text-xs px-2 py-1 rounded ${
                      item.available
                        ? "bg-[#285430] text-green-300"
                        : "bg-[#4a452e] text-yellow-300"
                    }`}
                  >
                    {item.available ? "Available" : "Unavailable"}
                  </button>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <button
                    onClick={() =>
                      setModal({ action: "edit-dishes", record: item })
                    }
                    className="dashboard-link-button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirm({ type: "dish", record: item })}
                    className="dashboard-danger-link"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── In-app confirm dialog ── */}
      {confirm && !confirm.blocked && (
        <ConfirmDialog
          title={
            confirm.type === "category"
              ? `Delete "${confirm.record.name}"?`
              : `Delete dish "${confirm.record.name}"?`
          }
          message={
            confirm.type === "category"
              ? "This will permanently delete the category. Make sure it has no menu items first."
              : "This will permanently delete the dish. If it has been ordered before, you'll be offered to archive it instead."
          }
          confirmLabel="Delete"
          confirmClass="dashboard-danger-button"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* ── Blocked: dish is referenced by orders ── */}
      {confirm?.blocked && (
        <ConfirmDialog
          title="Cannot delete this dish"
          message={`"${confirm.record.name}" has been ordered before and cannot be permanently deleted — order history would be lost. You can archive it instead, which hides it from the menu but keeps records intact.`}
          confirmLabel="Archive (mark unavailable)"
          confirmClass="dashboard-primary-button"
          onConfirm={handleArchive}
          onCancel={() => setConfirm(null)}
          extra={
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
              ⚠️ Archiving hides the dish from orders and the menu, but does not erase past order records.
            </div>
          }
        />
      )}

      {modal && (
        <MenuModal
          action={modal.action}
          record={modal.record}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default MenuManagement;
