import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { HiArrowLeft, HiCheckCircle } from "react-icons/hi";
import restaurant from "../assets/images/restro_image.png";
import logo from "../assets/images/logo.png";
import Register from "../components/auth/Register";
import Login from "../components/auth/Login";
import { site } from "../config/site";

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(
    searchParams.get("tab") === "register",
  );

  useEffect(() => {
    const registering = searchParams.get("tab") === "register";
    setIsRegister(registering);
  }, [searchParams]);

  const switchMode = (registering) => {
    setIsRegister(registering);
    const nextParams = new URLSearchParams(searchParams);
    if (registering) nextParams.set("tab", "register");
    else nextParams.delete("tab");
    nextParams.delete("oauth");
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <main className="auth-page">
      <Helmet>
        <title>
          {isRegister
            ? `Create your ${site.brandName} account`
            : `Sign in to ${site.brandName}`} —
          Free Restaurant POS
        </title>
        <meta
          name="description"
          content={
            isRegister
              ? `Create your free ${site.brandName} account and configure a restaurant workspace.`
              : `Sign in to your ${site.brandName} restaurant workspace.`
          }
        />
        <meta name="robots" content="noindex" />
      </Helmet>
      <section className="auth-visual">
        <img src={restaurant} alt="A busy modern restaurant dining room" />
        <div className="auth-visual-overlay" />
        <Link to="/" className="auth-back">
          <HiArrowLeft /> Back to {site.brandName}
        </Link>
        <div className="auth-visual-copy">
          <span>Restaurant operations, refined.</span>
          <h1>Keep every part of service in sync.</h1>
          <div>
            <p>
              <HiCheckCircle /> Live order and kitchen workflows
            </p>
            <p>
              <HiCheckCircle /> Tables, payments, staff, and stock
            </p>
            <p>
              <HiCheckCircle /> One clear view for every role
            </p>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <Link className="auth-brand" to="/">
            <img src={logo} alt="" />
            <strong>{site.brandName}</strong>
          </Link>
          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              className={!isRegister ? "is-active" : ""}
              onClick={() => switchMode(false)}
            >
              Sign in
            </button>
            <button
              className={isRegister ? "is-active" : ""}
              onClick={() => switchMode(true)}
            >
              Create account
            </button>
          </div>
          <header>
            <span>{isRegister ? "Start your journey" : "Welcome back"}</span>
            <h2>
              {isRegister
                ? "Create your restaurant account"
                : "Sign in to your workspace"}
            </h2>
            <p>
              {isRegister
                ? "For restaurant owners setting up a new workspace."
                : "Owners and team members can sign in with their work email."}
            </p>
          </header>
          {searchParams.get("oauth") === "error" && (
            <div className="auth-error" role="alert">
              Google {isRegister ? "sign-up" : "sign-in"} was cancelled or could
              not be completed.
            </div>
          )}
          {isRegister ? <Register /> : <Login />}
          <p className="auth-switch">
            {isRegister
              ? `Already use ${site.brandName}?`
              : "Setting up a new restaurant?"}
            <button onClick={() => switchMode(!isRegister)}>
              {isRegister ? "Sign in" : "Create an account"}
            </button>
          </p>
          <p className="auth-legal">
            By continuing, you agree to {site.brandName}&apos;s{" "}
            <Link to="/terms">Terms of Service</Link> and{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
