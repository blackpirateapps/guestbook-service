import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PublicGuestbook from "./pages/PublicGuestbook";
import "./index.css";

function App() {
  const [loading, setLoading] = useState(true);
  const isEmbedRequest =
    new URLSearchParams(window.location.search).get("embed") === "1";

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div
        className="container text-center"
        style={{ marginTop: "100px", color: "var(--text-muted)" }}
      >
        Loading...
      </div>
    );
  }

  if (isEmbedRequest) {
    return (
      <div style={{ padding: 0, maxWidth: "100%" }}>
        <Routes>
          <Route path="/u/:username" element={<PublicGuestbook />} />
          <Route
            path="*"
            element={
              <div style={{ padding: "1rem", color: "var(--text-muted)" }}>
                Invalid embed URL.
              </div>
            }
          />
        </Routes>
      </div>
    );
  }

  return (
    <div className="container">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span>Guest</span>book
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/u/:username" element={<PublicGuestbook />} />
      </Routes>
    </div>
  );
}

export default App;
