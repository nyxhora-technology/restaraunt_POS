import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useSearchParams } from "react-router-dom";
import {
  getAuthCapabilities,
  getErrorMessage,
  signInWithGoogle,
} from "../../https";
import { getSafeAppReturnTo } from "../../utils/authRouting";

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.25-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.03v2.62A10 10 0 0 0 12 22Z"
    />
    <path
      fill="#FBBC05"
      d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.03A10 10 0 0 0 2 12c0 1.61.39 3.14 1.03 4.55l3.36-2.62Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.88-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.97 5.45l3.36 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
    />
  </svg>
);

export default function GoogleAuthButton({ isRegister = false }) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const capabilitiesQuery = useQuery({
    queryKey: ["public", "auth-capabilities"],
    queryFn: ({ signal }) => getAuthCapabilities({ signal }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const googleEnabled =
    capabilitiesQuery.data?.data?.data?.googleEnabled === true;

  const handleGoogle = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle({
        isRegister,
        returnTo: getSafeAppReturnTo(searchParams.get("returnTo"), ""),
      });
    } catch (error) {
      enqueueSnackbar(
        getErrorMessage(
          error,
          `Google ${isRegister ? "sign-up" : "sign-in"} could not be started`,
        ),
        { variant: "error" },
      );
      setIsLoading(false);
    }
  };

  if (!googleEnabled) return null;

  return (
    <>
      <button
        className="google-auth-button"
        type="button"
        onClick={handleGoogle}
        disabled={isLoading}
      >
        <GoogleMark />{" "}
        {isLoading ? "Connecting to Google…" : "Continue with Google"}
      </button>
      <div className="auth-divider">
        <span>or continue with email</span>
      </div>
    </>
  );
}
