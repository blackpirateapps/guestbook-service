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
      <h1 className="text-center">{isLogin ? 'Hello' : 'Welcome'}</h1>
      <p className="text-center" style={{ color: 'var(--text-muted)' }}>
        {isLogin ? 'Sign in to your guestbook' : 'Create your guestbook'}
      </p>

      <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '2rem auto' }}>
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

        <button type="submit" style={{ width: '100%', marginTop: '1rem' }}>
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>

      <div className="text-center">
        <p>
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
  );
}