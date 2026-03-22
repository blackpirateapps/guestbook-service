import { useEffect, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PublicGuestbook from "./pages/PublicGuestbook";
import "./index.css";

function App() {
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isEmbedRequest =
    new URLSearchParams(window.location.search).get("embed") === "1";
  const isDashboard = location.pathname.startsWith("/dashboard");

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

  if (isDashboard) {
    return (
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    );
  }

  return (
    <div className="container">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span>Website</span>Tools
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/u/:username" element={<PublicGuestbook />} />
      </Routes>
    </div>
  );
}

export default App;
