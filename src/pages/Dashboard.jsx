import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  
  // Domain State
  const [domainInput, setDomainInput] = useState('');
  const [connectedDomain, setConnectedDomain] = useState(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    fetchData();
  }, [token]);

  async function fetchData() {
    // Fetch Entries
    const entryRes = await fetch('/api/entries', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (entryRes.ok) setEntries(await entryRes.json());

    // Fetch Profile (Including Domain)
    const profileRes = await fetch(`/api/profile?username=${username}`);
    if (profileRes.ok) {
      const data = await profileRes.json();
      setCustomCss(data.custom_css || '');
      setCustomHtml(data.custom_html || '');
      setConnectedDomain(data.custom_domain); // <--- Store domain
    }
  }

  // --- Handlers ---

  async function saveSettings() {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ custom_css: customCss, custom_html: customHtml })
    });
    alert('Design saved!');
  }

  async function handleAddDomain() {
    if (!domainInput) return;
    if(!confirm(`Did you add the CNAME record for ${domainInput}?`)) return;

    const res = await fetch('/api/domain', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ custom_domain: domainInput })
    });

    if (res.ok) {
      alert("Domain connected! It may take a few minutes for SSL to generate.");
      setConnectedDomain(domainInput); // Update UI
      setDomainInput('');
    } else {
      const data = await res.json();
      alert("Error: " + data.error);
    }
  }

  async function handleRemoveDomain() {
    if(!confirm("Are you sure? This will take your site offline.")) return;
    
    const res = await fetch('/api/domain', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      setConnectedDomain(null); // Clear UI
      alert("Domain disconnected.");
    } else {
      alert("Failed to disconnect domain.");
    }
  }

  async function deleteEntry(id) {
    if(!confirm("Delete this entry?")) return;
    await fetch('/api/entries', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard: {username}</h1>
        <button onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</button>
      </div>

      <p>Public Vercel Link: <a href={`/u/${username}`} target="_blank">/u/{username}</a></p>
      
      <hr />

      {/* --- DOMAIN SECTION --- */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3>Custom Domain</h3>
        
        {connectedDomain ? (
          /* STATE A: Domain is Connected */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: 'green' }}>● Live</span>
              <span>{connectedDomain}</span>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Check if Live Button (Just visits the site) */}
              <a 
                href={`https://${connectedDomain}`} 
                target="_blank" 
                rel="noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <button style={{ background: '#0070f3' }}>Visit Site ↗</button>
              </a>

              <button 
                onClick={handleRemoveDomain} 
                style={{ background: '#d32f2f', color: 'white' }}
              >
                Disconnect Domain
              </button>
            </div>
          </div>
        ) : (
          /* STATE B: No Domain */
          <div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#555' }}>
              1. Add CNAME record: <code>cname.vercel-dns.com</code><br/>
              2. Enter domain below:
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="guestbook.yoursite.com" 
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button onClick={handleAddDomain}>Connect</button>
            </div>
          </div>
        )}
      </div>

      <hr />

      {/* --- DESIGN SECTION --- */}
      <h3>Customize Design</h3>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <label><strong>CSS</strong></label>
          <textarea 
            rows="6" 
            style={{ width: '100%' }} 
            value={customCss} 
            onChange={e => setCustomCss(e.target.value)} 
          />
        </div>
        <div style={{ flex: 1 }}>
          <label><strong>HTML Header</strong></label>
          <textarea 
            rows="6" 
            style={{ width: '100%' }} 
            value={customHtml} 
            onChange={e => setCustomHtml(e.target.value)} 
          />
        </div>
      </div>
      <button onClick={saveSettings} style={{ marginTop: '10px' }}>Save Design</button>

      <hr />

      {/* --- ENTRIES SECTION --- */}
      <h3>Guestbook Entries</h3>
      {entries.length === 0 ? <p>No messages yet.</p> : (
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {entries.map(entry => (
            <li key={entry.id} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <div>
                <strong>{entry.sender_name}</strong>
                {entry.sender_website && <span> • <a href={entry.sender_website} target="_blank">Website</a></span>}
                <span style={{ float: 'right', fontSize: '0.8em', color: '#666' }}>
                  {new Date(entry.created_at).toLocaleDateString()}
                </span>
              </div>
              <p style={{ marginTop: '5px' }}>{entry.message}</p>
              <button onClick={() => deleteEntry(entry.id)} style={{ padding: '4px 8px', fontSize: '0.8em' }}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}