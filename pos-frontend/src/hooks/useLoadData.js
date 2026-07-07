import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { getMyRestaurant, getSession, getUserData } from "../https";
import {
  removeUser,
  setInitialized,
  setRestaurant,
  setUser,
} from "../redux/slices/userSlice";

const useLoadData = ({ enabled = true } = {}) => {
  const dispatch = useDispatch();
  const isInitializing = useSelector((state) => state.user.isInitializing);
  const bootstrapQuery = useQuery({
    queryKey: ["auth", "bootstrap"],
    enabled,
    staleTime: 30_000,
    retry: (failureCount, error) => {
      const status = error?.response?.status;
      if (status && status < 500) return false;
      return failureCount < 1;
    },
    queryFn: async ({ signal }) => {
      const sessionResponse = await getSession({ signal });
      const session = sessionResponse.data;
      if (!session?.session || !session?.user) return null;

      const contextResponse = await getUserData({ signal });
      const user = contextResponse.data.data;
      if (user.role === "SUPER_ADMIN") {
        return { user, restaurant: null };
      }

      const restaurantResponse = await getMyRestaurant({ signal });
      return {
        user,
        restaurant: restaurantResponse.data.data,
      };
    },
  });

  useEffect(() => {
    if (!enabled || bootstrapQuery.isError || !bootstrapQuery.isSuccess) {
      return;
    }

    if (!bootstrapQuery.data) {
      dispatch(removeUser());
      return;
    }

    dispatch(setUser(bootstrapQuery.data.user));
    dispatch(setRestaurant(bootstrapQuery.data.restaurant));
    dispatch(setInitialized());
  }, [
    bootstrapQuery.data,
    bootstrapQuery.isError,
    bootstrapQuery.isSuccess,
    dispatch,
    enabled,
  ]);

  return {
    isLoading:
      enabled &&
      (bootstrapQuery.isPending || (isInitializing && !bootstrapQuery.isError)),
    isError: enabled && bootstrapQuery.isError,
    refetch: bootstrapQuery.refetch,
  };
};

export default useLoadData;
