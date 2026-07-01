import { useDispatch } from "react-redux";
import { getMyRestaurant, getUserData } from "../https";
import { useEffect, useState } from "react";
import { removeUser, setRestaurant, setUser } from "../redux/slices/userSlice";

const useLoadData = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const contextResponse = await getUserData();
        const user = contextResponse.data.data;
        dispatch(setUser(user));

        if (user.role !== "SUPER_ADMIN") {
          const restaurantResponse = await getMyRestaurant();
          dispatch(setRestaurant(restaurantResponse.data.data));
        }
      } catch {
        dispatch(removeUser());
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [dispatch]);

  return isLoading;
};

export default useLoadData;
