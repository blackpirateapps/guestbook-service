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

  if (loading) return <div className="container">Loading...</div>;

  // ----------------------------------------------------
  // SCENARIO B: NORMAL APP USAGE
  // ----------------------------------------------------
  return (
    <div className="container">
      <nav>
        <Link to="/">Home/Login</Link> | <Link to="/dashboard">Dashboard</Link>
      </nav>
      <hr />
      
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/u/:username" element={<PublicGuestbook />} />
      </Routes>
    </div>
  );
}

export default App;