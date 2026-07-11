import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IoMdClose } from "react-icons/io";
import { enqueueSnackbar } from "notistack";
import {
  addCategory,
  addMenuItem,
  getErrorMessage,
  getMenu,
  getTaxGroups,
  updateCategory,
  updateMenuItem,
} from "../../https";
import CustomSelect from "../shared/CustomSelect";

// Tax type badge colours
const TAX_TYPE_COLOR = {
  GST:      { color: "#0f9fa4", bg: "#e0f7fa" },
  VAT:      { color: "#7c3aed", bg: "#f3e8ff" },
  INCLUDED: { color: "#d97706", bg: "#fef3c7" },
  EXEMPT:   { color: "#16a34a", bg: "#dcfce7" },
};

const MenuModal = ({ action, onClose, record }) => {
  const queryClient = useQueryClient();
  const menuQuery = useQuery({ queryKey: ["menu"], queryFn: getMenu });
  const taxGroupsQuery = useQuery({ queryKey: ["tax-groups"], queryFn: getTaxGroups });
  const isCategory = action.includes("category");
  const isEdit = action.startsWith("edit");

  const [form, setForm] = useState({
    name: record?.name || "",
    price: record?.price || "",
    categoryId: record?.categoryId || "",
    description: record?.description || "",
    image: record?.image || "",
    isVeg: record?.isVeg ?? true,
    available: record?.available ?? true,
    sortOrder: record?.sortOrder || 0,
    variants: record?.variants || [],
    // Tax fields
    taxGroupId: record?.taxGroupId || "",
    isMrpItem: record?.isMrpItem ?? false,
    hsnCode: record?.hsnCode || "",
  });

  // Auto-select the default tax group for new items
  useEffect(() => {
    if (isEdit || form.taxGroupId) return;
    const groups = taxGroupsQuery.data?.data?.data || [];
    const defaultGroup = groups.find((g) => g.isDefault);
    if (defaultGroup) setForm((f) => ({ ...f, taxGroupId: defaultGroup.id }));
  }, [taxGroupsQuery.data, isEdit]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: (data) => {
      if (isCategory) {
        return isEdit
          ? updateCategory({ categoryId: record.id, ...data })
          : addCategory(data);
      }
      return isEdit
        ? updateMenuItem({ itemId: record.id, ...data })
        : addMenuItem(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      enqueueSnackbar(`${isCategory ? "Category" : "Dish"} saved`, {
        variant: "success",
      });
      onClose();
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error), { variant: "error" }),
  });

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate(
      isCategory
        ? { name: form.name, sortOrder: Number(form.sortOrder) }
        : {
            name: form.name,
            price: form.variants.length > 0 ? undefined : Number(form.price),
            categoryId: form.categoryId,
            description: form.description || undefined,
            image: form.image || undefined,
            isVeg: form.isVeg,
            available: form.available,
            taxGroupId: form.taxGroupId || undefined,
            isMrpItem: form.isMrpItem,
            hsnCode: form.hsnCode || undefined,
            variants:
              form.variants.length > 0
                ? form.variants.map((v, idx) => ({
                    label: v.label,
                    price: Number(v.price),
                    available: v.available ?? true,
                    sortOrder: idx,
                  }))
                : undefined,
          },
    );
  };

  // Derived helpers
  const taxGroups = taxGroupsQuery.data?.data?.data || [];
  const selectedTaxGroup = taxGroups.find((g) => g.id === form.taxGroupId);
  const selectedMeta = selectedTaxGroup
    ? TAX_TYPE_COLOR[selectedTaxGroup.type] || TAX_TYPE_COLOR.EXEMPT
    : null;

  const taxSummary = () => {
    if (!selectedTaxGroup) return null;
    const t = selectedTaxGroup;
    if (t.type === "GST") return `CGST ${t.cgst}% + SGST ${t.sgst}% = ${t.cgst + t.sgst}% GST`;
    if (t.type === "VAT") return `VAT ${t.vatRate}%${t.stateName ? ` · ${t.stateName}` : ""}`;
    if (t.type === "INCLUDED") return `Tax incl. in price · CGST ${t.cgst}% + SGST ${t.sgst}%`;
    if (t.type === "EXEMPT") return "No tax applied";
    return null;
  };

  return (
    <div
      className="dashboard-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-label={`${isEdit ? "Edit" : "Add"} ${isCategory ? "Category" : "Dish"}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="dashboard-detail-modal p-6 rounded-lg w-[480px] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {isEdit ? "Edit" : "Add"} {isCategory ? "Category" : "Dish"}
          </h2>
          <button type="button" onClick={onClose}>
            <IoMdClose size={24} />
          </button>
        </div>
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Name"
          className="dashboard-form-control w-full p-4 rounded-lg mb-3 focus:outline-none"
          required
        />
        {isCategory ? (
          <input
            value={form.sortOrder}
            onChange={(event) =>
              setForm({ ...form, sortOrder: event.target.value })
            }
            placeholder="Sort order"
            type="number"
            min="0"
            className="dashboard-form-control w-full p-4 rounded-lg mb-3 focus:outline-none"
          />
        ) : (
          <>
            {form.variants.length === 0 && (
              <input
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
                placeholder={form.isMrpItem ? "MRP (tax-inclusive price)" : "Base Price (excl. tax)"}
                type="number"
                min="0.01"
                step="0.01"
                className="dashboard-form-control w-full p-4 rounded-lg mb-3 focus:outline-none"
                required
              />
            )}
            <CustomSelect
              className="w-full mb-3"
              name="categoryId"
              value={form.categoryId}
              onChange={(event) =>
                setForm({ ...form, categoryId: event.target.value })
              }
              required
              options={[
                { value: "", label: "Select category" },
                ...(menuQuery.data?.data.data || []).map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
            />
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="Description"
              className="dashboard-form-control w-full p-4 rounded-lg mb-3 focus:outline-none"
            />
            <input
              value={form.image}
              onChange={(event) =>
                setForm({ ...form, image: event.target.value })
              }
              placeholder="Image URL (optional)"
              type="url"
              className="dashboard-form-control w-full p-4 rounded-lg mb-3 focus:outline-none"
            />

            {/* ── Tax Group Section ─────────────────────────────── */}
            <div
              style={{
                borderRadius: 10,
                border: "1px solid var(--dash-border, #e2e8f0)",
                padding: "14px 16px",
                marginBottom: 12,
                background: "var(--dash-surface-2, #f8fafc)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--dash-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Tax Configuration
              </p>

              {/* Tax Group Selector */}
              <CustomSelect
                className="w-full mb-2"
                name="taxGroupId"
                value={form.taxGroupId}
                onChange={(e) => setForm({ ...form, taxGroupId: e.target.value })}
                options={[
                  { value: "", label: taxGroupsQuery.isLoading ? "Loading tax groups..." : "No tax group (Exempt)" },
                  ...taxGroups.map((g) => ({
                    value: g.id,
                    label: `${g.name}${g.isDefault ? " ★" : ""}`,
                  })),
                ]}
              />

              {/* Tax summary badge */}
              {selectedTaxGroup && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: selectedMeta.color,
                      background: selectedMeta.bg,
                      borderRadius: 5,
                      padding: "2px 7px",
                    }}
                  >
                    {selectedTaxGroup.type}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--dash-muted)" }}>
                    {taxSummary()}
                  </span>
                </div>
              )}

              {/* MRP Item toggle — only relevant for INCLUDED type */}
              {selectedTaxGroup?.type === "INCLUDED" && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    marginBottom: 8,
                    fontSize: 13,
                    color: "var(--dash-text)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.isMrpItem}
                    onChange={(e) => setForm({ ...form, isMrpItem: e.target.checked })}
                    style={{ width: 15, height: 15, accentColor: "#d97706" }}
                  />
                  <span>
                    <strong>MRP Item</strong> — price entered above is the printed MRP (tax already inside)
                  </span>
                </label>
              )}

              {/* HSN/SAC code override */}
              <input
                value={form.hsnCode}
                onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                placeholder={`HSN/SAC code${selectedTaxGroup?.hsnSacCode ? ` (group default: ${selectedTaxGroup.hsnSacCode})` : " (optional)"}`}
                className="dashboard-form-control w-full p-3 rounded-lg focus:outline-none"
                style={{ fontSize: 13 }}
              />
              {!selectedTaxGroup && (
                <p style={{ fontSize: 11, color: "var(--dash-muted)", marginTop: 6 }}>
                  Go to <strong>Settings → Tax Groups</strong> to create groups, then assign them here.
                </p>
              )}
            </div>
            {/* ── end Tax Group ─────────────────────────────────── */}

            <div className="flex gap-6 mb-4 text-[var(--dash-muted)]">
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={form.isVeg}
                  onChange={(event) =>
                    setForm({ ...form, isVeg: event.target.checked })
                  }
                />
                Vegetarian
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(event) =>
                    setForm({ ...form, available: event.target.checked })
                  }
                />
                Available
              </label>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[var(--dash-muted)] text-sm">
                  Portion Sizes / Variants
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      variants: [...form.variants, { label: "", price: "" }],
                    })
                  }
                  className="text-[#02ca3a] text-xs"
                >
                  + Add Variant
                </button>
              </div>
              {form.variants.map((v, index) => (
                <div key={index} className="flex gap-2 mb-2 items-center">
                  <input
                    value={v.label}
                    onChange={(e) => {
                      const newVars = [...form.variants];
                      newVars[index].label = e.target.value;
                      setForm({ ...form, variants: newVars });
                    }}
                    placeholder="e.g. 30ml"
                    className="dashboard-form-control w-1/2 p-2 rounded-lg text-sm focus:outline-none"
                    required
                  />
                  <input
                    value={v.price}
                    onChange={(e) => {
                      const newVars = [...form.variants];
                      newVars[index].price = e.target.value;
                      setForm({ ...form, variants: newVars });
                    }}
                    placeholder="Price"
                    type="number"
                    min="0"
                    step="0.01"
                    className="dashboard-form-control w-1/3 p-2 rounded-lg text-sm focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newVars = [...form.variants];
                      newVars.splice(index, 1);
                      setForm({ ...form, variants: newVars });
                    }}
                    className="dashboard-danger-button px-2 py-1 rounded"
                  >
                    <IoMdClose />
                  </button>
                </div>
              ))}
              {form.variants.length > 0 && (
                <p className="text-xs text-yellow-500 mt-1">
                  If variants are added, the base price above is ignored.
                </p>
              )}
            </div>
          </>
        )}
        <button
          disabled={mutation.isPending}
          className="w-full bg-yellow-400 text-gray-900 font-bold rounded-lg py-3 disabled:opacity-60"
        >
          {mutation.isPending ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
};

export default MenuModal;
