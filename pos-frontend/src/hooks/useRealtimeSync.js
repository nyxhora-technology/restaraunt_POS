import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { useDispatch } from "react-redux";
import { setRestaurant } from "../redux/slices/userSlice";

const useRealtimeSync = () => {
  const isAuth = useSelector((state) => state.user.isAuth);
  const restaurantId = useSelector((state) => state.user.restaurantId);
  const restaurantStatus = useSelector(
    (state) => state.user.restaurant?.status,
  );
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isAuth) return undefined;

    const socket = io(import.meta.env.VITE_BACKEND_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    const refreshOrders = () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    };
    const refreshTables = () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["dining-areas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };
    const refreshMenu = () =>
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    const refreshRestaurantStatus = (restaurant) => {
      queryClient.invalidateQueries({ queryKey: ["platform-restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-restaurant-status"] });
      if (restaurantId && restaurant?.id === restaurantId) {
        dispatch(setRestaurant(restaurant));
      }
    };

    socket.on("order:new", refreshOrders);
    socket.on("order:updated", refreshOrders);
    socket.on("order:completed", refreshOrders);
    socket.on("table:updated", refreshTables);
    socket.on("dining-area:updated", refreshTables);
    socket.on("menu:updated", refreshMenu);
    socket.on("restaurant:status", refreshRestaurantStatus);

    return () => socket.disconnect();
  }, [dispatch, isAuth, queryClient, restaurantId, restaurantStatus]);
};

export default useRealtimeSync;
