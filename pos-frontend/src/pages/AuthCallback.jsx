import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getMyRestaurant, getUserData } from "../https";
import { setRestaurant, setUser } from "../redux/slices/userSlice";
import { getHomeRoute } from "../components/shared/RouteGuards";
import logo from "../assets/images/logo.png";
import {
  APP_ROUTES,
  getSafeAppReturnTo,
} from "../utils/authRouting";

export default function AuthCallback() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const finishSignIn = async () => {
      try {
        const { data } = await getUserData();
        const user = data.data;
        dispatch(setUser(user));

        if (user.role === "SUPER_ADMIN") {
          navigate(APP_ROUTES.platform, { replace: true });
          return;
        }

        const restaurantResponse = await getMyRestaurant();
        const restaurant = restaurantResponse.data.data;
        dispatch(setRestaurant(restaurant));
        const fallback = getHomeRoute({ ...user, restaurant });
        const destination =
          restaurant?.status === "APPROVED"
            ? getSafeAppReturnTo(searchParams.get("returnTo"), fallback)
            : fallback;
        navigate(destination, { replace: true });
      } catch (error) {
        const status = error?.response?.status;
        if (status === 404 || status === 403) {
          navigate(APP_ROUTES.onboarding, { replace: true });
          return;
        }
        setError("We couldn't finish your Google sign-up. Please try again.");
      }
    };

    finishSignIn();
  }, [dispatch, navigate, searchParams]);

  return (
    <main className="oauth-callback">
      <img src={logo} alt="Restro" />
      {error ? (
        <>
          <h1>Sign-up interrupted</h1>
          <p>{error}</p>
          <Link to="/auth?tab=register">Back to registration</Link>
        </>
      ) : (
        <>
          <div className="oauth-spinner" aria-label="Loading" />
          <h1>Preparing your workspace</h1>
          <p>Securely signing you in and checking your restaurant setup…</p>
        </>
      )}
    </main>
  );
}
