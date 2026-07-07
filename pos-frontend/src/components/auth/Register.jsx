import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { register, getErrorMessage, getUserData } from "../../https";
import { setUser } from "../../redux/slices/userSlice";
import { ROLES } from "../../constants/roles";
import GoogleAuthButton from "./GoogleAuthButton";
import { APP_ROUTES } from "../../utils/authRouting";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: async () => {
      queryClient.clear();
      const { data } = await getUserData();
      dispatch(setUser(data.data));
      enqueueSnackbar("Account created successfully", { variant: "success" });
      navigate(
        data.data.role === ROLES.SUPER_ADMIN
          ? APP_ROUTES.platform
          : APP_ROUTES.onboarding,
      );
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error, "Registration failed"), {
        variant: "error",
      }),
  });

  return (
    <div className="auth-form-wrap">
      <GoogleAuthButton isRegister />
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          registerMutation.mutate(formData);
        }}
      >
        <label>
          Full name
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your name"
            required
          />
        </label>
        <label>
          Work email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="you@restaurant.com"
            required
          />
        </label>
        <label>
          Phone number
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="+91 98765 43210"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder="At least 8 characters"
            required
          />
        </label>
        <button
          className="auth-submit"
          type="submit"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
