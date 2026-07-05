import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    id: "",
    name: "",
    email : "",
    phone: "",
    role: "",
    restaurantId: null,
    restaurant: null,
    mustChangePassword: false,
    isAuth: false,
    isInitializing: true,   // true until the very first session check completes
}

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        setUser: (state, action) => {
            const { id, name, phone, email, role, restaurantId, mustChangePassword } = action.payload;
            state.id = id;
            state.name = name;
            state.phone = phone;
            state.email = email;
            state.role = role;
            state.restaurantId = restaurantId || null;
            state.mustChangePassword = mustChangePassword ?? false;
            state.isAuth = true;
        },
        setRestaurant: (state, action) => {
            state.restaurant = action.payload || null;
            state.restaurantId = action.payload?.id || state.restaurantId;
        },

        removeUser: (state) => {
            state.id = "";
            state.email = "";
            state.name = "";
            state.phone = "";
            state.role = "";
            state.restaurantId = null;
            state.restaurant = null;
            state.mustChangePassword = false;
            state.isAuth = false;
            state.isInitializing = false;  // session confirmed: user is not logged in
        },
        setInitialized: (state) => {
            state.isInitializing = false;
        },
    }
})

export const { setUser, setRestaurant, removeUser, setInitialized } = userSlice.actions;
export default userSlice.reducer;
