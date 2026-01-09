import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [connectedDomain, setConnectedDomain] = useState(null);
  const [requireApproval, setRequireApproval] = useState(false);
  
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
    const entryRes = await fetch('/api/entries', { headers: { 'Authorization': `Bearer ${token}` } });
    if (entryRes.ok) setEntries(await entryRes.json());

    // Fetch Profile
    const profileRes = await fetch(`/api/profile?username=${username}`);
    if (profileRes.ok) {
      const data = await profileRes.json();
      setCustomCss(data.custom_css || '');
      setCustomHtml(data.custom_html || '');
      setConnectedDomain(data.custom_domain);
      setRequireApproval(data.require_approval === 1);
    }
  }

  // --- ACTIONS ---

  async function saveSettings() {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        custom_css: customCss, 
        custom_html: customHtml, 
        require_approval: requireApproval
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
      alert("Domain connected!");
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
    }
  }

  async function approveEntry(id) {
    await fetch('/api/entries', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'approve', id })
    });
    fetchData();
  }

  async function deleteEntry(id) {
    if(!confirm("Delete this entry?")) return;
    await fetch('/api/entries', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    fetchData();
  }

  async function sendReply(parentId) {
    if(!replyMsg.trim()) return;
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }, // Token = Verified Owner Reply
      body: JSON.stringify({
        owner_username: username,
        sender_name: username,
        message: replyMsg,
        parent_id: parentId
      })
    });
    setReplyMsg('');
    setReplyingTo(null);
    fetchData();
  }

  return (
    <div>
      <h1>Dashboard: {username}</h1>
      <button onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</button>
      <hr />

      {/* DOMAIN SECTION */}
      <div>
        <h3>Custom Domain</h3>
        {connectedDomain ? (
          <div>
            <strong>Connected: </strong> 
            <a href={`https://${connectedDomain}`} target="_blank">{connectedDomain}</a>
            <br />
            <button onClick={handleRemoveDomain}>Disconnect Domain</button>
          </div>
        ) : (
          <div>
            <p>1. Add CNAME record: cname.vercel-dns.com</p>
            <input 
              type="text" 
              placeholder="guestbook.yoursite.com" 
              value={domainInput}
              onChange={e => setDomainInput(e.target.value)}
            />
            <button onClick={handleAddDomain}>Connect</button>
          </div>
        )}
      </div>
      <hr />

      {/* MODERATION SETTINGS */}
      <div>
        <h3>🛡️ Moderation</h3>
        <label>
          <input 
            type="checkbox" 
            checked={requireApproval} 
            onChange={e => setRequireApproval(e.target.checked)} 
          />
          Require approval for new messages
        </label>
        <button onClick={saveSettings}>Update Setting</button>
      </div>
      <hr />

      {/* DESIGN SETTINGS */}
      <div>
        <h3>Design</h3>
        <label>CSS</label><br/>
        <textarea rows="4" value={customCss} onChange={e => setCustomCss(e.target.value)} /><br/>
        <label>HTML Header</label><br/>
        <textarea rows="4" value={customHtml} onChange={e => setCustomHtml(e.target.value)} /><br/>
        <button onClick={saveSettings}>Save Design</button>
      </div>
      <hr />

      {/* ENTRIES LIST */}
      <h3>Guestbook Entries</h3>
      
      {entries.map(entry => (
        <div key={entry.id}>
          <hr />
          
          {/* Status Badges */}
          <div>
            {entry.status === 'pending' && <strong>[PENDING] </strong>}
            {entry.is_private === 1 && <strong>[PRIVATE] </strong>}
            {entry.is_owner === 1 && <strong>[YOU] </strong>}
          </div>

          <strong>{entry.sender_name}</strong>
          <p>{entry.message}</p>
          
          <small>
            Likes: {entry.likes} • {new Date(entry.created_at).toLocaleString()}
          </small>
          <br />

          <div>
            {entry.status === 'pending' && (
              <button onClick={() => approveEntry(entry.id)}>Approve</button>
            )}
            
            <button onClick={() => setReplyingTo(entry.id)}>Reply</button>
            <button onClick={() => deleteEntry(entry.id)}>Delete</button>
          </div>

          {/* Inline Reply Form */}
          {replyingTo === entry.id && (
            <div>
              <input 
                type="text" 
                value={replyMsg} 
                onChange={e => setReplyMsg(e.target.value)} 
                placeholder="Write your reply..."
              />
              <button onClick={() => sendReply(entry.id)}>Send</button>
              <button onClick={() => setReplyingTo(null)}>Cancel</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}