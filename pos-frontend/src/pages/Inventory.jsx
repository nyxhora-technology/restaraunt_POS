import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
  getInventoryItems, deleteInventoryItem, restockInventoryItem, adjustInventoryItem,
  createInventoryItem, updateInventoryItem,
  getInventoryAlerts, markAllAlertsRead,
  getInventoryLogs, getInventoryAnalytics,
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getPurchaseOrders, createPurchaseOrder, markPOOrdered, receivePurchaseOrder, cancelPurchaseOrder,
  getStockCounts, startStockCount, getStockCount, updateStockCountItems, completeStockCount, cancelStockCount,
  getErrorMessage, getMenu, exportInventory,
} from "../https";
import useFeature from "../hooks/useFeature";
import useRole from "../hooks/useRole";
import UpgradeBanner from "../components/shared/UpgradeBanner";

// ─── Icons (inline SVG to avoid dep issues) ─────────────────────────────────
const Icon = {
  Box: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Truck: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  ClipList: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  Chart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  Bell: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Alert: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><triangle points="10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ─── Expiry Badge ─────────────────────────────────────────────────────────────
const ExpiryBadge = ({ daysUntilExpiry, isExpired }) => {
  if (daysUntilExpiry === null && !isExpired) return null;
  if (isExpired || daysUntilExpiry <= 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">Expired</span>;
  if (daysUntilExpiry <= 3) return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold">Exp. {daysUntilExpiry}d</span>;
  if (daysUntilExpiry <= 7) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold">Exp. {daysUntilExpiry}d</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Exp. {daysUntilExpiry}d</span>;
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const POStatusBadge = ({ status }) => {
  const map = {
    DRAFT: "bg-[var(--dash-surface-muted)] text-[var(--dash-muted)]",
    ORDERED: "bg-blue-500/20 text-blue-400",
    PARTIAL: "bg-yellow-500/20 text-yellow-400",
    DELIVERED: "bg-green-500/20 text-green-400",
    CANCELLED: "bg-red-500/20 text-red-400",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${map[status] || ""}`}>{status}</span>;
};

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
const Modal = ({ onClose, title, children, wide }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-[var(--dash-surface)] rounded-xl shadow-2xl border border-[var(--dash-border)] w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-[var(--dash-border)] sticky top-0 bg-[var(--dash-surface)] z-10">
          <h2 className="text-[var(--dash-text)] text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-[var(--dash-muted)] hover:text-[var(--dash-text)] transition-colors"><Icon.X /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ─── Field Input ──────────────────────────────────────────────────────────────
const Field = ({ label, children, half }) => (
  <div className={half ? "" : "col-span-2"}>
    <label className="block text-xs text-[var(--dash-muted)] mb-1 font-medium uppercase tracking-wide">{label}</label>
    {children}
  </div>
);
const Input = (props) => (
  <input {...props} className={`w-full bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] text-[var(--dash-text)] p-2.5 rounded-lg focus:outline-none focus:border-[var(--dash-primary)] transition-colors text-sm ${props.className || ""}`} />
);
const Select = ({ children, ...props }) => (
  <select {...props} className={`w-full bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] text-[var(--dash-text)] p-2.5 rounded-lg focus:outline-none focus:border-[var(--dash-primary)] text-sm ${props.className || ""}`}>
    {children}
  </select>
);
const Textarea = (props) => (
  <textarea {...props} className={`w-full bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] text-[var(--dash-text)] p-2.5 rounded-lg focus:outline-none focus:border-[var(--dash-primary)] text-sm resize-none ${props.className || ""}`} />
);

// ════════════════════════════════════════════════════════════════════════════════
// TAB 1: ITEMS
// ════════════════════════════════════════════════════════════════════════════════

const LOCATIONS = ["Walk-in Fridge", "Dry Storage", "Bar", "Freezer", "Kitchen Counter", "Pantry"];

const AddEditItemModal = ({ record, onClose, suppliers }) => {
  const queryClient = useQueryClient();
  const isEdit = !!record;
  const { data: menuData } = useQuery({ queryKey: ["menu"], queryFn: getMenu });
  const categories = menuData?.data?.data || [];
  const menuItems = categories.flatMap((cat) => (cat.menuItems || []).map((m) => ({ ...m, categoryName: cat.name })));

  const [formData, setFormData] = useState({
    name: record?.name || "",
    unit: record?.unit || "kg",
    currentStock: record?.currentStock ?? "",
    totalStock: record?.totalStock ?? "",
    alertThreshold: record?.alertThreshold ?? 30,
    alertEnabled: record?.alertEnabled ?? true,
    menuItemId: record?.menuItemId || "",
    variantLabel: record?.variantLabel || "",
    costPerUnit: record?.costPerUnit ?? "",
    supplier: record?.supplier || "",
    supplierId: record?.supplierId || "",
    expiryDate: record?.expiryDate ? record.expiryDate.split("T")[0] : "",
    reorderPoint: record?.reorderPoint ?? "",
    reorderQuantity: record?.reorderQuantity ?? "",
    location: record?.location || "",
  });

  const selectedMenuItem = menuItems.find((m) => m.id === formData.menuItemId);
  const variants = selectedMenuItem?.variants || [];

  const set = (k, v) => setFormData((p) => ({ ...p, [k]: v }));

  const addMut = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); enqueueSnackbar("Item added!", { variant: "success" }); onClose(); },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });
  const editMut = useMutation({
    mutationFn: updateInventoryItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); enqueueSnackbar("Item updated!", { variant: "success" }); onClose(); },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      currentStock: Number(formData.currentStock),
      totalStock: Number(formData.totalStock || formData.currentStock),
      alertThreshold: Number(formData.alertThreshold),
      costPerUnit: formData.costPerUnit !== "" ? Number(formData.costPerUnit) : null,
      reorderPoint: formData.reorderPoint !== "" ? Number(formData.reorderPoint) : null,
      reorderQuantity: formData.reorderQuantity !== "" ? Number(formData.reorderQuantity) : null,
      supplierId: formData.supplierId || null,
      menuItemId: formData.menuItemId || null,
      variantLabel: formData.variantLabel || null,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
      location: formData.location || null,
    };
    if (isEdit) editMut.mutate({ itemId: record.id, ...payload });
    else addMut.mutate(payload);
  };

  const isPending = addMut.isPending || editMut.isPending;

  return (
    <Modal onClose={onClose} title={isEdit ? "Edit Inventory Item" : "Add Inventory Item"} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <Field label="Item Name *" half><Input required value={formData.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Tomatoes" /></Field>
        <Field label="Unit *" half><Input required value={formData.unit} onChange={(e) => set("unit", e.target.value)} placeholder="kg, ml, units…" /></Field>

        <Field label="Current Stock *" half><Input required type="number" min="0" step="any" value={formData.currentStock} onChange={(e) => set("currentStock", e.target.value)} /></Field>
        <Field label="Total Capacity" half><Input type="number" min="0" step="any" value={formData.totalStock} onChange={(e) => set("totalStock", e.target.value)} placeholder="Defaults to current" /></Field>

        <Field label="Cost per Unit (₹)" half><Input type="number" min="0" step="any" value={formData.costPerUnit} onChange={(e) => set("costPerUnit", e.target.value)} placeholder="0.00" /></Field>
        <Field label="Storage Location" half>
          <Select value={formData.location} onChange={(e) => set("location", e.target.value)}>
            <option value="">-- Select location --</option>
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Field>

        <Field label="Expiry Date" half><Input type="date" value={formData.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} /></Field>
        <Field label="Supplier" half>
          <Select value={formData.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            <option value="">-- No supplier --</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>

        <Field label="Reorder Point" half><Input type="number" min="0" step="any" value={formData.reorderPoint} onChange={(e) => set("reorderPoint", e.target.value)} placeholder="e.g. 5" /></Field>
        <Field label="Reorder Quantity" half><Input type="number" min="0" step="any" value={formData.reorderQuantity} onChange={(e) => set("reorderQuantity", e.target.value)} placeholder="e.g. 20" /></Field>

        {/* Auto-deduction link */}
        <div className="col-span-2 border border-[var(--dash-border)] rounded-lg p-4 bg-[var(--dash-surface-muted)]">
          <h3 className="font-semibold text-sm text-[var(--dash-text)] mb-1">Auto-deduction Link <span className="text-[var(--dash-muted)] font-normal">(optional)</span></h3>
          <p className="text-xs text-[var(--dash-muted)] mb-3">Links this item to a menu item so stock is auto-deducted when ordered.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--dash-muted)] mb-1 block">Menu Item</label>
              <Select value={formData.menuItemId} onChange={(e) => { set("menuItemId", e.target.value); set("variantLabel", ""); }}>
                <option value="">-- No linked item --</option>
                {menuItems.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.categoryName})</option>)}
              </Select>
            </div>
            {variants.length > 0 && (
              <div>
                <label className="text-xs text-[var(--dash-muted)] mb-1 block">Variant</label>
                <Select value={formData.variantLabel} onChange={(e) => set("variantLabel", e.target.value)}>
                  <option value="">-- All variants --</option>
                  {variants.map((v) => <option key={v.id} value={v.label}>{v.label}</option>)}
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Alert settings */}
        <div className="col-span-2 border border-[var(--dash-border)] rounded-lg p-4 bg-[var(--dash-surface-muted)] flex gap-4 items-center">
          <div className="flex-1">
            <label className="text-xs text-[var(--dash-muted)] mb-1 block">Low Stock Alert Threshold (%)</label>
            <Input type="number" min="1" max="100" value={formData.alertThreshold} onChange={(e) => set("alertThreshold", e.target.value)} disabled={!formData.alertEnabled} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input type="checkbox" checked={formData.alertEnabled} onChange={(e) => set("alertEnabled", e.target.checked)} className="w-4 h-4 accent-[var(--dash-primary)]" />
            <span className="text-sm text-[var(--dash-text)]">Enable alerts</span>
          </label>
        </div>

        <div className="col-span-2 flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="dashboard-secondary-button flex-1 py-2.5 rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={isPending} className="dashboard-primary-button flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-60">
            {isPending ? "Saving…" : "Save Item"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const RestockModal = ({ item, onClose }) => {
  const queryClient = useQueryClient();
  const mut = useMutation({
    mutationFn: restockInventoryItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); enqueueSnackbar("Stock added!", { variant: "success" }); onClose(); },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  return (
    <Modal onClose={onClose} title={`Restock — ${item.name}`}>
      <p className="text-sm text-[var(--dash-muted)] mb-4">Current: <strong className="text-[var(--dash-text)]">{item.currentStock.toFixed(1)} {item.unit}</strong></p>
      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); mut.mutate({ itemId: item.id, data: { quantity: Number(fd.get("qty")), note: fd.get("note") } }); }}>
        <Field label="Quantity to Add"><Input name="qty" type="number" min="0.01" step="any" required autoFocus /></Field>
        <div className="mt-3"><Field label="Note (Optional)"><Input name="note" placeholder="e.g. Received from supplier" /></Field></div>
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="dashboard-secondary-button flex-1 py-2.5 rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="dashboard-primary-button flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-60">{mut.isPending ? "Adding…" : "Add Stock"}</button>
        </div>
      </form>
    </Modal>
  );
};

const AdjustModal = ({ item, onClose }) => {
  const queryClient = useQueryClient();
  const mut = useMutation({
    mutationFn: adjustInventoryItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); enqueueSnackbar("Stock adjusted!", { variant: "success" }); onClose(); },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  return (
    <Modal onClose={onClose} title={`Adjust Stock — ${item.name}`}>
      <p className="text-sm text-[var(--dash-muted)] mb-4">Current: <strong className="text-[var(--dash-text)]">{item.currentStock.toFixed(1)} {item.unit}</strong></p>
      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); const sign = fd.get("sign"); const qty = Number(fd.get("qty")); mut.mutate({ itemId: item.id, data: { quantity: sign === "-" ? -qty : qty, type: fd.get("type"), note: fd.get("note") } }); }}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-[var(--dash-muted)] mb-1 block">Direction</label>
            <Select name="sign" defaultValue="-">
              <option value="-">Remove (−)</option>
              <option value="+">Add (+)</option>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-[var(--dash-muted)] mb-1 block">Quantity</label>
            <Input name="qty" type="number" min="0.01" step="any" required />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs text-[var(--dash-muted)] mb-1 block">Type</label>
          <Select name="type" defaultValue="ADJUSTMENT">
            <option value="ADJUSTMENT">Adjustment</option>
            <option value="WASTE">Waste / Spoilage</option>
          </Select>
        </div>
        <div className="mt-3"><Field label="Note"><Input name="note" placeholder="Reason for adjustment" /></Field></div>
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="dashboard-secondary-button flex-1 py-2.5 rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="dashboard-primary-button flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-60">{mut.isPending ? "Saving…" : "Apply"}</button>
        </div>
      </form>
    </Modal>
  );
};

const ItemCard = ({ item, onRestock, onAdjust, onEdit, onDelete }) => {
  const isCritical = item.stockPercent <= item.alertThreshold / 2;
  const isWarning = !isCritical && item.stockPercent <= item.alertThreshold;
  const barColor = isCritical ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-green-500";
  const textColor = isCritical ? "text-red-400" : isWarning ? "text-yellow-400" : "text-green-400";

  return (
    <div className="dashboard-inventory-card p-4 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] hover:border-[var(--dash-primary)] transition-all duration-200">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[var(--dash-text)] truncate">{item.name}</h3>
            {item.needsReorder && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold shrink-0">🔁 Reorder</span>}
            <ExpiryBadge daysUntilExpiry={item.daysUntilExpiry} isExpired={item.isExpired} />
          </div>
          {item.location && <p className="text-xs text-[var(--dash-muted)] mt-0.5">📍 {item.location}</p>}
          {item.supplierRef && <p className="text-xs text-[var(--dash-muted)]">🏭 {item.supplierRef.name}</p>}
          {item.menuItem && <p className="text-xs text-[var(--dash-muted)]">📦 {item.menuItem.name}{item.menuItem.category ? ` · ${item.menuItem.category.name}` : ""}</p>}
        </div>
        <div className="flex gap-1 ml-2 shrink-0">
          <button onClick={() => onRestock(item)} title="Restock" className="dashboard-text-button p-1.5 rounded text-xs"><Icon.Refresh /></button>
          <button onClick={() => onAdjust(item)} title="Adjust" className="dashboard-secondary-button p-1.5 rounded text-xs">±</button>
          <button onClick={() => onEdit(item)} title="Edit" className="dashboard-secondary-button p-1.5 rounded"><Icon.Edit /></button>
          <button onClick={() => onDelete(item.id)} title="Delete" className="dashboard-danger-button p-1.5 rounded"><Icon.Trash /></button>
        </div>
      </div>

      <div className="flex justify-between text-xs mt-3 mb-1">
        <span className="text-[var(--dash-muted)]">{item.currentStock.toFixed(1)} / {item.totalStock.toFixed(1)} {item.unit}</span>
        <span className={`font-bold ${textColor}`}>{item.stockPercent}%</span>
      </div>
      <div className="w-full bg-[var(--dash-surface-muted)] rounded-full h-1.5">
        <div className={`${barColor} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(0, item.stockPercent))}%` }} />
      </div>
      {item.costPerUnit && (
        <p className="text-xs text-[var(--dash-muted)] mt-2">Value: ₹{(item.currentStock * item.costPerUnit).toFixed(2)}</p>
      )}
    </div>
  );
};

const ItemsTab = ({ suppliers }) => {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data, isLoading } = useQuery({ queryKey: ["inventory"], queryFn: getInventoryItems });
  const deleteMut = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); enqueueSnackbar("Item deleted", { variant: "success" }); },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const allItems = data?.data?.data || [];
  const categories = [];
  const seenCatIds = new Set();
  allItems.forEach((item) => { const cat = item.menuItem?.category; if (cat && !seenCatIds.has(cat.id)) { seenCatIds.add(cat.id); categories.push(cat); } });

  const lowCount = allItems.filter((i) => i.stockPercent <= i.alertThreshold).length;
  const reorderCount = allItems.filter((i) => i.needsReorder).length;
  const expiringCount = allItems.filter((i) => i.daysUntilExpiry !== null && i.daysUntilExpiry <= 7).length;
  const totalValue = allItems.reduce((s, i) => s + (i.currentStock * (i.costPerUnit || 0)), 0);

  let items = allItems;
  if (search) items = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
  if (categoryFilter !== "all") items = items.filter((i) => i.menuItem?.category?.id === categoryFilter);
  if (statusFilter === "low") items = items.filter((i) => i.stockPercent <= i.alertThreshold && i.currentStock > 0);
  if (statusFilter === "critical") items = items.filter((i) => i.stockPercent <= i.alertThreshold / 2);
  if (statusFilter === "out") items = items.filter((i) => i.currentStock <= 0);
  if (statusFilter === "reorder") items = items.filter((i) => i.needsReorder);
  if (statusFilter === "expiring") items = items.filter((i) => i.daysUntilExpiry !== null && i.daysUntilExpiry <= 7);
  if (statusFilter === "ok") items = items.filter((i) => i.stockPercent > i.alertThreshold && i.currentStock > 0);

  return (
    <div>
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Total Items", value: allItems.length, color: "text-[var(--dash-text)]" },
          { label: "Inventory Value", value: `₹${totalValue.toFixed(0)}`, color: "text-green-400" },
          { label: "Low Stock", value: lowCount, color: "text-yellow-400" },
          { label: "Needs Reorder", value: reorderCount, color: "text-blue-400" },
          { label: "Expiring ≤7d", value: expiringCount, color: "text-orange-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="dashboard-inventory-stat rounded-xl p-3 border border-[var(--dash-border)] bg-[var(--dash-surface)]">
            <p className="text-xs text-[var(--dash-muted)] mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-muted)]"><Icon.Search /></span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="w-full pl-9 pr-3 py-2 bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] text-[var(--dash-text)] rounded-lg text-sm focus:outline-none" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto min-w-[130px]">
          <option value="all">All Status</option>
          <option value="ok">✅ OK</option>
          <option value="low">🟡 Low Stock</option>
          <option value="critical">🔴 Critical</option>
          <option value="out">⛔ Out of Stock</option>
          <option value="reorder">🔁 Needs Reorder</option>
          <option value="expiring">🟠 Expiring Soon</option>
        </Select>
        {categories.length > 0 && (
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto min-w-[130px]">
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        <button onClick={() => setModal({ action: "add" })} className="dashboard-primary-button px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5">
          <Icon.Plus /> Add Item
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-[var(--dash-muted)]">Loading inventory…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[var(--dash-border)] rounded-xl text-[var(--dash-muted)]">
          {search || statusFilter !== "all" || categoryFilter !== "all" ? "No items match your filter." : "No inventory items yet. Add your first item!"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} suppliers={suppliers}
              onRestock={(i) => setModal({ action: "restock", item: i })}
              onAdjust={(i) => setModal({ action: "adjust", item: i })}
              onEdit={(i) => setModal({ action: "edit", item: i })}
              onDelete={(id) => { if (confirm("Delete this item?")) deleteMut.mutate(id); }}
            />
          ))}
        </div>
      )}

      {modal?.action === "add" && <AddEditItemModal onClose={() => setModal(null)} suppliers={suppliers} />}
      {modal?.action === "edit" && <AddEditItemModal record={modal.item} onClose={() => setModal(null)} suppliers={suppliers} />}
      {modal?.action === "restock" && <RestockModal item={modal.item} onClose={() => setModal(null)} />}
      {modal?.action === "adjust" && <AdjustModal item={modal.item} onClose={() => setModal(null)} />}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// TAB 2: SUPPLIERS
// ════════════════════════════════════════════════════════════════════════════════

const SupplierModal = ({ record, onClose }) => {
  const queryClient = useQueryClient();
  const isEdit = !!record;
  const [form, setForm] = useState({
    name: record?.name || "", contactName: record?.contactName || "", phone: record?.phone || "",
    email: record?.email || "", address: record?.address || "", notes: record?.notes || "",
    leadTimeDays: record?.leadTimeDays ?? 1,
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const addMut = useMutation({ mutationFn: createSupplier, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); enqueueSnackbar("Supplier added!", { variant: "success" }); onClose(); }, onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }) });
  const editMut = useMutation({ mutationFn: updateSupplier, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); enqueueSnackbar("Supplier updated!", { variant: "success" }); onClose(); }, onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }) });
  const isPending = addMut.isPending || editMut.isPending;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) editMut.mutate({ id: record.id, ...form });
    else addMut.mutate(form);
  };

  return (
    <Modal onClose={onClose} title={isEdit ? "Edit Supplier" : "Add Supplier"} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <Field label="Supplier Name *"><Input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Fresh Farms Pvt Ltd" /></Field>
        <Field label="Contact Person" half><Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="e.g. Ramesh Kumar" /></Field>
        <Field label="Phone" half><Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" /></Field>
        <Field label="Email" half><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="supplier@email.com" /></Field>
        <Field label="Lead Time (days)" half><Input type="number" min="0" value={form.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} /></Field>
        <Field label="Address"><Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Supplier address…" /></Field>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Payment terms, special instructions…" /></Field>
        <div className="col-span-2 flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="dashboard-secondary-button flex-1 py-2.5 rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={isPending} className="dashboard-primary-button flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-60">{isPending ? "Saving…" : "Save Supplier"}</button>
        </div>
      </form>
    </Modal>
  );
};

const SuppliersTab = () => {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: getSuppliers });
  const suppliers = data?.data?.data || [];
  const delMut = useMutation({ mutationFn: deleteSupplier, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); enqueueSnackbar("Supplier deleted", { variant: "success" }); }, onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }) });

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-[var(--dash-text)] font-semibold">{suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}</h3>
        <button onClick={() => setModal({ action: "add" })} className="dashboard-primary-button px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"><Icon.Plus /> Add Supplier</button>
      </div>
      {isLoading ? <div className="text-center py-16 text-[var(--dash-muted)]">Loading…</div> : suppliers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[var(--dash-border)] rounded-xl text-[var(--dash-muted)]">No suppliers yet. Add your first one!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suppliers.map((s) => (
            <div key={s.id} className="p-4 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] hover:border-[var(--dash-primary)] transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-[var(--dash-text)]">{s.name}</h3>
                  {s.contactName && <p className="text-sm text-[var(--dash-muted)]">👤 {s.contactName}</p>}
                  {s.phone && <p className="text-sm text-[var(--dash-muted)]">📞 {s.phone}</p>}
                  {s.email && <p className="text-sm text-[var(--dash-muted)]">✉️ {s.email}</p>}
                  <p className="text-xs text-[var(--dash-muted)] mt-1">🕒 Lead time: {s.leadTimeDays}d · {s._count?.inventoryItems || 0} items · {s._count?.purchaseOrders || 0} POs</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ action: "edit", record: s })} className="dashboard-secondary-button p-1.5 rounded"><Icon.Edit /></button>
                  <button onClick={() => { if (confirm("Delete this supplier?")) delMut.mutate(s.id); }} className="dashboard-danger-button p-1.5 rounded"><Icon.Trash /></button>
                </div>
              </div>
              {s.notes && <p className="text-xs text-[var(--dash-muted)] mt-2 italic border-t border-[var(--dash-border)] pt-2">&ldquo;{s.notes}&rdquo;</p>}
            </div>
          ))}
        </div>
      )}
      {modal?.action === "add" && <SupplierModal onClose={() => setModal(null)} />}
      {modal?.action === "edit" && <SupplierModal record={modal.record} onClose={() => setModal(null)} />}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// TAB 3: PURCHASE ORDERS
// ════════════════════════════════════════════════════════════════════════════════

const CreatePOModal = ({ onClose, suppliers, inventoryItems }) => {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [poItems, setPoItems] = useState([{ inventoryItemId: "", itemName: "", quantity: "", unit: "", costPerUnit: "" }]);

  const addRow = () => setPoItems((p) => [...p, { inventoryItemId: "", itemName: "", quantity: "", unit: "", costPerUnit: "" }]);
  const removeRow = (i) => setPoItems((p) => p.filter((_, idx) => idx !== i));
  const updateRow = (i, k, v) => setPoItems((p) => p.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  const handleItemSelect = (i, itemId) => {
    const inv = inventoryItems.find((it) => it.id === itemId);
    updateRow(i, "inventoryItemId", itemId);
    if (inv) { updateRow(i, "itemName", inv.name); updateRow(i, "unit", inv.unit); updateRow(i, "costPerUnit", inv.costPerUnit || ""); }
  };

  const totalCost = poItems.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.costPerUnit) || 0), 0);

  const mut = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] }); enqueueSnackbar("Purchase order created!", { variant: "success" }); onClose(); },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mut.mutate({
      supplierId: supplierId || null, expectedDelivery: expectedDelivery ? new Date(expectedDelivery).toISOString() : null, notes: notes || null,
      items: poItems.filter((r) => r.itemName && r.quantity).map((r) => ({ ...r, quantity: Number(r.quantity), costPerUnit: Number(r.costPerUnit || 0), inventoryItemId: r.inventoryItemId || null })),
    });
  };

  return (
    <Modal onClose={onClose} title="Create Purchase Order" wide>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-[var(--dash-muted)] mb-1 block">Supplier</label>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">-- Select supplier (optional) --</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs text-[var(--dash-muted)] mb-1 block">Expected Delivery</label>
            <Input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-[var(--dash-muted)] mb-1 block">Notes</label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Order notes…" />
          </div>
        </div>

        <h4 className="font-semibold text-sm text-[var(--dash-text)] mb-2">Order Items</h4>
        <div className="space-y-2 mb-3">
          {poItems.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <Select value={row.inventoryItemId} onChange={(e) => handleItemSelect(i, e.target.value)} className="text-xs">
                  <option value="">-- Select item --</option>
                  {inventoryItems.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </Select>
              </div>
              <div className="col-span-3"><Input placeholder="Item name" value={row.itemName} onChange={(e) => updateRow(i, "itemName", e.target.value)} className="text-xs" required /></div>
              <div className="col-span-1"><Input type="number" placeholder="Qty" min="0.01" step="any" value={row.quantity} onChange={(e) => updateRow(i, "quantity", e.target.value)} className="text-xs" required /></div>
              <div className="col-span-2"><Input placeholder="Unit" value={row.unit} onChange={(e) => updateRow(i, "unit", e.target.value)} className="text-xs" required /></div>
              <div className="col-span-1"><Input type="number" placeholder="₹/u" min="0" step="any" value={row.costPerUnit} onChange={(e) => updateRow(i, "costPerUnit", e.target.value)} className="text-xs" /></div>
              <div className="col-span-1 flex justify-center">
                {poItems.length > 1 && <button type="button" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-300"><Icon.X /></button>}
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addRow} className="text-xs text-[var(--dash-primary)] hover:underline flex items-center gap-1 mb-4"><Icon.Plus /> Add row</button>

        <div className="flex justify-between items-center text-sm text-[var(--dash-muted)] border-t border-[var(--dash-border)] pt-3 mb-4">
          <span>Total Cost:</span>
          <span className="font-bold text-[var(--dash-text)] text-base">₹{totalCost.toFixed(2)}</span>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="dashboard-secondary-button flex-1 py-2.5 rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="dashboard-primary-button flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-60">{mut.isPending ? "Creating…" : "Create Draft PO"}</button>
        </div>
      </form>
    </Modal>
  );
};

const ReceivePOModal = ({ po, onClose }) => {
  const queryClient = useQueryClient();
  const [received, setReceived] = useState(() => po.items.reduce((acc, item) => ({ ...acc, [item.id]: item.quantity }), {}));

  const mut = useMutation({
    mutationFn: receivePurchaseOrder,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] }); queryClient.invalidateQueries({ queryKey: ["inventory"] }); enqueueSnackbar("Delivery received! Stock updated.", { variant: "success" }); onClose(); },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mut.mutate({ id: po.id, receivedItems: Object.entries(received).map(([purchaseOrderItemId, receivedQuantity]) => ({ purchaseOrderItemId, receivedQuantity: Number(receivedQuantity) })) });
  };

  return (
    <Modal onClose={onClose} title={`Receive Delivery — PO #${po.id.slice(-6).toUpperCase()}`} wide>
      <p className="text-sm text-[var(--dash-muted)] mb-4">Enter how much of each item you actually received. Stock will be auto-updated.</p>
      <form onSubmit={handleSubmit}>
        <div className="space-y-3 mb-5">
          {po.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--dash-surface-muted)] border border-[var(--dash-border)]">
              <div className="flex-1">
                <p className="font-medium text-sm text-[var(--dash-text)]">{item.itemName}</p>
                <p className="text-xs text-[var(--dash-muted)]">Ordered: {item.quantity} {item.unit}</p>
              </div>
              <div className="w-28">
                <label className="text-xs text-[var(--dash-muted)] block mb-1">Received</label>
                <Input type="number" min="0" step="any" value={received[item.id] ?? item.quantity} onChange={(e) => setReceived((p) => ({ ...p, [item.id]: e.target.value }))} className="text-sm" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="dashboard-secondary-button flex-1 py-2.5 rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="dashboard-primary-button flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-60">{mut.isPending ? "Processing…" : "✅ Mark Received"}</button>
        </div>
      </form>
    </Modal>
  );
};

const PurchaseOrdersTab = ({ suppliers, inventoryItems }) => {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ["purchaseOrders"], queryFn: getPurchaseOrders });
  const orders = data?.data?.data || [];

  const orderMut = useMutation({ mutationFn: markPOOrdered, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] }); enqueueSnackbar("Marked as ordered!", { variant: "success" }); }, onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }) });
  const cancelMut = useMutation({ mutationFn: cancelPurchaseOrder, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] }); enqueueSnackbar("PO cancelled", { variant: "success" }); }, onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }) });

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-[var(--dash-text)] font-semibold">{orders.length} purchase order{orders.length !== 1 ? "s" : ""}</h3>
        <button onClick={() => setModal({ action: "create" })} className="dashboard-primary-button px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"><Icon.Plus /> New PO</button>
      </div>

      {isLoading ? <div className="text-center py-16 text-[var(--dash-muted)]">Loading…</div> : orders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[var(--dash-border)] rounded-xl text-[var(--dash-muted)]">No purchase orders yet. Create your first one!</div>
      ) : (
        <div className="space-y-3">
          {orders.map((po) => (
            <div key={po.id} className="p-4 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] hover:border-[var(--dash-primary)] transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-[var(--dash-muted)]">#{po.id.slice(-6).toUpperCase()}</span>
                    <POStatusBadge status={po.status} />
                  </div>
                  {po.supplier && <p className="text-sm text-[var(--dash-text)] font-medium">🏭 {po.supplier.name}</p>}
                  <p className="text-xs text-[var(--dash-muted)]">{po.items?.length || 0} items · ₹{po.totalCost.toFixed(2)}</p>
                  {po.expectedDelivery && <p className="text-xs text-[var(--dash-muted)]">Expected: {new Date(po.expectedDelivery).toLocaleDateString()}</p>}
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {po.status === "DRAFT" && <button onClick={() => orderMut.mutate(po.id)} className="dashboard-secondary-button text-xs px-3 py-1.5 rounded-lg">Mark Ordered</button>}
                  {["ORDERED", "PARTIAL"].includes(po.status) && <button onClick={() => setModal({ action: "receive", po })} className="dashboard-primary-button text-xs px-3 py-1.5 rounded-lg">Receive Delivery</button>}
                  {["DRAFT", "ORDERED"].includes(po.status) && <button onClick={() => { if (confirm("Cancel this PO?")) cancelMut.mutate(po.id); }} className="dashboard-danger-button text-xs px-3 py-1.5 rounded-lg">Cancel</button>}
                </div>
              </div>
              {po.items && po.items.length > 0 && (
                <div className="mt-3 border-t border-[var(--dash-border)] pt-2 grid grid-cols-2 md:grid-cols-4 gap-1">
                  {po.items.slice(0, 4).map((item) => (
                    <div key={item.id} className="text-xs text-[var(--dash-muted)]">{item.itemName} <span className="text-[var(--dash-text)]">×{item.quantity} {item.unit}</span></div>
                  ))}
                  {po.items.length > 4 && <div className="text-xs text-[var(--dash-muted)]">+{po.items.length - 4} more…</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal?.action === "create" && <CreatePOModal onClose={() => setModal(null)} suppliers={suppliers} inventoryItems={inventoryItems} />}
      {modal?.action === "receive" && <ReceivePOModal po={modal.po} onClose={() => setModal(null)} />}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// TAB 4: STOCK COUNT
// ════════════════════════════════════════════════════════════════════════════════

const StockCountTab = () => {
  const queryClient = useQueryClient();
  const [activeCount, setActiveCount] = useState(null);
  const [countData, setCountData] = useState({});
  const [notes] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["stockCounts"], queryFn: getStockCounts });
  const counts = data?.data?.data || [];
  const inProgress = counts.find((c) => c.status === "IN_PROGRESS");

  const { data: countDetail } = useQuery({
    queryKey: ["stockCount", activeCount],
    queryFn: () => getStockCount(activeCount),
    enabled: !!activeCount,
  });
  const detail = countDetail?.data?.data;

  const startMut = useMutation({
    mutationFn: startStockCount,
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ["stockCounts"] }); setActiveCount(res.data.data.id); enqueueSnackbar("Stock count started!", { variant: "success" }); },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const saveMut = useMutation({
    mutationFn: updateStockCountItems,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stockCount", activeCount] }); enqueueSnackbar("Counts saved!", { variant: "success" }); },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const completeMut = useMutation({
    mutationFn: completeStockCount,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stockCounts"] }); queryClient.invalidateQueries({ queryKey: ["inventory"] }); setActiveCount(null); setCountData({}); enqueueSnackbar("Stock count complete! Stock adjusted.", { variant: "success" }); },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const cancelMut = useMutation({
    mutationFn: cancelStockCount,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stockCounts"] }); setActiveCount(null); setCountData({}); enqueueSnackbar("Count cancelled", { variant: "success" }); },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: "error" }),
  });

  const handleSave = () => {
    if (!detail) return;
    const updates = detail.items
      .filter((item) => countData[item.id] !== undefined)
      .map((item) => ({ stockCountItemId: item.id, actualStock: Number(countData[item.id]), note: null }));
    if (updates.length === 0) return enqueueSnackbar("No changes to save", { variant: "info" });
    saveMut.mutate({ id: activeCount, updates });
  };

  const handleComplete = () => {
    if (!confirm("Complete the count? This will adjust all entered stock values.")) return;
    completeMut.mutate(activeCount);
  };

  const filteredItems = detail?.items?.filter((item) => !search || item.inventoryItem.name.toLowerCase().includes(search.toLowerCase())) || [];

  if (activeCount && detail) {
    const entered = detail.items.filter((i) => countData[i.id] !== undefined || i.actualStock !== null).length;
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[var(--dash-text)]">📋 Stock Count in Progress</h3>
            <p className="text-xs text-[var(--dash-muted)]">{entered} / {detail.items.length} items entered</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => cancelMut.mutate(activeCount)} className="dashboard-danger-button px-3 py-2 rounded-lg text-sm">Cancel Count</button>
            <button onClick={handleSave} disabled={saveMut.isPending} className="dashboard-secondary-button px-3 py-2 rounded-lg text-sm">{saveMut.isPending ? "Saving…" : "Save Progress"}</button>
            <button onClick={handleComplete} disabled={completeMut.isPending} className="dashboard-primary-button px-4 py-2 rounded-lg text-sm font-bold">{completeMut.isPending ? "Completing…" : "✅ Complete Count"}</button>
          </div>
        </div>

        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-muted)]"><Icon.Search /></span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="w-full pl-9 pr-3 py-2 bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] text-[var(--dash-text)] rounded-lg text-sm focus:outline-none" />
        </div>

        <div className="space-y-2">
          {filteredItems.map((item) => {
            const current = countData[item.id] !== undefined ? countData[item.id] : (item.actualStock ?? "");
            const variance = current !== "" ? (Number(current) - item.expectedStock).toFixed(2) : null;
            return (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] hover:border-[var(--dash-primary)] transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-sm text-[var(--dash-text)]">{item.inventoryItem.name}</p>
                  <p className="text-xs text-[var(--dash-muted)]">Expected: {item.expectedStock.toFixed(1)} {item.inventoryItem.unit}
                    {item.inventoryItem.location ? ` · 📍 ${item.inventoryItem.location}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28">
                    <input type="number" min="0" step="any" value={current} onChange={(e) => setCountData((p) => ({ ...p, [item.id]: e.target.value }))}
                      placeholder="Count…"
                      className="w-full bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] text-[var(--dash-text)] p-2 rounded-lg text-sm focus:outline-none focus:border-[var(--dash-primary)]" />
                  </div>
                  {variance !== null && (
                    <span className={`text-sm font-bold w-16 text-right ${Number(variance) > 0 ? "text-green-400" : Number(variance) < 0 ? "text-red-400" : "text-[var(--dash-muted)]"}`}>
                      {Number(variance) > 0 ? "+" : ""}{variance}
                    </span>
                  )}
                  {current !== "" && <span className="text-green-400"><Icon.Check /></span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-[var(--dash-text)] font-semibold">Stock Counts / Audits</h3>
        {inProgress ? (
          <button onClick={() => setActiveCount(inProgress.id)} className="dashboard-primary-button px-4 py-2 rounded-lg text-sm font-semibold">Resume Count</button>
        ) : (
          <button onClick={() => startMut.mutate({ notes })} disabled={startMut.isPending} className="dashboard-primary-button px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5">
            <Icon.Plus /> {startMut.isPending ? "Starting…" : "Start New Count"}
          </button>
        )}
      </div>

      {isLoading ? <div className="text-center py-16 text-[var(--dash-muted)]">Loading…</div> : counts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[var(--dash-border)] rounded-xl text-[var(--dash-muted)]">No stock counts yet. Start your first physical inventory count!</div>
      ) : (
        <div className="space-y-2">
          {counts.map((count) => {
            const sc = { IN_PROGRESS: "🟡 In Progress", COMPLETED: "✅ Completed", CANCELLED: "❌ Cancelled" };
            return (
              <div key={count.id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--dash-text)]">{sc[count.status] || count.status}</span>
                    <span className="text-xs text-[var(--dash-muted)]">#{count.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-[var(--dash-muted)]">{count._count?.items || 0} items · {new Date(count.createdAt).toLocaleDateString()}</p>
                  {count.completedAt && <p className="text-xs text-green-400">Completed: {new Date(count.completedAt).toLocaleDateString()}</p>}
                </div>
                {count.status === "IN_PROGRESS" && (
                  <button onClick={() => setActiveCount(count.id)} className="dashboard-secondary-button px-3 py-1.5 rounded-lg text-sm">Resume</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// TAB 5: REPORTS
// ════════════════════════════════════════════════════════════════════════════════

const ReportsTab = () => {
  const [period, setPeriod] = useState("30");
  const { data, isLoading } = useQuery({
    queryKey: ["inventoryAnalytics", period],
    queryFn: () => getInventoryAnalytics({ period }),
  });
  const stats = data?.data?.data;

  const { data: logsData } = useQuery({ queryKey: ["inventoryLogs"], queryFn: () => getInventoryLogs({ limit: 50 }) });
  const logs = logsData?.data?.data || [];

  const logTypeColor = { RESTOCK: "text-green-400", SALE: "text-blue-400", ADJUSTMENT: "text-yellow-400", WASTE: "text-red-400", STOCK_COUNT: "text-purple-400", PO_RECEIVE: "text-cyan-400" };
  const logTypeLabel = { RESTOCK: "📦 Restock", SALE: "🧾 Sale", ADJUSTMENT: "⚙️ Adjustment", WASTE: "🗑️ Waste", STOCK_COUNT: "📋 Stock Count", PO_RECEIVE: "🚚 PO Received" };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-[var(--dash-text)]">Inventory Reports</h3>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-auto">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </Select>
      </div>

      {isLoading ? <div className="text-center py-10 text-[var(--dash-muted)]">Loading analytics…</div> : stats && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Stock Value", value: `₹${stats.totalValue.toFixed(0)}`, sub: "Current inventory", color: "text-green-400" },
              { label: "Waste Cost", value: `₹${stats.wasteValue.toFixed(0)}`, sub: `Last ${period}d`, color: "text-red-400" },
              { label: "COGS (Deducted)", value: `₹${stats.salesValue.toFixed(0)}`, sub: `Last ${period}d`, color: "text-blue-400" },
              { label: "Out of Stock", value: stats.outOfStockCount, sub: "Items", color: "text-orange-400" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="p-4 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)]">
                <p className="text-xs text-[var(--dash-muted)] mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-[var(--dash-muted)]">{sub}</p>
              </div>
            ))}
          </div>

          {/* Needs Reorder */}
          {stats.lowStockItems.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-[var(--dash-text)] mb-2">🔁 Needs Reorder ({stats.lowStockCount})</h4>
              <div className="space-y-2">
                {stats.lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                    <span className="text-sm text-[var(--dash-text)] font-medium">{item.name}</span>
                    <div className="text-right">
                      <span className="text-xs text-[var(--dash-muted)]">{item.currentStock.toFixed(1)} / {item.reorderPoint} {item.unit}</span>
                      {item.reorderQuantity && <span className="text-xs text-blue-400 ml-2">Suggest: +{item.reorderQuantity} {item.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiring Items */}
          {stats.expiringItems.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-[var(--dash-text)] mb-2">🟠 Expiring Soon ({stats.expiringCount})</h4>
              <div className="space-y-2">
                {stats.expiringItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
                    <span className="text-sm text-[var(--dash-text)] font-medium">{item.name}</span>
                    <ExpiryBadge daysUntilExpiry={item.daysUntilExpiry} isExpired={item.isExpired} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Waste Items */}
          {stats.topWasteItems.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-[var(--dash-text)] mb-2">🗑️ Top Waste Items (last {period}d)</h4>
              <div className="space-y-2">
                {stats.topWasteItems.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)]">
                    <span className="text-lg font-bold text-[var(--dash-muted)] w-6 text-center">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-[var(--dash-text)]">{item.name}</p>
                      <p className="text-xs text-[var(--dash-muted)]">Qty wasted: {item.quantity.toFixed(2)}</p>
                    </div>
                    <span className="text-red-400 font-bold text-sm">₹{item.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Movement Log */}
      <div>
        <h4 className="font-semibold text-sm text-[var(--dash-text)] mb-2">📜 Recent Movement Log</h4>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-[var(--dash-muted)] border border-dashed border-[var(--dash-border)] rounded-xl">No movement logs yet.</div>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-hide">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--dash-surface-muted)] transition-colors">
                <span className={`text-xs font-bold w-24 shrink-0 ${logTypeColor[log.type] || "text-[var(--dash-muted)]"}`}>{logTypeLabel[log.type] || log.type}</span>
                <span className="flex-1 text-sm text-[var(--dash-text)] truncate">{log.inventoryItem?.name}</span>
                <span className={`text-sm font-mono font-bold ${log.quantity >= 0 ? "text-green-400" : "text-red-400"}`}>{log.quantity >= 0 ? "+" : ""}{log.quantity.toFixed(2)}</span>
                <span className="text-xs text-[var(--dash-muted)] shrink-0">{new Date(log.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN INVENTORY PAGE
// ════════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "items", label: "Items", icon: <Icon.Box /> },
  { id: "suppliers", label: "Suppliers", icon: <Icon.Users /> },
  { id: "purchase-orders", label: "Purchase Orders", icon: <Icon.Truck /> },
  { id: "stock-count", label: "Stock Count", icon: <Icon.ClipList /> },
  { id: "reports", label: "Reports", icon: <Icon.Chart /> },
];

const Inventory = () => {
  const { hasInventory, hasExport } = useFeature();
  const { isManagement } = useRole();
  const canAccessInventory = isManagement && hasInventory;
  const [activeTab, setActiveTab] = useState("items");
  const [showAlerts, setShowAlerts] = useState(false);
  const queryClient = useQueryClient();


  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () =>
      canAccessInventory
        ? getSuppliers()
        : Promise.resolve({ data: { data: [] } }),
    enabled: canAccessInventory,
  });
  const { data: itemsData } = useQuery({
    queryKey: ["inventory"],
    queryFn: () =>
      canAccessInventory
        ? getInventoryItems()
        : Promise.resolve({ data: { data: [] } }),
    enabled: canAccessInventory,
  });
  const { data: alertsData } = useQuery({
    queryKey: ["inventoryAlerts"],
    queryFn: () =>
      canAccessInventory
        ? getInventoryAlerts()
        : Promise.resolve({ data: { data: [] } }),
    enabled: canAccessInventory,
  });

  const suppliers = suppliersData?.data?.data || [];
  const inventoryItems = itemsData?.data?.data || [];
  const alerts = alertsData?.data?.data || [];
  const unreadAlerts = alerts.filter((a) => !a.isRead);

  const markAllMut = useMutation({ mutationFn: markAllAlertsRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventoryAlerts"] }) });

  const handleExport = async () => {
    if (!hasExport) return;
    try {
      const response = await exportInventory();
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        response.headers["content-disposition"]?.match(/filename="([^"]+)"/)?.[1] ||
        `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      enqueueSnackbar("Inventory export could not be generated.", { variant: "error" });
    }
  };

  if (!isManagement) return null;

  if (!hasInventory) return (
    <div className="p-6">
      <UpgradeBanner feature="INVENTORY" />
    </div>
  );

  return (
    <div className="min-h-screen text-[var(--dash-text)] p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dash-text)]">Inventory Management</h1>
          <p className="text-sm text-[var(--dash-muted)]">Manage stock, suppliers, purchase orders & audits</p>
        </div>
        <div className="flex items-center gap-2">
        <button type="button" onClick={handleExport} className="pro-action-button">
          <Icon.Download /> Export CSV
        </button>
        <button onClick={() => setShowAlerts((p) => !p)} className="relative dashboard-secondary-button p-2.5 rounded-xl">
          <Icon.Bell />
          {unreadAlerts.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{unreadAlerts.length}</span>
          )}
        </button>
        </div>
      </div>

      {/* Alerts Panel */}
      {showAlerts && (
        <div className="mb-5 p-4 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">🔔 Inventory Alerts ({unreadAlerts.length} unread)</h3>
            {unreadAlerts.length > 0 && (
              <button onClick={() => markAllMut.mutate()} className="text-xs text-[var(--dash-primary)] hover:underline">Mark all read</button>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-[var(--dash-muted)]">No alerts. Everything looks good! ✅</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-hide">
              {alerts.slice(0, 20).map((alert) => (
                <div key={alert.id} className={`flex items-start gap-2 p-2 rounded-lg text-sm transition-opacity ${alert.isRead ? "opacity-50" : ""}`}>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${alert.level === "CRITICAL" ? "bg-red-500/20 text-red-400" : alert.level === "EXPIRY" ? "bg-orange-500/20 text-orange-400" : "bg-yellow-500/20 text-yellow-400"}`}>{alert.level}</span>
                  <span className="flex-1 text-[var(--dash-text)]">{alert.message}</span>
                  <span className="text-xs text-[var(--dash-muted)] shrink-0">{new Date(alert.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-[var(--dash-surface-muted)] rounded-xl mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-[var(--dash-surface)] text-[var(--dash-text)] shadow-sm" : "text-[var(--dash-muted)] hover:text-[var(--dash-text)]"}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "items" && <ItemsTab suppliers={suppliers} />}
        {activeTab === "suppliers" && <SuppliersTab />}
        {activeTab === "purchase-orders" && <PurchaseOrdersTab suppliers={suppliers} inventoryItems={inventoryItems} />}
        {activeTab === "stock-count" && <StockCountTab />}
        {activeTab === "reports" && <ReportsTab />}
      </div>
    </div>
  );
};

export default Inventory;
