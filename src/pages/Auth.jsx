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
    <div className="guestbook-container auth-wrapper">
      <div className="card auth-card">
        <h1 className="text-center">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
        <p className="text-center" style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          {isLogin ? 'Sign in to manage your guestbook' : 'Sign up to get started'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" style={{ marginTop: '16px' }}>
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <hr style={{ margin: '24px 0' }} />

        <div className="text-center">
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}
              style={{ fontWeight: '500', cursor: 'pointer' }}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}