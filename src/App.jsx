import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ToastProvider } from "./components/Toast.jsx";
import Auth             from "./pages/Auth";
import Dashboard        from "./pages/Dashboard";
import PublicGuestbook  from "./pages/PublicGuestbook";
import "./index.css";

function App() {
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isEmbedRequest = new URLSearchParams(window.location.search).get("embed") === "1";
  const isDashboard    = location.pathname.startsWith("/dashboard");

  useEffect(() => { setLoading(false); }, []);

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
        Loading…
      </div>
    );
  }

  // Embed mode — no chrome, no toast needed
  if (isEmbedRequest) {
    return (
      <div style={{ padding: 0, maxWidth: "100%" }}>
        <Routes>
          <Route path="/u/:username" element={<PublicGuestbook />} />
          <Route
            path="*"
            element={
              <div style={{ padding: "1rem", color: "var(--color-text-muted)" }}>
                Invalid embed URL.
              </div>
            }
          />
        </Routes>
      </div>
    );
  }

  // Dashboard — full-page layout (no outer nav)
  if (isDashboard) {
    return (
      <ToastProvider>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </ToastProvider>
    );
  }

  // Public routes — Auth + Public Guestbook
  return (
    <ToastProvider>
      <Routes>
        <Route path="/"            element={<Auth />} />
        <Route path="/u/:username" element={<PublicGuestbook />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
