import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { register, signInWithGoogle, getErrorMessage, getUserData } from "../../https";
import { setUser } from "../../redux/slices/userSlice";
import { ROLES } from "../../constants/roles";

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.25-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.03v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.03A10 10 0 0 0 2 12c0 1.61.39 3.14 1.03 4.55l3.36-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.88-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.97 5.45l3.36 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>
);

export default function Register() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "" });
  const [googleLoading, setGoogleLoading] = useState(false);
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
      navigate(data.data.role === ROLES.SUPER_ADMIN ? "/platform" : "/onboarding");
    },
    onError: (error) => enqueueSnackbar(getErrorMessage(error, "Registration failed"), { variant: "error" }),
  });

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, "Google sign-up could not be started"), { variant: "error" });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-form-wrap">
      <button className="google-auth-button" type="button" onClick={handleGoogle} disabled={googleLoading}>
        <GoogleMark /> {googleLoading ? "Connecting to Google…" : "Continue with Google"}
      </button>
      <div className="auth-divider"><span>or continue with email</span></div>
      <form className="auth-form" onSubmit={(event) => { event.preventDefault(); registerMutation.mutate(formData); }}>
        <label>Full name<input type="text" name="name" autoComplete="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Your name" required /></label>
        <label>Work email<input type="email" name="email" autoComplete="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@restaurant.com" required /></label>
        <label>Phone number<input type="tel" name="phone" autoComplete="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 98765 43210" required /></label>
        <label>Password<input type="password" name="password" autoComplete="new-password" minLength={8} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="At least 8 characters" required /></label>
        <button className="auth-submit" type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
