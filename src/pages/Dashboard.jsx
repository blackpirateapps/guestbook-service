import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [connectedDomain, setConnectedDomain] = useState(null);
  const [requireApproval, setRequireApproval] = useState(false);
  
  const [domainInput, setDomainInput] = useState('');
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
    const entryRes = await fetch('/api/entries', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (entryRes.ok) setEntries(await entryRes.json());

    const profileRes = await fetch(`/api/profile?username=${username}`);
    if (profileRes.ok) {
      const data = await profileRes.json();
      setCustomCss(data.custom_css || '');
      setCustomHtml(data.custom_html || '');
      setConnectedDomain(data.custom_domain);
      setRequireApproval(data.require_approval === 1);
    }
  }

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

  async function approveEntry(id) {
    await fetch('/api/entries', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'approve', id })
    });
    fetchData();
  }

  async function sendReply(parentId) {
    if(!replyMsg.trim()) return;
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
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
      <div>
        <h1>Dashboard: {username}</h1>
        <button onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</button>
      </div>

      <p>Public Vercel Link: <a href={`/u/${username}`} target="_blank">/u/{username}</a></p>
      
      <hr />

      <div>
        <h3>Custom Domain</h3>
        {connectedDomain ? (
          <div>
            <div>
              <span>● Live</span>
              <span>{connectedDomain}</span>
            </div>
            <div>
              <a href={`https://${connectedDomain}`} target="_blank" rel="noreferrer">
                <button>Visit Site ↗</button>
              </a>
              <button onClick={handleRemoveDomain}>Disconnect</button>
            </div>
          </div>
        ) : (
          <div>
            <p>
              1. Add CNAME: <code>cname.vercel-dns.com</code><br/>
              2. Enter domain:
            </p>
            <div>
              <input
                type="text"
                placeholder="guestbook.yoursite.com"
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
              />
              <button onClick={handleAddDomain}>Connect</button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3>🛡️ Moderation Settings</h3>
        <label>
          <input 
            type="checkbox" 
            checked={requireApproval} 
            onChange={e => setRequireApproval(e.target.checked)}
          />
          <span>Require approval for new messages (Hold in Pending)</span>
        </label>
        <br />
        <button onClick={saveSettings}>Update Settings</button>
      </div>

      <h3>Customize Design</h3>
      <div>
        <div>
          <label><strong>CSS</strong></label>
          <textarea rows="6" value={customCss} onChange={e => setCustomCss(e.target.value)} />
        </div>
        <div>
          <label><strong>HTML Header</strong></label>
          <textarea rows="6" value={customHtml} onChange={e => setCustomHtml(e.target.value)} />
        </div>
      </div>
      <button onClick={saveSettings}>Save Design</button>

      <hr />

      <h3>Guestbook Entries</h3>
      {entries.length === 0 ? <p>No messages yet.</p> : (
        <div>
          {entries.map(entry => (
            <div key={entry.id}>
              <div>
                {entry.status === 'pending' && <span>PENDING APPROVAL</span>}
                {entry.is_private === 1 && <span>🔒 PRIVATE</span>}
                {entry.is_owner === 1 && <span>👑 YOU</span>}
              </div>

              <div>
                <strong>{entry.sender_name}</strong>
                {entry.sender_website && <span> • <a href={entry.sender_website} target="_blank">Website</a></span>}
                <span>
                  {new Date(entry.created_at).toLocaleString()} • ❤️ {entry.likes || 0}
                </span>
              </div>
              
              <p>{entry.message}</p>
              
              <div>
                {entry.status === 'pending' && (
                  <button onClick={() => approveEntry(entry.id)}>Approve</button>
                )}
                
                <button onClick={() => setReplyingTo(entry.id)}>Reply</button>
                <button onClick={() => deleteEntry(entry.id)}>Delete</button>
              </div>

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
      )}
    </div>
  );
}
