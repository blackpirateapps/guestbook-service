import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [domainInput, setDomainInput] = useState('');
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchData();
  }, [token]);

  async function fetchData() {
    // 1. Fetch Entries
    const entryRes = await fetch('/api/entries', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (entryRes.ok) setEntries(await entryRes.json());

    // 2. Fetch Profile (CSS/HTML)
    const profileRes = await fetch(`/api/profile?username=${username}`);
    if (profileRes.ok) {
      const data = await profileRes.json();
      setCustomCss(data.custom_css || '');
      setCustomHtml(data.custom_html || '');
    }
  }

  // Save CSS/HTML
  async function saveSettings() {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ custom_css: customCss, custom_html: customHtml })
    });
    if (res.ok) alert('Design saved!');
  }

  // Add Domain
  async function handleAddDomain() {
    if (!domainInput) return;
    
    // Simple alert to guide user before they click
    if(!confirm(`Did you already add a CNAME record for ${domainInput} pointing to cname.vercel-dns.com?`)) {
      return;
    }

    const res = await fetch('/api/domain', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ custom_domain: domainInput })
    });

    const data = await res.json();
    
    if (res.ok) {
      alert("Domain connected successfully! It may take a few minutes for SSL to issue.");
      setDomainInput('');
    } else {
      alert("Error: " + data.error);
    }
  }

  async function deleteEntry(id) {
    if(!confirm("Delete this entry?")) return;
    await fetch('/api/entries', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData(); // Reload
  }

  return (
    <div>
      <h1>Dashboard: {username}</h1>
      <p>Your Page: <a href={`/u/${username}`} target="_blank">/u/{username}</a></p>
      <button onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</button>
      
      <hr />

      {/* 1. Custom Domain Section */}
      <div style={{ background: '#eef', padding: '15px', borderRadius: '8px' }}>
        <h3>Connect Custom Domain</h3>
        <p><small>Step 1: Go to your DNS provider and add a CNAME record pointing to <b>cname.vercel-dns.com</b></small></p>
        <p><small>Step 2: Enter your domain below (e.g. guestbook.mysite.com)</small></p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="guestbook.yourdomain.com"
            value={domainInput}
            onChange={e => setDomainInput(e.target.value)}
          />
          <button onClick={handleAddDomain}>Connect</button>
        </div>
      </div>

      <hr />

      {/* 2. Design Section */}
      <h3>Customize Design</h3>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <label><strong>CSS</strong></label>
          <textarea 
            rows="6" 
            style={{ width: '100%' }}
            value={customCss} 
            onChange={e => setCustomCss(e.target.value)} 
            placeholder="body { background: #000; }"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label><strong>HTML Header</strong> (Safe Tags Only)</label>
          <textarea 
            rows="6" 
            style={{ width: '100%' }}
            value={customHtml} 
            onChange={e => setCustomHtml(e.target.value)} 
            placeholder="<h1>My Bio</h1>"
          />
        </div>
      </div>
      <button onClick={saveSettings} style={{ marginTop: '10px' }}>Save Design</button>

      <hr />

      {/* 3. Entries Section */}
      <h3>Guestbook Entries</h3>
      {entries.length === 0 ? <p>No messages yet.</p> : (
        <ul>
          {entries.map(entry => (
            <li key={entry.id} style={{ marginBottom: '15px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
              <div>
                <strong>{entry.sender_name}</strong>
                {entry.sender_website && <span> • <a href={entry.sender_website} target="_blank">Website</a></span>}
                <span style={{ float: 'right', fontSize: '0.8em', color: '#666' }}>
                  {new Date(entry.created_at).toLocaleDateString()}
                </span>
              </div>
              <div style={{ marginTop: '5px' }}>{entry.message}</div>
              <button onClick={() => deleteEntry(entry.id)} style={{ marginTop: '8px', padding: '4px 8px', fontSize: '0.8em' }}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}