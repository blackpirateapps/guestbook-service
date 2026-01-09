import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchEntries();
  }, [token]);

  async function fetchEntries() {
    const res = await fetch('/api/entries', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setEntries(await res.json());
    }
  }

  async function deleteEntry(id) {
    await fetch('/api/entries', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchEntries(); // Refresh list
  }

  return (
    <div>
      <h1>Welcome, {username}</h1>
      <p>Your public guestbook link: <a href={`/u/${username}`}>/u/{username}</a></p>
      <button onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</button>
      
      <h2>Your Guestbook Entries</h2>
      {entries.length === 0 ? <p>No entries yet.</p> : (
        <ul>
          {entries.map(entry => (
            <li key={entry.id}>
              <b>{entry.sender_name}</b> wrote:
              <br />
              {entry.message}
              <br />
              <button onClick={() => deleteEntry(entry.id)}>Delete</button>
              <hr />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}