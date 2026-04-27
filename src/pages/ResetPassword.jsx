import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast.jsx";

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid link", "This reset link is missing a token.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password too short", "Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match", "Please re-enter your new password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/user?action=reset_password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success("Password updated", "You can now sign in with your new password.");
        navigate("/");
      } else {
        toast.error("Reset failed", data.error || "Could not reset your password.");
      }
    } catch {
      toast.error("Network error", "Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page reset-password-page">
      <div className="auth-right reset-password-panel">
        <div className="auth-form-box">
          <a href="/" className="auth-logo" style={{ marginBottom: "var(--space-5)" }}>
            <span style={{ color: "var(--color-accent)" }}>⬡</span>
            WebsiteTools
          </a>
          <h2 className="auth-form-title">Choose a new password</h2>
          <p className="auth-form-subtitle">
            Reset links expire quickly. If this one no longer works, request a fresh link from the sign-in page.
          </p>

          <form onSubmit={handleSubmit} style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label htmlFor="reset-password">New Password</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="form-group">
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <button type="submit" className="auth-submit" disabled={submitting || !token}>
              {submitting ? "Updating…" : "Update password"}
            </button>
            <button type="button" className="auth-link-button" onClick={() => navigate("/")}>
              Back to sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
