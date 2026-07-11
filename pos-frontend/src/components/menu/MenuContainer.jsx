import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { FaShoppingCart, FaSearch } from "react-icons/fa";
import { GrRadialSelected } from "react-icons/gr";
import { useDispatch } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { getMenu } from "../../https";
import { addItems } from "../../redux/slices/cartSlice";

const colors = [
  "#b73e3e",
  "#5b45b0",
  "#7f167f",
  "#735f32",
  "#1d2569",
  "#285430",
];
const icons = [
  "\u{1F372}",
  "\u{1F35B}",
  "\u{1F379}",
  "\u{1F35C}",
  "\u{1F370}",
  "\u{1F355}",
];

const fuzzySearch = (query, text) => {
  const q = query.toLowerCase().replace(/\s+/g, '');
  const t = text.toLowerCase();
  let qIdx = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === q[qIdx]) {
      qIdx++;
    }
    if (qIdx === q.length) return true;
  }
  return false;
};

const MenuContainer = () => {
  const menuQuery = useQuery({ queryKey: ["menu"], queryFn: getMenu });
  const menus = (menuQuery.data?.data.data || []).map((category, index) => ({
    ...category,
    items: category.menuItems.filter((item) => item.available),
    bgColor: colors[index % colors.length],
    icon: icons[index % icons.length],
  }));
  const [selectedId, setSelectedId] = useState();
  const selected = menus.find((menu) => menu.id === selectedId) || menus[0];
  const [itemCounts, setItemCounts] = useState({});
  const dispatch = useDispatch();

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);

  const [variantModalItem, setVariantModalItem] = useState(null);
  const [variantCount, setVariantCount] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    if (!selectedId && menus[0]) setSelectedId(menus[0].id);
  }, [menus, selectedId]);

  useEffect(() => {
    if (!variantModalItem) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setVariantModalItem(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [variantModalItem]);

  const getCount = (id) => itemCounts[id] || 0;

  const increment = (id) => {
    setItemCounts((prev) => {
      const cur = prev[id] || 0;
      if (cur >= 10) return prev;
      return { ...prev, [id]: cur + 1 };
    });
  };

  const decrement = (id) => {
    setItemCounts((prev) => {
      const cur = prev[id] || 0;
      if (cur <= 0) return prev;
      return { ...prev, [id]: cur - 1 };
    });
  };

  const handleAddToCart = useCallback((item, defaultQuantity = 0) => {
    setItemCounts((prev) => {
      let count = prev[item.id] || 0;
      if (count === 0 && defaultQuantity > 0) {
        count = defaultQuantity;
      }
      if (count === 0) return prev;

      const { id, name, price } = item;
      const newObj = {
        id: `${id}-${Date.now()}`,
        menuItemId: id,
        name,
        pricePerQuantity: price,
        quantity: count,
        price: price * count,
      };

      dispatch(addItems(newObj));
      return { ...prev, [id]: 0 };
    });
  }, [dispatch]);

  const openVariantModal = useCallback((item) => {
    setVariantModalItem(item);
    setSelectedVariant(item.variants[0]);
    setVariantCount(1);
  }, []);

  const handleAddVariantToCart = () => {
    if (variantCount === 0 || !selectedVariant) return;
    const { id, name } = variantModalItem;
    const newObj = {
      id: `${id}-${selectedVariant.id}-${Date.now()}`,
      menuItemId: id,
      variantId: selectedVariant.id,
      variantLabel: selectedVariant.label,
      name,
      pricePerQuantity: selectedVariant.price,
      quantity: variantCount,
      price: selectedVariant.price * variantCount,
    };
    dispatch(addItems(newObj));
    setVariantModalItem(null);
  };

  const displayedItems = useMemo(() => {
    if (searchQuery.trim()) {
      const allItems = menus.flatMap((m) => m.items);
      const seen = new Set();
      const uniqueItems = [];
      for (const item of allItems) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          uniqueItems.push(item);
        }
      }
      return uniqueItems.filter(item => fuzzySearch(searchQuery, item.name));
    } else {
      return selected?.items || [];
    }
  }, [searchQuery, menus, selected]);

  // Keyboard shortcut for adding items 1-9
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (variantModalItem) return;

      if (e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key, 10);
        const index = num - 1;
        
        const activeTag = document.activeElement?.tagName;
        const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA';
        
        // If typing in search box, only intercept if Alt is pressed
        if (isInputFocused && !e.altKey && !e.ctrlKey) {
          return; 
        }

        if (displayedItems[index]) {
          e.preventDefault();
          const item = displayedItems[index];
          if (item.variants && item.variants.length > 0) {
            openVariantModal(item);
          } else {
            handleAddToCart(item, 1);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [displayedItems, handleAddToCart, openVariantModal, variantModalItem]);

  return (
    <div className="menu-browser">
      <div className="mb-4 px-6 pt-4">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search dishes... (e.g. '1' for first item, 'ckn' for chicken)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] p-3 pl-10 rounded-xl text-[var(--dash-text)] font-medium focus:outline-none focus:border-[var(--dash-primary)] transition-colors"
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-muted)]" />
        </div>
      </div>

      {!searchQuery.trim() && (
        <div className="menu-category-grid">
          {menus.map((menu) => {
            return (
              <button
                key={menu.id}
                type="button"
                className="menu-category-card text-left"
                style={{ backgroundColor: menu.bgColor }}
                onClick={() => {
                  setSelectedId(menu.id);
                }}
              >
                <span className="flex w-full items-center justify-between">
                  <span className="text-lg font-semibold text-white">
                    {menu.icon} {menu.name}
                  </span>
                  {selected?.id === menu.id && (
                    <GrRadialSelected className="text-white" size={20} />
                  )}
                </span>
                <span className="text-sm font-semibold text-white/75">
                  {menu.items.length} Items
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!searchQuery.trim() && <hr className="mt-1 border-[var(--dash-border)]" />}

      {searchQuery.trim() && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-[var(--dash-muted)] uppercase tracking-wider">
            Search Results ({displayedItems.length})
          </p>
        </div>
      )}

      <div className="menu-item-grid scrollbar-hide">
        {displayedItems.map((item) => {
          return (
            <div key={item.id} className="menu-item-card relative">
              <div className="flex w-full items-start justify-between gap-3">
                <h1 className="text-lg font-semibold text-[var(--dash-text)]">
                  {item.name}
                </h1>
                {item.variants && item.variants.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => openVariantModal(item)}
                    className="menu-item-action px-3 py-1 text-sm"
                  >
                    Options
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item, 1)}
                    className="menu-item-action p-2"
                    aria-label={`Add ${item.name} to cart`}
                  >
                    <FaShoppingCart size={20} />
                  </button>
                )}
              </div>
              <div className="flex w-full items-center justify-between gap-3">
                <p className="text-xl font-bold text-[var(--dash-text)]">
                  {"\u20B9"}
                  {item.variants && item.variants.length > 0
                    ? item.variants[0].price
                    : item.price}
                </p>
                {item.variants && item.variants.length > 0 ? null : (
                  <div className="menu-quantity-control">
                    <button
                      type="button"
                      onClick={() => decrement(item.id)}
                      className="text-2xl text-amber-500"
                    >
                      &minus;
                    </button>
                    <span className="font-semibold text-[var(--dash-text)]">
                      {getCount(item.id)}
                    </span>
                    <button
                      type="button"
                      onClick={() => increment(item.id)}
                      className="text-2xl text-amber-500"
                    >
                      &#43;
                    </button>
                  </div>
                )}
              </div>
              {item.variants && item.variants.length > 0 && (
                <div className="menu-card-variants">
                  {item.variants.slice(0, 3).map((variant) => (
                    <span key={variant.id}>
                      {variant.label} {"\u20B9"}
                      {Number(variant.price).toFixed(2)}
                    </span>
                  ))}
                  {item.variants.length > 3 && (
                    <span>+{item.variants.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {searchQuery.trim() && displayedItems.length === 0 && (
          <div className="col-span-full py-10 text-center text-[var(--dash-muted)]">
            No dishes match &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      {variantModalItem && (
        <div
          className="dashboard-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setVariantModalItem(null);
          }}
        >
          <div className="dashboard-detail-modal w-[400px] rounded-lg p-6">
            <h2 className="mb-4 text-2xl font-bold text-[var(--dash-text)]">
              {variantModalItem.name}
            </h2>
            <div className="mb-6 flex flex-col gap-3">
              {variantModalItem.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariant(v)}
                  className={`menu-variant-row ${
                    selectedVariant?.id === v.id ? "is-active" : ""
                  }`}
                >
                  <span className="font-semibold text-[var(--dash-text)]">
                    {v.label}
                  </span>
                  <span className="text-[var(--dash-muted)]">
                    {"\u20B9"}
                    {v.price}
                  </span>
                </button>
              ))}
            </div>

            <div className="menu-quantity-control mb-6 w-full">
              <button
                type="button"
                onClick={() => setVariantCount(Math.max(1, variantCount - 1))}
                className="text-2xl text-amber-500"
              >
                &minus;
              </button>
              <span className="font-semibold text-[var(--dash-text)]">
                {variantCount}
              </span>
              <button
                type="button"
                onClick={() => setVariantCount(Math.min(99, variantCount + 1))}
                className="text-2xl text-amber-500"
              >
                &#43;
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setVariantModalItem(null)}
                className="dashboard-secondary-button rounded-lg px-4 py-2 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddVariantToCart}
                className="dashboard-primary-button rounded-lg px-6 py-2 font-bold"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuContainer;
