import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const endpoint = isLogin ? '/api/login' : '/api/signup';

    const res = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok) {
      if (isLogin) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        navigate('/dashboard');
      } else {
        alert('Signup successful, please login');
        setIsLogin(true);
      }
    } else {
      alert(data.error);
    }
  }

  return (
    <div className="auth-wrapper">
      <header className="home-hero">
        <h1 className="text-center" style={{ marginBottom: '0.25rem' }}>
          A simple guestbook for your site
        </h1>
        <p className="text-center home-subtitle">
          Collect notes from readers, friends, and customers — with moderation, private messages, and embeds.
        </p>
        <p className="text-center home-meta">
          Built by one guy at <a href="https://blackpiratex.com" target="_blank" rel="noreferrer">blackpiratex.com</a>. No email required to sign up.
        </p>
      </header>

      <div className="home-grid">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>What you get</h3>
          <ul className="home-bullets">
            <li>Public guestbook at <code>/u/yourname</code></li>
            <li>Optional approval flow (anti-spam)</li>
            <li>Private messages to the owner</li>
            <li>Embeddable iframe snippet</li>
            <li>Custom CSS + HTML header</li>
          </ul>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>{isLogin ? 'Sign in' : 'Create an account'}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {isLogin ? 'Welcome back.' : 'Pick a username and password — that’s it.'}
          </p>

          <form onSubmit={handleSubmit} style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </div>

            <button type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
              {isLogin ? 'Login' : 'Sign Up'}
            </button>
          </form>

          <div className="text-center" style={{ marginTop: '0.75rem' }}>
            <p style={{ marginBottom: 0 }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}
              >
                {isLogin ? 'Create one' : 'Log in'}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
