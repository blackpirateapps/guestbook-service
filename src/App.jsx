import { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import PublicGuestbook from './pages/PublicGuestbook';
import './index.css';

function App() {
  const [loading, setLoading] = useState(true);
  const isEmbedRequest = new URLSearchParams(window.location.search).get('embed') === '1';

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <div className="guestbook-container text-center" style={{ marginTop: '100px', color: 'var(--text-muted)' }}>Loading application...</div>;

  if (isEmbedRequest) {
    return (
      <div className="guestbook-container" style={{ padding: 0, maxWidth: '100%' }}>
        <Routes>
          <Route path="/u/:username" element={<PublicGuestbook />} />
          <Route path="*" element={<div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Invalid embed URL.</div>} />
        </Routes>
      </div>
    );
  }

  // ----------------------------------------------------
  // NORMAL APP USAGE
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
