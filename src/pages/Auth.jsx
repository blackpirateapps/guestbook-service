import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const endpoint = isLogin ? "/api/login" : "/api/signup";

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
        <h1>A simple guestbook for your site</h1>
        <p className="subtitle">
          Collect notes from readers, friends, and customers — with moderation,
          private messages, and embeds.
        </p>
        <p className="meta">
          Built by one guy at{" "}
          <a href="https://blackpiratex.com" target="_blank" rel="noreferrer">
            blackpiratex.com
          </a>
          . No email required.
        </p>
      </header>

      <div className="auth-features card">
        <h3>What you get</h3>
        <ul>
          <li>
            Public guestbook at <code>/u/yourname</code>
          </li>
          <li>Privacy-friendly, no-email account flow</li>
          <li>Optional approval flow (anti-spam)</li>
          <li>Private messages to the owner</li>
          <li>Replies and likes built in</li>
          <li>Embeddable iframe snippet</li>
          <li>Headless API with JSON import/export</li>
          <li>
            Open source on{" "}
            <a
              href="https://github.com/blackpirateapps/guestbook-service"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </li>
          <li>Custom CSS + HTML header</li>
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
