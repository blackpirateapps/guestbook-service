import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast.jsx";

const FEATURES = [
  {
    icon: "📖",
    title: "Guestbooks",
    desc:  "A public wall for readers to leave notes. Supports moderation, threading, and privacy mode.",
  },
  {
    icon: "📬",
    title: "Contact Forms",
    desc:  "Customizable drag-and-drop forms. Gather submissions without writing any backend code.",
  },
  {
    icon: "💬",
    title: "Comments",
    desc:  "Threaded comment sections for any page. Includes likes, replies, and robust anti-spam.",
  },
];

const PILLS = [
  "No email required",
  "Embeddable iframes",
  "Headless API",
  "Custom CSS injection",
  "JSON export / import",
  "Moderation flows",
  "Anti-spam honeypots",
  "Open source",
];

export default function Auth() {
  const [isLogin,       setIsLogin]       = useState(true);
  const [username,      setUsername]      = useState("");
  const [password,      setPassword]      = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [showReset,     setShowReset]     = useState(false);
  const [resetMessage,  setResetMessage]  = useState("");
  const [resetContact,  setResetContact]  = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const navigate = useNavigate();
  const toast    = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const endpoint = isLogin
      ? "/api/user?action=login"
      : "/api/user?action=signup";

    try {
      const res  = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok) {
        if (isLogin) {
          localStorage.setItem("token",    data.token);
          localStorage.setItem("username", data.username);
          navigate("/dashboard");
        } else {
          toast.success("Account created!", "You can now sign in.");
          setIsLogin(true);
          setPassword("");
        }
      } else {
        toast.error("Error", data.error || "Something went wrong.");
      }
    } catch {
      toast.error("Network error", "Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetRequest(e) {
    e.preventDefault();
    setSubmitting(true);
    setResetMessage("");
    setResetContact("");

    try {
      const res = await fetch("/api/user?action=request_password_reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: resetUsername,
          origin: window.location.origin
        })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setResetMessage(data.message || "If that username has Telegram set up, a reset link has been sent.");
        toast.success("Reset requested", "Check Telegram for the password reset link.");
      } else if (data.contact_url) {
        setResetMessage(data.error || "Contact admin to reset your password.");
        setResetContact(data.contact_url);
      } else {
        toast.error("Reset failed", data.error || "Could not request password reset.");
      }
    } catch {
      toast.error("Network error", "Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      {/* ── Left: Feature spotlight ── */}
      <div className="auth-left">
        <a href="/" className="auth-logo">
          <span style={{ color: "var(--color-accent)" }}>⬡</span>
          WebsiteTools
        </a>

        <h1 className="auth-headline">
          Essential tools for your<br />personal website.
        </h1>
        <p className="auth-subline">
          Lightweight, embeddable, and privacy-first. Guestbooks, contact forms,
          and threaded comments — all in one place, no email required.
        </p>

        <div className="auth-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="auth-feature-card">
              <div className="auth-feature-icon">{f.icon}</div>
              <div className="auth-feature-title">{f.title}</div>
              <div className="auth-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>

        <div className="auth-pill-list" style={{ marginTop: "1.5rem" }}>
          {PILLS.map((p) => (
            <span key={p} className="auth-pill">{p}</span>
          ))}
        </div>

        <p style={{ marginTop: "1.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          Open source on{" "}
          <a
            href="https://github.com/blackpirateapps/guestbook-service"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </p>
      </div>

      {/* ── Right: Auth form ── */}
      <div className="auth-right">
        <div className="auth-form-box">
          <h2 className="auth-form-title">
            {showReset ? "Reset password" : isLogin ? "Welcome back." : "Create account"}
          </h2>
          <p className="auth-form-subtitle">
            {showReset
              ? "Enter your username and we'll send a reset link to your Telegram chat."
              : isLogin
              ? "Sign in to your dashboard."
              : "Pick a username and password — that's it."}
          </p>

          {/* Tab switcher */}
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={`auth-tab${isLogin ? " active" : ""}`}
              aria-selected={isLogin}
              onClick={() => { setIsLogin(true); setShowReset(false); }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              className={`auth-tab${!isLogin ? " active" : ""}`}
              aria-selected={!isLogin}
              onClick={() => { setIsLogin(false); setShowReset(false); }}
            >
              Create account
            </button>
          </div>

          <div className="auth-form-wrapper">
            {showReset ? (
              <form onSubmit={handleResetRequest} style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label htmlFor="reset-username">Username</label>
                  <input
                    id="reset-username"
                    type="text"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    placeholder="your_username"
                    autoComplete="username"
                    required
                  />
                </div>
                {resetMessage && (
                  <p className="auth-inline-note">
                    {resetMessage}
                    {resetContact && (
                      <>
                        {" "}
                        <a href={resetContact} target="_blank" rel="noreferrer">
                          Contact admin
                        </a>
                      </>
                    )}
                  </p>
                )}
                <button
                  type="submit"
                  className="auth-submit"
                  disabled={submitting}
                >
                  {submitting ? "Sending…" : "Send reset link"}
                </button>
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => setShowReset(false)}
                >
                  Back to {isLogin ? "sign in" : "create account"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label htmlFor="auth-username">Username</label>
                  <input
                    id="auth-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_username"
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="auth-password">Password</label>
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    minLength={isLogin ? undefined : 8}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="auth-submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Please wait…"
                    : isLogin
                    ? "Sign in →"
                    : "Create account →"}
                </button>
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => {
                    setResetUsername(username);
                    setResetMessage("");
                    setResetContact("");
                    setShowReset(true);
                  }}
                >
                  Forgot your password?
                </button>
              </form>
            )}
          </div>

          <p className="auth-footer-note">
            By signing up you agree to use this service responsibly.
            <br />
            Questions?{" "}
            <a
              href="https://github.com/blackpirateapps/guestbook-service"
              target="_blank"
              rel="noreferrer"
            >
              See the docs.
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
