import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [origin, setOrigin] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMsg, setReplyMsg] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  useEffect(() => {
    setOrigin(window.location.origin);
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

  const embedSrc = origin && username ? `${origin}/u/${username}?embed=1` : '';

  const embedSnippet = embedSrc ? `<iframe
  id="guestbook-embed"
  src="${embedSrc}"
  style="width:100%;border:0;height:650px"
  loading="lazy"
></iframe>
<script>
(function () {
  var iframe = document.getElementById('guestbook-embed');
  function onMessage(e) {
    if (!iframe || e.source !== iframe.contentWindow) return;
    if (!e.data || e.data.type !== 'guestbook:resize') return;
    if (typeof e.data.height === 'number') iframe.style.height = (e.data.height + 20) + 'px';
  }
  window.addEventListener('message', onMessage, false);
})();
</script>` : '';

  async function copyEmbedSnippet() {
    if (!embedSnippet) return;
    try {
      await navigator.clipboard.writeText(embedSnippet);
      alert('Embed code copied to clipboard.');
    } catch {
      alert('Could not copy automatically. Select the text and copy it manually.');
    }
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

      <section style={{ marginBottom: '2rem' }}>
        <h3>Embed on your site</h3>
        <p>Paste this snippet into any HTML page to embed your guestbook.</p>
        <textarea
          rows={10}
          readOnly
          value={embedSnippet || 'Loading embed code...'}
          style={{ fontFamily: 'monospace' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="secondary" onClick={copyEmbedSnippet} disabled={!embedSnippet}>Copy embed code</button>
          {embedSrc && (
            <a href={embedSrc} target="_blank" rel="noreferrer">
              <button className="secondary" type="button">Preview embed</button>
            </a>
          )}
        </div>
      </section>

      <hr />

      <div className="dashboard-grid">
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
