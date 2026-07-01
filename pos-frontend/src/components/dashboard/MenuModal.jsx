import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IoMdClose } from "react-icons/io";
import { enqueueSnackbar } from "notistack";
import {
  addCategory,
  addMenuItem,
  getErrorMessage,
  getMenu,
  updateCategory,
  updateMenuItem,
} from "../../https";

const MenuModal = ({ action, onClose, record }) => {
  const queryClient = useQueryClient();
  const menuQuery = useQuery({ queryKey: ["menu"], queryFn: getMenu });
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
  });

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
            // When variants are present, price is not needed — variants carry their own prices.
            // We omit it (undefined) instead of sending 0 to avoid validation confusion.
            price: form.variants.length > 0 ? undefined : Number(form.price),
            categoryId: form.categoryId,
            description: form.description || undefined,
            image: form.image || undefined,
            isVeg: form.isVeg,
            available: form.available,
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
        className="dashboard-detail-modal p-6 rounded-lg w-[460px]"
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
                placeholder="Base Price"
                type="number"
                min="0.01"
                step="0.01"
                className="dashboard-form-control w-full p-4 rounded-lg mb-3 focus:outline-none"
                required
              />
            )}
            <select
              value={form.categoryId}
              onChange={(event) =>
                setForm({ ...form, categoryId: event.target.value })
              }
              className="dashboard-form-control w-full p-4 rounded-lg mb-3"
              required
            >
              <option value="">Select category</option>
              {(menuQuery.data?.data.data || []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
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
