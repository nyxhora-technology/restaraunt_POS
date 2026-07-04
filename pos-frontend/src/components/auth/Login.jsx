import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { login, getMyRestaurant, getUserData, getErrorMessage } from "../../https";
import { setRestaurant, setUser } from "../../redux/slices/userSlice";
import { ROLES } from "../../constants/roles";
import { getHomeRoute } from "../shared/RouteGuards";

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      queryClient.clear();
      const { data } = await getUserData();
      const user = data.data;
      dispatch(setUser(user));
      if (user.role === ROLES.SUPER_ADMIN) return navigate("/platform", { replace: true });
      const restaurantResponse = await getMyRestaurant();
      const restaurant = restaurantResponse.data.data;
      dispatch(setRestaurant(restaurant));
      navigate(getHomeRoute({ ...user, restaurant }), { replace: true });
    },
    onError: (error) => enqueueSnackbar(getErrorMessage(error, "Sign in failed"), { variant: "error" }),
  });

  return (
    <form className="auth-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate(formData); }}>
      <label>Work email<input type="email" name="email" autoComplete="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@restaurant.com" required /></label>
      <label>Password<input type="password" name="password" autoComplete="current-password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Enter your password" required /></label>
      <button className="auth-submit" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Signing in…" : "Sign in securely"}</button>
    </form>
  );
}
