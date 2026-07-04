import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { getMyRestaurant, getUserData } from "../https";
import { setRestaurant, setUser } from "../redux/slices/userSlice";
import { getHomeRoute } from "../components/shared/RouteGuards";
import logo from "../assets/images/logo.png";

export default function AuthCallback() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
          navigate("/platform", { replace: true });
          return;
        }

        const restaurantResponse = await getMyRestaurant();
        const restaurant = restaurantResponse.data.data;
        dispatch(setRestaurant(restaurant));
        navigate(getHomeRoute({ ...user, restaurant }), { replace: true });
      } catch {
        setError("We couldn't finish your Google sign-up. Please try again.");
      }
    };

    finishSignIn();
  }, [dispatch, navigate]);

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
