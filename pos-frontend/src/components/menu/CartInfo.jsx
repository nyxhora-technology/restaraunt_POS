import React, { useEffect, useRef } from "react";
import { RiDeleteBin2Fill } from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";
import {
  decrementItem,
  incrementItem,
  removeItem,
} from "../../redux/slices/cartSlice";

const CartInfo = () => {
  const cartData = useSelector((state) => state.cart);
  const scrolLRef = useRef();
  const dispatch = useDispatch();

  useEffect(() => {
    if (scrolLRef.current) {
      scrolLRef.current.scrollTo({
        top: scrolLRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [cartData]);

  const handleRemove = (itemId) => {
    dispatch(removeItem(itemId));
  };

  return (
    <div className="menu-cart-section px-4 py-2">
      <h1 className="text-lg font-semibold tracking-wide text-[var(--dash-text)]">
        Order Details
      </h1>
      <div className="menu-cart-scroll scrollbar-hide" ref={scrolLRef}>
        {cartData.length === 0 ? (
          <p className="flex h-full min-h-[240px] items-center justify-center text-sm text-[var(--dash-muted)]">
            Your cart is empty. Start adding items!
          </p>
        ) : (
          cartData.map((item) => {
            return (
              <div key={item.id} className="menu-cart-item">
                <div className="flex items-center justify-between gap-3">
                  <h1 className="text-md font-semibold tracking-wide text-[var(--dash-text)]">
                    {item.name}
                    {item.variantLabel ? ` \u00B7 ${item.variantLabel}` : ""}
                  </h1>
                  <p className="font-semibold text-[var(--dash-muted)]">
                    x{item.quantity}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="menu-cart-quantity">
                    <button
                      type="button"
                      onClick={() => dispatch(decrementItem(item.id))}
                      aria-label={`Decrease ${item.name}`}
                    >
                      &minus;
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => dispatch(incrementItem(item.id))}
                      aria-label={`Increase ${item.name}`}
                    >
                      &#43;
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiDeleteBin2Fill
                      onClick={() => handleRemove(item.id)}
                      className="cursor-pointer text-[var(--dash-muted)] hover:text-[var(--dash-danger)]"
                      size={20}
                    />
                  </div>
                  <p className="text-md font-bold text-[var(--dash-text)]">
                    {"\u20B9"}
                    {item.price}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CartInfo;
