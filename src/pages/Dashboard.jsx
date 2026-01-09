import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [connectedDomain, setConnectedDomain] = useState(null);
  const [requireApproval, setRequireApproval] = useState(false); // Feature 4: Mod Setting
  
  // Domain State
  const [domainInput, setDomainInput] = useState('');

  // Reply State
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMsg, setReplyMsg] = useState('');
  
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

    // Fetch Profile (Including Domain & Mod Setting)
    const profileRes = await fetch(`/api/profile?username=${username}`);
    if (profileRes.ok) {
      const data = await profileRes.json();
      setCustomCss(data.custom_css || '');
      setCustomHtml(data.custom_html || '');
      setConnectedDomain(data.custom_domain);
      setRequireApproval(data.require_approval === 1); // Feature 4
    }
  }

  // --- Handlers ---

  async function saveSettings() {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        custom_css: customCss, 
        custom_html: customHtml, 
        require_approval: requireApproval // Feature 4
      })
    });
    alert('Settings saved!');
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
      alert("Domain connected! SSL generating...");
      setConnectedDomain(domainInput);
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
      setConnectedDomain(null);
      alert("Domain disconnected.");
    } else {
      alert("Failed.");
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

  // Feature 4: Approve Logic
  async function approveEntry(id) {
    await fetch('/api/entries', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'approve', id })
    });
    fetchData();
  }

  // Feature 1: Owner Reply Logic
  async function sendReply(parentId) {
    if(!replyMsg.trim()) return;
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }, // Token auth makes it an "Owner Reply"
      body: JSON.stringify({
        owner_username: username,
        sender_name: username, // Force owner name
        message: replyMsg,
        parent_id: parentId
      })
    });
    setReplyMsg('');
    setReplyingTo(null);
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
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
        <h3>Custom Domain</h3>
        {connectedDomain ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: 'green' }}>● Live</span>
              <span>{connectedDomain}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href={`https://${connectedDomain}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <button style={{ background: '#0070f3', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Visit Site ↗</button>
              </a>
              <button onClick={handleRemoveDomain} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Disconnect</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#555' }}>
              1. Add CNAME: <code>cname.vercel-dns.com</code><br/>
              2. Enter domain:
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="guestbook.yoursite.com" value={domainInput} onChange={e => setDomainInput(e.target.value)} style={{ flex: 1, padding: '8px' }} />
              <button onClick={handleAddDomain} style={{ cursor: 'pointer', padding: '8px 16px' }}>Connect</button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODERATION SETTINGS (Feature 4) --- */}
      <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>🛡️ Moderation Settings</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={requireApproval} 
            onChange={e => setRequireApproval(e.target.checked)} 
            style={{ width: '20px', height: '20px' }}
          />
          <span>Require approval for new messages (Hold in Pending)</span>
        </label>
        <br />
        <button onClick={saveSettings} style={{ cursor: 'pointer', padding: '6px 12px' }}>Update Settings</button>
      </div>

      {/* --- DESIGN SECTION --- */}
      <h3>Customize Design</h3>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <label><strong>CSS</strong></label>
          <textarea rows="6" style={{ width: '100%' }} value={customCss} onChange={e => setCustomCss(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label><strong>HTML Header</strong></label>
          <textarea rows="6" style={{ width: '100%' }} value={customHtml} onChange={e => setCustomHtml(e.target.value)} />
        </div>
      </div>
      <button onClick={saveSettings} style={{ marginBottom: '20px', cursor: 'pointer', padding: '8px 16px' }}>Save Design</button>

      <hr />

      {/* --- ENTRIES SECTION --- */}
      <h3>Guestbook Entries</h3>
      {entries.length === 0 ? <p>No messages yet.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {entries.map(entry => (
            <div key={entry.id} style={{ 
              border: '1px solid #ddd', 
              padding: '15px', 
              borderRadius: '5px',
              // Feature 4: Visual cue for pending
              background: entry.status === 'pending' ? '#fff8e1' : '#fff',
              borderLeft: entry.status === 'pending' ? '5px solid orange' : '1px solid #ddd'
            }}>
              
              {/* Badges Row */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {entry.status === 'pending' && <span style={{ background: 'orange', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7em', fontWeight: 'bold' }}>PENDING APPROVAL</span>}
                {/* Feature 2: Private Badge */}
                {entry.is_private === 1 && <span style={{ background: '#333', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7em', fontWeight: 'bold' }}>🔒 PRIVATE</span>}
                {/* Feature 1: Owner Badge */}
                {entry.is_owner === 1 && <span style={{ background: 'blue', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7em', fontWeight: 'bold' }}>👑 YOU</span>}
              </div>

              <div>
                <strong>{entry.sender_name}</strong>
                {entry.sender_website && <span> • <a href={entry.sender_website} target="_blank">Website</a></span>}
                <span style={{ float: 'right', fontSize: '0.8em', color: '#666' }}>
                  {new Date(entry.created_at).toLocaleString()} • ❤️ {entry.likes || 0}
                </span>
              </div>
              
              <p style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>{entry.message}</p>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                {/* Feature 4: Approve Button */}
                {entry.status === 'pending' && (
                  <button onClick={() => approveEntry(entry.id)} style={{ background: 'green', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Approve</button>
                )}
                
                <button onClick={() => setReplyingTo(entry.id)} style={{ cursor: 'pointer', padding: '6px 12px' }}>Reply</button>
                
                <button onClick={() => deleteEntry(entry.id)} style={{ background: 'red', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
              </div>

              {/* Inline Reply Form */}
              {replyingTo === entry.id && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', padding: '10px', background: '#f1f1f1', borderRadius: '4px' }}>
                  <input 
                    type="text" 
                    value={replyMsg} 
                    onChange={e => setReplyMsg(e.target.value)} 
                    placeholder="Write your reply..."
                    style={{ flex: 1, padding: '8px' }}
                  />
                  <button onClick={() => sendReply(entry.id)} style={{ background: '#000', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Send</button>
                  <button onClick={() => setReplyingTo(null)} style={{ background: '#ccc', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}