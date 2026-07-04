import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HiArrowLeft, HiCheckCircle } from "react-icons/hi";
import restaurant from "../assets/images/restro_image.png";
import logo from "../assets/images/logo.png";
import Register from "../components/auth/Register";
import Login from "../components/auth/Login";

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get("tab") === "register");

  useEffect(() => {
    const registering = searchParams.get("tab") === "register";
    setIsRegister(registering);
    document.title = registering ? "Create your Restro account" : "Sign in to Restro";
  }, [searchParams]);

  const switchMode = (registering) => {
    setIsRegister(registering);
    setSearchParams(registering ? { tab: "register" } : {}, { replace: true });
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <img src={restaurant} alt="A busy modern restaurant dining room" />
        <div className="auth-visual-overlay" />
        <Link to="/" className="auth-back"><HiArrowLeft /> Back to Restro</Link>
        <div className="auth-visual-copy">
          <span>Restaurant operations, refined.</span>
          <h1>Keep every part of service in sync.</h1>
          <div>
            <p><HiCheckCircle /> Live order and kitchen workflows</p>
            <p><HiCheckCircle /> Tables, payments, staff, and stock</p>
            <p><HiCheckCircle /> One clear view for every role</p>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <Link className="auth-brand" to="/"><img src={logo} alt="" /><strong>Restro</strong></Link>
          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button className={!isRegister ? "is-active" : ""} onClick={() => switchMode(false)}>Sign in</button>
            <button className={isRegister ? "is-active" : ""} onClick={() => switchMode(true)}>Create account</button>
          </div>
          <header>
            <span>{isRegister ? "Start your journey" : "Welcome back"}</span>
            <h2>{isRegister ? "Create your restaurant account" : "Sign in to your workspace"}</h2>
            <p>{isRegister ? "For restaurant owners setting up a new workspace." : "Owners and team members can sign in with their work email."}</p>
          </header>
          {searchParams.get("oauth") === "error" && (
            <div className="auth-error" role="alert">Google sign-up was cancelled or could not be completed.</div>
          )}
          {isRegister ? <Register /> : <Login />}
          <p className="auth-switch">
            {isRegister ? "Already use Restro?" : "Setting up a new restaurant?"}
            <button onClick={() => switchMode(!isRegister)}>{isRegister ? "Sign in" : "Create an account"}</button>
          </p>
          <p className="auth-legal">
            By continuing, you agree to Restro&apos;s{" "}
            <Link to="/terms">Terms of Service</Link> and{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
