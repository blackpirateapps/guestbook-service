import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCheck, IconCopy, IconExternalLink, IconHeart, IconReply, IconTrash } from '../components/Icons';

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
</script>
<div style="margin-top:8px;font-size:12px;opacity:.75;font-family:ui-serif,Georgia,Cambria,'Times New Roman',Times,serif">
  Powered by <a href="https://guestbook.blackpiratex.com" target="_blank" rel="noreferrer">Guestbook Service</a>
</div>` : '';

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
      <div className="dashboard-header">
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <div className="dashboard-subheader">
            <span>Your public link:</span>
            <a className="dashboard-link" href={`/u/${username}`} target="_blank" rel="noreferrer">
              /u/{username} <IconExternalLink />
            </a>
          </div>
        </div>
        <button className="secondary" onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</button>
      </div>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Embed on your site</h3>
        <p style={{ marginBottom: '0.75rem' }}>Paste this snippet into any HTML page to embed your guestbook.</p>
        <textarea
          className="code-textarea"
          rows={10}
          readOnly
          value={embedSnippet || 'Loading embed code...'}
        />
        <div className="actions-row">
          <button className="secondary icon-button" onClick={copyEmbedSnippet} disabled={!embedSnippet}>
            <IconCopy />
            <span>Copy embed code</span>
          </button>
          {embedSrc && (
            <a href={embedSrc} target="_blank" rel="noreferrer">
              <button className="secondary icon-button" type="button">
                <IconExternalLink />
                <span>Preview embed</span>
              </button>
            </a>
          )}
        </div>
      </section>

      <hr />

      <div className="dashboard-grid">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Moderation</h3>
          <p style={{ marginBottom: '0.75rem' }}>Control how new messages appear on your guestbook.</p>
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

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Customize Appearance</h3>
        <p style={{ marginBottom: '0.75rem' }}>Inject custom CSS and HTML into your public page.</p>
        <div className="dashboard-grid">
          <div className="form-group">
            <label>Custom CSS</label>
            <textarea
              rows="5"
              value={customCss}
              onChange={e => setCustomCss(e.target.value)}
              placeholder="/* Add styles here */"
              className="code-textarea"
            />
          </div>
          <div className="form-group">
            <label>Custom HTML menu</label>
            <textarea
              rows="5"
              value={customHtml}
              onChange={e => setCustomHtml(e.target.value)}
              placeholder="<!-- Add HTML here -->"
              className="code-textarea"
            />
          </div>
        </div>
        <button className="secondary" onClick={saveSettings}>Save Appearance</button>
      </section>

      <hr />

      <section>
        <div className="entries-header">
          <h2 style={{ margin: 0 }}>Recent Entries</h2>
          <div className="entries-count">{entries.length}</div>
        </div>
        {entries.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          <div className="entries-list">
            {entries.map(entry => (
              <div key={entry.id} className="entry-card">
                <header className="entry-card-header">
                  <div className="entry-title-row">
                    <div className="entry-name">
                      {entry.sender_name}
                      {entry.sender_website && (
                        <a
                          className="entry-website"
                          href={entry.sender_website}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open sender website"
                          title="Open sender website"
                        >
                          <IconExternalLink />
                        </a>
                      )}

                      <span className="badge-group">
                        {entry.status === 'pending' && <span className="badge pending">Pending</span>}
                        {entry.is_private === 1 && <span className="badge private">Private</span>}
                        {entry.is_owner === 1 && <span className="badge owner">Owner</span>}
                      </span>
                    </div>
                    <div className="entry-date">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="entry-metrics">
                    <IconHeart />
                    <span>{entry.likes || 0}</span>
                  </div>
                </header>

                <div className="entry-content">{entry.message}</div>

                <div className="entry-actions">
                  {entry.status === 'pending' && (
                    <button className="icon-button" onClick={() => approveEntry(entry.id)}>
                      <IconCheck />
                      <span>Approve</span>
                    </button>
                  )}

                  <button className="secondary icon-button" onClick={() => setReplyingTo(entry.id)}>
                    <IconReply />
                    <span>Reply</span>
                  </button>
                  <button className="danger icon-button" onClick={() => deleteEntry(entry.id)}>
                    <IconTrash />
                    <span>Delete</span>
                  </button>
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
