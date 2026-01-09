import { Routes, Route, Link } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import PublicGuestbook from './pages/PublicGuestbook';

function App() {
  return (
    <div>
      <nav>
        <Link to="/">Home/Login</Link> | <Link to="/dashboard">Dashboard</Link>
      </nav>
      <hr />
      
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* The Path-Based URL Route */}
        <Route path="/u/:username" element={<PublicGuestbook />} />
      </Routes>
    </div>
  );
}

export default App;