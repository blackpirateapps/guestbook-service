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
    <div className="guestbook-container">
      <h1>{isLogin ? 'Login' : 'Signup'}</h1>
      <form onSubmit={handleSubmit}>
        <label>Username: </label>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
        <br /><br />
        <label>Password: </label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <br /><br />
        <button type="submit">{isLogin ? 'Login' : 'Sign Up'}</button>
      </form>
      <br />
      <button onClick={() => setIsLogin(!isLogin)}>
        Switch to {isLogin ? 'Sign Up' : 'Login'}
      </button>
    </div>
  );
}