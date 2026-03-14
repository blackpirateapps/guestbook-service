import { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import PublicGuestbook from './pages/PublicGuestbook';
import './index.css';

function App() {
  const [customDomainUser, setCustomDomainUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDomain();
  }, []);

  async function checkDomain() {
    const hostname = window.location.hostname;
    // UPDATE THIS: The domain where your main app lives
    const mainDomain = "your-app-name.vercel.app";

    // Skip check for localhost or main domain
    if (hostname.includes('localhost') || hostname === mainDomain) {
      setLoading(false);
      return;
    }

    try {
      // Updated: Now using the unified /api/domain endpoint
      const res = await fetch(`/api/domain?domain=${hostname}`);
      if (res.ok) {
        const data = await res.json();
        setCustomDomainUser(data.username);
      }
    } catch (err) {
      console.error("Domain resolution failed", err);
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------
  // SCENARIO A: VISITING VIA CUSTOM DOMAIN
  // ----------------------------------------------------
  if (customDomainUser) {
    // We override the username prop directly
    return <PublicGuestbook overrideUsername={customDomainUser} />;
  }

  if (loading) return <div className="guestbook-container text-center" style={{ marginTop: '100px', color: 'var(--text-muted)' }}>Loading application...</div>;

  // ----------------------------------------------------
  // SCENARIO B: NORMAL APP USAGE
  // ----------------------------------------------------
  return (
    <div className="container">
      <nav className="navbar">
        <div style={{ fontWeight: '700', fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--accent-primary)' }}>Guest</span>book
        </div>
        <div className="nav-links">
          <Link to="/" style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '500' }}>Home</Link>
          <Link to="/dashboard" style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '500' }}>Dashboard</Link>
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