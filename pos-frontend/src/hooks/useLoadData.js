import { useDispatch, useSelector } from "react-redux";
import { getMyRestaurant, getUserData } from "../https";
import { useEffect } from "react";
import { removeUser, setRestaurant, setUser, setInitialized } from "../redux/slices/userSlice";

const useLoadData = () => {
  const dispatch = useDispatch();
  const isInitializing = useSelector((state) => state.user.isInitializing);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const contextResponse = await getUserData();
        const user = contextResponse.data.data;
        // Dispatch setUser FIRST — then setInitialized in finally.
        // This guarantees isAuth=true is committed to the store before
        // isInitializing becomes false, so the router never sees
        // isInitializing=false + isAuth=false at the same time.
        dispatch(setUser(user));

        if (user.role !== "SUPER_ADMIN") {
          const restaurantResponse = await getMyRestaurant();
          dispatch(setRestaurant(restaurantResponse.data.data));
        }
      } catch {
        // Session invalid or expired — user is not logged in
        dispatch(removeUser());
      } finally {
        // Release the initializing lock AFTER all dispatches are queued.
        // React batches synchronous dispatches so by the time the router
        // re-renders, both setUser and setInitialized effects are applied.
        dispatch(setInitialized());
      }
    };

    fetchUser();
  }, [dispatch]);

  return isInitializing;
};

export default useLoadData;
