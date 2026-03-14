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
    if (!confirm(`Did you add the CNAME record for ${domainInput}?`)) return;

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
    if (!confirm("Are you sure? This will take your site offline.")) return;
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
    if (!confirm("Delete this entry?")) return;
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
    if (!replyMsg.trim()) return;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <button className="secondary" onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <p>Your Public Guestbook Link: <a href={`/u/${username}`} target="_blank" rel="noreferrer">/u/{username}</a></p>
      </div>

      <hr />

      <div className="dashboard-grid">
        <section>
          <h3>Domain Setup</h3>

          {connectedDomain ? (
            <div>
              <div className="domain-status">
                Connected to: <strong>{connectedDomain}</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <a href={`https://${connectedDomain}`} target="_blank" rel="noreferrer">
                  <button className="secondary">Visit Site</button>
                </a>
                <button className="danger" onClick={handleRemoveDomain}>Disconnect</button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 1rem 0' }}>
                1. Add CNAME <code>cname.vercel-dns.com</code><br />
                2. Enter domain below:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="guestbook.yoursite.com"
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  style={{ flex: 1, margin: 0 }}
                />
                <button onClick={handleAddDomain}>Connect</button>
              </div>
            </div>
          )}
        </section>

        <section>
          <h3>Moderation</h3>
          <p>Control how new messages appear on your guestbook.</p>
          <label className="checkbox-label" style={{ marginBottom: '1rem' }}>
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={e => setRequireApproval(e.target.checked)}
            />
            Require approval for new messages
          </label>
          <button className="secondary" onClick={saveSettings}>Update Moderation</button>
        </section>
      </div>

      <hr />

      <section style={{ marginBottom: '2rem' }}>
        <h3>Customize Appearance</h3>
        <p>Inject custom CSS and HTML into your public page.</p>
        <div className="dashboard-grid">
          <div className="form-group">
            <label>Custom CSS</label>
            <textarea
              rows="5"
              value={customCss}
              onChange={e => setCustomCss(e.target.value)}
              placeholder="/* Add styles here */"
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <div className="form-group">
            <label>Custom HTML menu</label>
            <textarea
              rows="5"
              value={customHtml}
              onChange={e => setCustomHtml(e.target.value)}
              placeholder="<!-- Add HTML here -->"
              style={{ fontFamily: 'monospace' }}
            />
          </div>
        </div>
        <button className="secondary" onClick={saveSettings}>Save Appearance</button>
      </section>

      <hr />

      <section>
        <h2>Recent Entries</h2>
        {entries.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          <div className="entries-list">
            {entries.map(entry => (
              <div key={entry.id} className="entry-item">
                <div className="entry-header">
                  <div className="entry-meta-top">
                    <div className="entry-name">
                      {entry.sender_name}
                      {entry.sender_website && (
                        <a href={entry.sender_website} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '6px', textDecoration: 'none' }}>
                          🔗
                        </a>
                      )}

                      <div style={{ display: 'inline', marginLeft: '0.5rem' }}>
                        {entry.status === 'pending' && <span className="badge pending">Pending</span>}
                        {entry.is_private === 1 && <span className="badge private">Private</span>}
                        {entry.is_owner === 1 && <span className="badge owner">Owner</span>}
                      </div>
                    </div>
                    <div className="entry-date">
                      {new Date(entry.created_at).toLocaleString()} • ❤️ {entry.likes || 0}
                    </div>
                  </div>
                </div>

                <div className="entry-content">
                  {entry.message}
                </div>

                <div className="entry-actions">
                  {entry.status === 'pending' && (
                    <button onClick={() => approveEntry(entry.id)}>Approve</button>
                  )}

                  <button className="secondary" onClick={() => setReplyingTo(entry.id)}>Reply</button>
                  <button className="danger" onClick={() => deleteEntry(entry.id)}>Delete</button>
                </div>

                {replyingTo === entry.id && (
                  <div style={{ marginTop: '1rem' }}>
                    <textarea
                      rows="2"
                      value={replyMsg}
                      onChange={e => setReplyMsg(e.target.value)}
                      placeholder="Write a reply as the owner..."
                      style={{ marginBottom: '0.5rem', minHeight: '80px' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => sendReply(entry.id)}>Send</button>
                      <button className="secondary" onClick={() => setReplyingTo(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
