import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const isSameCartItem = (item, payload) =>
  item.menuItemId === payload.menuItemId &&
  (item.variantId || null) === (payload.variantId || null);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItems: (state, action) => {
      const existing = state.find((item) =>
        isSameCartItem(item, action.payload),
      );

      if (existing) {
        existing.quantity += action.payload.quantity;
        existing.price = existing.pricePerQuantity * existing.quantity;
        return;
      }

      state.push(action.payload);
    },

    incrementItem: (state, action) => {
      const item = state.find((cartItem) => cartItem.id === action.payload);
      if (!item || item.quantity >= 99) return;
      item.quantity += 1;
      item.price = item.pricePerQuantity * item.quantity;
    },

    decrementItem: (state, action) => {
      const item = state.find((cartItem) => cartItem.id === action.payload);
      if (!item) return state;
      if (item.quantity <= 1) {
        return state.filter((cartItem) => cartItem.id !== action.payload);
      }
      item.quantity -= 1;
      item.price = item.pricePerQuantity * item.quantity;
    },

    removeItem: (state, action) => {
      return state.filter((item) => item.id !== action.payload);
    },

    removeAllItems: () => {
      return [];
    },
  },
});

export const getTotalPrice = (state) =>
  state.cart.reduce((total, item) => total + item.price, 0);
export const {
  addItems,
  incrementItem,
  decrementItem,
  removeItem,
  removeAllItems,
} = cartSlice.actions;
export default cartSlice.reducer;
