import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  orderId: "",
  customerName: "",
  customerPhone: "",
  guests: 0,
  orderType: "DINE_IN",
  table: null,
  tables: [],
};

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    setCustomer: (state, action) => {
      const { name, phone, guests, orderType, tables = [] } = action.payload;
      state.orderId = `${Date.now()}`;
      state.customerName = name;
      state.customerPhone = phone;
      state.guests = guests;
      state.orderType = orderType || "DINE_IN";
      state.tables = tables;
      state.table = tables[0] || null;
    },

    removeCustomer: () => ({ ...initialState }),

    updateTable: (state, action) => {
      state.table = action.payload.table;
      state.tables = action.payload.table ? [action.payload.table] : [];
    },

    updateTables: (state, action) => {
      state.tables = action.payload.tables || [];
      state.table = state.tables[0] || null;
    },
  },
});

export const { setCustomer, removeCustomer, updateTable, updateTables } =
  customerSlice.actions;
export default customerSlice.reducer;
