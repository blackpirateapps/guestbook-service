import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const navigate = useNavigate();
  
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchEntries();
    fetchProfile();
  }, [token]);

  // Fetch Messages
  async function fetchEntries() {
    const res = await fetch('/api/entries', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setEntries(await res.json());
  }

  // Fetch Current Design Settings
  async function fetchProfile() {
    const res = await fetch(`/api/profile?username=${username}`);
    if (res.ok) {
      const data = await res.json();
      setCustomCss(data.custom_css || '');
      setCustomHtml(data.custom_html || '');
    }
  }

  // Save Design Settings
  async function saveSettings() {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        custom_css: customCss, 
        custom_html: customHtml 
      })
    });
    
    if (res.ok) alert('Design saved successfully!');
    else alert('Failed to save settings');
  }

  async function deleteEntry(id) {
    if(!confirm("Are you sure?")) return;
    
    await fetch('/api/entries', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchEntries();
  }

  return (
    <div>
      <h1>Dashboard: {username}</h1>
      <p>Public link: <a href={`/u/${username}`} target="_blank">/u/{username}</a></p>
      <button onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</button>
      
      <hr />
      
      <h3>Customize Your Page</h3>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <label><strong>Custom CSS</strong> (Style your page)</label><br />
          <textarea 
            rows="10" 
            cols="40" 
            placeholder="body { background: black; color: white; }" 
            value={customCss}
            onChange={e => setCustomCss(e.target.value)}
          />
        </div>
        <div>
          <label><strong>Custom HTML</strong> (Add a bio, header, or images)</label><br />
          <textarea 
            rows="10" 
            cols="40" 
            placeholder="<h1>My Custom Header</h1><p>Welcome to my world...</p>" 
            value={customHtml}
            onChange={e => setCustomHtml(e.target.value)}
          />
        </div>
      </div>
      <br />
      <button onClick={saveSettings}>Save Design</button>

      <hr />
      
      <h3>Entries</h3>
      {entries.length === 0 ? <p>No entries yet.</p> : (
        <ul>
          {entries.map(entry => (
            <li key={entry.id} style={{ marginBottom: '15px' }}>
              <b>{entry.sender_name}</b>
              {entry.sender_website && (
                <span> (<a href={entry.sender_website} target="_blank">Website</a>)</span>
              )}
              <br />
              {entry.message}
              <br />
              <small>{new Date(entry.created_at).toLocaleString()}</small>
              <br />
              <button onClick={() => deleteEntry(entry.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}