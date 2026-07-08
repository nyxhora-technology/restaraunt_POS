import { axiosWrapper } from "./axiosWrapper";

// Auth Endpoints
export const login = (data) =>
  axiosWrapper.post("/api/auth/sign-in/email", data);
export const register = ({ name, email, password, phone }) =>
  axiosWrapper.post("/api/auth/sign-up/email", {
    name,
    email,
    password,
    phone,
  });
export const getSession = (config) =>
  axiosWrapper.get("/api/auth/get-session", config);
export const getAuthCapabilities = (config) =>
  axiosWrapper.get("/api/config/auth", config);
export const signInWithGoogle = async ({
  isRegister = false,
  returnTo = "",
} = {}) => {
  const callbackParams = new URLSearchParams();
  if (returnTo) callbackParams.set("returnTo", returnTo);
  const callbackQuery = callbackParams.toString();
  const callbackURL = `${window.location.origin}/auth/callback${
    callbackQuery ? `?${callbackQuery}` : ""
  }`;
  const { data } = await axiosWrapper.post("/api/auth/sign-in/social", {
    provider: "google",
    callbackURL,
    errorCallbackURL: `${window.location.origin}/auth?${
      isRegister ? "tab=register&" : ""
    }${returnTo ? `returnTo=${encodeURIComponent(returnTo)}&` : ""}oauth=error`,
  });

  if (!data?.url) throw new Error("Google authentication could not be started");
  window.location.assign(data.url);
};
export const getUserData = (config) =>
  axiosWrapper.get("/api/restaurant/context", config);
export const logout = () => axiosWrapper.post("/api/auth/sign-out");
export const changePassword = (data) =>
  axiosWrapper.post("/api/auth/change-password", data);
export const changeFirstPassword = (data) =>
  axiosWrapper.post("/api/restaurant/staff/change-password", data);

// Restaurant / tenant endpoints
export const getMyRestaurant = (config) =>
  axiosWrapper.get("/api/restaurant/me", config);
export const updateMyRestaurant = (data) =>
  axiosWrapper.put("/api/restaurant/me", data);
export const registerRestaurant = (data) =>
  axiosWrapper.post("/api/restaurant/register", data);
export const getStaff = () => axiosWrapper.get("/api/restaurant/staff");
export const inviteStaff = (data) =>
  axiosWrapper.post("/api/restaurant/staff/invite", data);
export const resetStaffPassword = (userId) =>
  axiosWrapper.post(`/api/restaurant/staff/${userId}/reset-password`, {});
export const removeStaff = (userId) =>
  axiosWrapper.delete(`/api/restaurant/staff/${userId}`);

// Table Endpoints
export const addTable = (data) => axiosWrapper.post("/api/table", data);
export const getTables = (params) => axiosWrapper.get("/api/table", { params });
export const updateTable = ({ tableId, ...tableData }) =>
  axiosWrapper.put(`/api/table/${tableId}`, tableData);
export const deleteTable = (tableId) =>
  axiosWrapper.delete(`/api/table/${tableId}`);
export const getDiningAreas = (params) =>
  axiosWrapper.get("/api/table/areas", { params });
export const addDiningArea = (data) =>
  axiosWrapper.post("/api/table/areas", data);
export const updateDiningArea = ({ areaId, ...data }) =>
  axiosWrapper.put(`/api/table/areas/${areaId}`, data);
export const deleteDiningArea = (areaId) =>
  axiosWrapper.delete(`/api/table/areas/${areaId}`);

// Menu Endpoints
export const getMenu = () => axiosWrapper.get("/api/menu");
export const addCategory = (data) =>
  axiosWrapper.post("/api/menu/category", data);
export const updateCategory = ({ categoryId, ...data }) =>
  axiosWrapper.put(`/api/menu/category/${categoryId}`, data);
export const deleteCategory = (categoryId) =>
  axiosWrapper.delete(`/api/menu/category/${categoryId}`);
export const addMenuItem = (data) => axiosWrapper.post("/api/menu/item", data);
export const updateMenuItem = ({ itemId, ...data }) =>
  axiosWrapper.put(`/api/menu/item/${itemId}`, data);
export const toggleMenuItem = ({ itemId, available }) =>
  axiosWrapper.patch(`/api/menu/item/${itemId}/toggle`, { available });
export const deleteMenuItem = (itemId) =>
  axiosWrapper.delete(`/api/menu/item/${itemId}`);

// Payment Endpoints
export const createOrderRazorpay = (orderId) =>
  axiosWrapper.post("/api/payment/create-order", { orderId });
export const verifyPaymentRazorpay = (data) =>
  axiosWrapper.post("/api/payment/verify", data);
export const recordCashPayment = (orderId) =>
  axiosWrapper.post(`/api/payment/cash/${orderId}`);
export const recordReceiptPrint = ({ orderId, copyType }) =>
  axiosWrapper.post(`/api/payment/receipt/${orderId}/print`, { copyType });
export const getPaymentHistory = () => axiosWrapper.get("/api/payment/history");

// Order Endpoints
export const addOrder = (data) => axiosWrapper.post("/api/order/", data);
export const getOrders = (params) => axiosWrapper.get("/api/order", { params });
export const getKitchenOrders = () => axiosWrapper.get("/api/order/kitchen");
export const getDashboard = () => axiosWrapper.get("/api/order/dashboard");
export const getOrderUsage = () => axiosWrapper.get("/api/order/usage");
export const getAnalytics = (days) =>
  axiosWrapper.get("/api/analytics", { params: { days } });
export const exportOrders = (params) =>
  axiosWrapper.get("/api/export/orders", { params, responseType: "blob" });
export const exportInventory = () =>
  axiosWrapper.get("/api/export/inventory", { responseType: "blob" });
export const updateOrderStatus = ({ orderId, orderStatus }) =>
  axiosWrapper.put(`/api/order/${orderId}/status`, { orderStatus });
export const updateOrderItems = ({ orderId, items }) =>
  axiosWrapper.put(`/api/order/${orderId}/items`, { items });

// Platform admin endpoints
export const getPlatformStats = () => axiosWrapper.get("/api/admin/stats");
export const getRestaurants = (params) =>
  axiosWrapper.get("/api/admin/restaurants", { params });
export const getRestaurant = (restaurantId) =>
  axiosWrapper.get(`/api/admin/restaurants/${restaurantId}`);
export const getPlatformUsers = (params) =>
  axiosWrapper.get("/api/admin/users", { params });
export const updateRestaurantStatus = ({ restaurantId, ...data }) =>
  axiosWrapper.put(`/api/admin/restaurants/${restaurantId}/status`, data);

// Inventory Items
export const getInventoryItems = () => axiosWrapper.get("/api/inventory");
export const createInventoryItem = (data) =>
  axiosWrapper.post("/api/inventory", data);
export const updateInventoryItem = ({ itemId, ...data }) =>
  axiosWrapper.patch(`/api/inventory/${itemId}`, data);
export const deleteInventoryItem = (itemId) =>
  axiosWrapper.delete(`/api/inventory/${itemId}`);
export const restockInventoryItem = ({ itemId, data }) =>
  axiosWrapper.post(`/api/inventory/${itemId}/restock`, data);
export const adjustInventoryItem = ({ itemId, data }) =>
  axiosWrapper.post(`/api/inventory/${itemId}/adjust`, data);

// Inventory Alerts
export const getInventoryAlerts = () =>
  axiosWrapper.get("/api/inventory/alerts");
export const markAlertRead = (alertId) =>
  axiosWrapper.patch(`/api/inventory/alerts/${alertId}/read`);
export const markAllAlertsRead = () =>
  axiosWrapper.patch("/api/inventory/alerts/read-all");
export const getInventoryLogs = (params) =>
  axiosWrapper.get("/api/inventory/logs", { params });

// Inventory Analytics
export const getInventoryAnalytics = (params) =>
  axiosWrapper.get("/api/inventory/analytics", { params });

// Suppliers
export const getSuppliers = () => axiosWrapper.get("/api/inventory/suppliers");
export const createSupplier = (data) =>
  axiosWrapper.post("/api/inventory/suppliers", data);
export const updateSupplier = ({ id, ...data }) =>
  axiosWrapper.patch(`/api/inventory/suppliers/${id}`, data);
export const deleteSupplier = (id) =>
  axiosWrapper.delete(`/api/inventory/suppliers/${id}`);

// Purchase Orders
export const getPurchaseOrders = () =>
  axiosWrapper.get("/api/inventory/purchase-orders");
export const createPurchaseOrder = (data) =>
  axiosWrapper.post("/api/inventory/purchase-orders", data);
export const updatePurchaseOrder = ({ id, ...data }) =>
  axiosWrapper.patch(`/api/inventory/purchase-orders/${id}`, data);
export const markPOOrdered = (id) =>
  axiosWrapper.post(`/api/inventory/purchase-orders/${id}/order`);
export const receivePurchaseOrder = ({ id, ...data }) =>
  axiosWrapper.post(`/api/inventory/purchase-orders/${id}/receive`, data);
export const cancelPurchaseOrder = (id) =>
  axiosWrapper.delete(`/api/inventory/purchase-orders/${id}`);

// Stock Counts
export const getStockCounts = () =>
  axiosWrapper.get("/api/inventory/stock-counts");
export const startStockCount = (data) =>
  axiosWrapper.post("/api/inventory/stock-counts", data);
export const getStockCount = (id) =>
  axiosWrapper.get(`/api/inventory/stock-counts/${id}`);
export const updateStockCountItems = ({ id, ...data }) =>
  axiosWrapper.patch(`/api/inventory/stock-counts/${id}/items`, data);
export const completeStockCount = (id) =>
  axiosWrapper.post(`/api/inventory/stock-counts/${id}/complete`);
export const cancelStockCount = (id) =>
  axiosWrapper.delete(`/api/inventory/stock-counts/${id}`);

// QR Menu Endpoints
export const getQrCodes = () => axiosWrapper.get("/api/qr");
export const createQrCode = (data) => axiosWrapper.post("/api/qr", data);
export const updateQrCode = ({ id, ...data }) =>
  axiosWrapper.patch(`/api/qr/${id}`, data);
export const deleteQrCode = (id) => axiosWrapper.delete(`/api/qr/${id}`);
export const getPublicMenu = (slug) =>
  axiosWrapper.get(`/api/qr/public/${slug}`);

// Reservations
export const getReservations = () => axiosWrapper.get("/api/reservations");
export const createReservation = (data) =>
  axiosWrapper.post("/api/reservations", data);
export const updateReservation = ({ id, ...data }) =>
  axiosWrapper.patch(`/api/reservations/${id}`, data);
export const deleteReservation = (id) =>
  axiosWrapper.delete(`/api/reservations/${id}`);

// Admin plan management
export const updateRestaurantPlan = ({ restaurantId, plan }) =>
  axiosWrapper.put(`/api/admin/restaurants/${restaurantId}/plan`, { plan });

// Referral endpoints
export const getMyReferrals = () => axiosWrapper.get("/api/referral/me");
export const validateReferralCode = (code) =>
  axiosWrapper.get(`/api/referral/validate/${encodeURIComponent(code)}`);

export const getErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;
