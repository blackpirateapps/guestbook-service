import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCheck, IconCopy, IconExternalLink, IconHeart, IconReply, IconTrash } from '../components/Icons';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [embedCssUrl, setEmbedCssUrl] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [origin, setOrigin] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [importName, setImportName] = useState('');
  const [importWebsite, setImportWebsite] = useState('');
  const [importDate, setImportDate] = useState('');
  const [importMessage, setImportMessage] = useState('');

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
      setEmbedCssUrl(data.embed_css_url || '');
      setRequireApproval(data.require_approval === 1);
    }
  }

  async function saveSettings() {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        custom_css: customCss,
        custom_html: customHtml,
        embed_css_url: embedCssUrl,
        require_approval: requireApproval
      })
    });
    if (res.ok) {
      alert('Settings saved!');
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Failed to save settings.');
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

  async function addImportedEntry(e) {
    e.preventDefault();
    if (!importName.trim() || !importMessage.trim() || !importDate) return;

    const dateObj = new Date(importDate);
    if (Number.isNaN(dateObj.getTime())) {
      alert('Please provide a valid date.');
      return;
    }

    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        action: 'import',
        owner_username: username,
        sender_name: importName,
        sender_website: importWebsite,
        message: importMessage,
        created_at: dateObj.toISOString()
      })
    });

    if (res.ok) {
      setImportName('');
      setImportWebsite('');
      setImportDate('');
      setImportMessage('');
      fetchData();
      alert('Entry added.');
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Failed to add entry.');
    }
  }

  const embedSrc = origin && username ? `${origin}/u/${username}?embed=1` : '';
  const widgetSrc = origin ? `${origin}/guestbook-widget.js` : '';

  const rootEntryCount = entries.filter(e => !e.parent_id).length;
  const replyCount = entries.filter(e => !!e.parent_id).length;
  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const privateCount = entries.filter(e => e.is_private === 1).length;
  const likesTotal = entries.reduce((sum, e) => sum + (e.likes || 0), 0);

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

  const headlessSubmitSnippet = origin && username ? `<form id="guestbook-form">
  <input name="name" placeholder="Your name" required />
  <input name="website" placeholder="https://example.com (optional)" />
  <textarea name="message" placeholder="Leave a note..." required></textarea>
  <button type="submit">Sign Guestbook</button>
</form>

<script>
  const baseUrl = "${origin}";
  const owner = "${username}";
  document.getElementById("guestbook-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      owner_username: owner,
      sender_name: fd.get("name"),
      sender_website: fd.get("website"),
      message: fd.get("message"),
      is_private: false,
      bot_field: ""
    };
    const res = await fetch(baseUrl + "/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to submit");
    alert("Submitted!");
  });
</script>` : '';

  const headlessWidgetSnippet = widgetSrc && username ? `<div id="guestbook-entries"></div>
<script src="${widgetSrc}"></script>
<script>
  GuestbookWidget.mount({
    baseUrl: "${origin}",
    username: "${username}",
    container: "#guestbook-entries"
  });
</script>` : '';

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard.');
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
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label>Embed CSS URL (optional)</label>
          <input
            type="url"
            placeholder="https://example.com/embed.css"
            value={embedCssUrl}
            onChange={e => setEmbedCssUrl(e.target.value)}
          />
          <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
            This stylesheet loads inside the iframe so you can style the embed independently. Must be publicly accessible over <code>https://</code>.
          </p>
        </div>
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

      <section className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Threads</div>
          <div className="stat-value">{rootEntryCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Replies</div>
          <div className="stat-value">{replyCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Private</div>
          <div className="stat-value">{privateCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Likes</div>
          <div className="stat-value">{likesTotal}</div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Headless API (build your own UI)</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Use your own form and layout. The API supports cross-origin requests, and you can optionally use the widget to populate entries.
        </p>

        <h4 style={{ margin: '0 0 0.5rem 0' }}>1) Custom form → API</h4>
        <textarea className="code-textarea" rows={10} readOnly value={headlessSubmitSnippet || 'Loading...'} />
        <div className="actions-row">
          <button className="secondary icon-button" onClick={() => copyText(headlessSubmitSnippet)} disabled={!headlessSubmitSnippet}>
            <IconCopy />
            <span>Copy snippet</span>
          </button>
        </div>

        <hr style={{ margin: '1rem 0' }} />

        <h4 style={{ margin: '0 0 0.5rem 0' }}>2) Render entries with JS</h4>
        <textarea className="code-textarea" rows={7} readOnly value={headlessWidgetSnippet || 'Loading...'} />
        <div className="actions-row">
          <button className="secondary icon-button" onClick={() => copyText(headlessWidgetSnippet)} disabled={!headlessWidgetSnippet}>
            <IconCopy />
            <span>Copy snippet</span>
          </button>
        </div>
      </section>

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

        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Add past entry</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Manually import entries from an older guestbook. These will appear as approved public entries.
          </p>

          <form onSubmit={addImportedEntry} style={{ marginBottom: 0 }}>
            <div className="dashboard-grid">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={importName}
                  onChange={e => setImportName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label>Website (optional)</label>
                <input
                  type="url"
                  value={importWebsite}
                  onChange={e => setImportWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="datetime-local"
                  value={importDate}
                  onChange={e => setImportDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" />
            </div>

            <div className="form-group">
              <label>Message *</label>
              <textarea
                rows={4}
                value={importMessage}
                onChange={e => setImportMessage(e.target.value)}
                placeholder="Write the original message..."
                required
              />
            </div>

            <button type="submit" className="secondary">Add entry</button>
          </form>
        </section>

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
