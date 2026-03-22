import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const endpoint = isLogin ? "/api/user?action=login" : "/api/user?action=signup";

    const res = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (res.ok) {
      if (isLogin) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        navigate("/dashboard");
      } else {
        alert("Signup successful, please login");
        setIsLogin(true);
      }
    } else {
      alert(data.error);
    }
  }

  return (
    <div className="auth-wrapper">
      <header className="auth-hero">
        <h1>Website Tools</h1>
        <p className="subtitle">
          Essential, lightweight, and embeddable tools for your personal website. 
          Guestbooks, Contact Forms, and Threaded Comments — all in one place.
        </p>
        <p className="meta">
          Built with simplicity in mind. No email required. Open source at{" "}
          <a href="https://github.com/blackpirateapps/guestbook-service" target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </p>
      </header>

      <div className="auth-features card">
        <h3>What's Included</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Guestbooks</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              A public wall for readers to leave notes. Supports private messages, moderation, and threading.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Contact Forms</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Customizable forms for your site. Gather submissions without writing any backend code.
            </p>
          </div>
          <div>
            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Comments</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Threaded comment sections for any page. Includes likes, replies, and robust bot protection.
            </p>
          </div>
        </div>
        
        <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Core Features</h4>
        <ul style={{ columnCount: 2, columnGap: '2rem' }}>
          <li>No-email account flow</li>
          <li>Embeddable iframe snippets</li>
          <li>Headless API support</li>
          <li>Custom CSS & HTML injection</li>
          <li>JSON data export/import</li>
          <li>Privacy-first & lightweight</li>
          <li>Moderation & Approval flows</li>
          <li>Anti-spam Honeypots</li>
        </ul>
      </div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${isLogin ? " active" : ""}`}
            onClick={() => setIsLogin(true)}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab${!isLogin ? " active" : ""}`}
            onClick={() => setIsLogin(false)}
          >
            Create account
          </button>
        </div>

        <div className="auth-form-wrapper">
          <p>
            {isLogin
              ? "Welcome back."
              : "Pick a username and password — that's it."}
          </p>

          <form onSubmit={handleSubmit} style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </div>

            <button type="submit">
              {isLogin ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
