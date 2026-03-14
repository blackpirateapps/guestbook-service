import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { IconExternalLink, IconHeart, IconReply } from '../components/Icons';

const SAFE_CONFIG = {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'span', 'div', 'br', 'hr', 'b', 'i', 'strong', 'em', 'ul', 'li', 'img', 'a'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'target', 'style', 'rel'],
};

DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if ('target' in node && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export default function PublicGuestbook({ overrideUsername }) {
  const { username: paramUsername } = useParams();
  const username = overrideUsername || paramUsername;
  const isEmbed = useMemo(() => new URLSearchParams(window.location.search).get('embed') === '1', []);
  const rootRef = useRef(null);

  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');

  const [senderName, setSenderName] = useState('');
  const [senderWebsite, setSenderWebsite] = useState('');
  const [message, setMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [botField, setBotField] = useState('');

  const [replyingTo, setReplyingTo] = useState(null);
  const [likingIds, setLikingIds] = useState(() => new Set());

  useEffect(() => {
    if (username) {
      Promise.all([fetchEntries(), fetchProfile()]);
    }
  }, [username]);

  useEffect(() => {
    if (!isEmbed) return;
    const root = rootRef.current;
    if (!root) return;

    let rafId = 0;
    const sendHeight = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const height = Math.max(root.scrollHeight, root.offsetHeight);
        window.parent?.postMessage({ type: 'guestbook:resize', height }, '*');
      });
    };

    sendHeight();

    let resizeObserver;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => sendHeight());
      resizeObserver.observe(root);
    }

    window.addEventListener('load', sendHeight);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('load', sendHeight);
    };
  }, [isEmbed]);

  async function fetchEntries() {
    try {
      const res = await fetch(`/api/entries?user=${username}`);
      if (res.ok) setEntries(await res.json());
    } catch (e) { console.error(e); }
  }

  async function fetchProfile() {
    try {
      const res = await fetch(`/api/profile?username=${username}`);
      if (res.ok) {
        const data = await res.json();
        setCustomCss(data.custom_css || '');
        setCustomHtml(data.custom_html || '');
      }
    } catch (e) { console.error(e); }
  }

  async function handleLike(id) {
    setLikingIds(prev => new Set(prev).add(id));
    setEntries(prev => prev.map(e => e.id === id ? { ...e, likes: (e.likes || 0) + 1 } : e));

    try {
      await fetch('/api/entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', id })
      });
    } finally {
      setLikingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!senderName.trim() || !message.trim()) return;

    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_username: username,
        sender_name: senderName,
        sender_website: senderWebsite,
        message: message,
        parent_id: replyingTo,
        is_private: isPrivate,
        bot_field: botField
      })
    });

    if (res.ok) {
      const data = await res.json();
      setSenderName('');
      setSenderWebsite('');
      setMessage('');
      setIsPrivate(false);
      setReplyingTo(null);

      if (data.status === 'pending') {
        alert("Message sent! waiting for moderator approval.");
      } else if (isPrivate) {
        alert("Private message sent to the owner!");
      } else {
        fetchEntries();
      }
    } else {
      alert("Failed to send message.");
    }
  }

  const rootEntries = entries.filter(e => !e.parent_id);
  const getReplies = (parentId) => entries.filter(e => e.parent_id === parentId);

  const EntryForm = ({ isReply = false, onCancel }) => (
    <form onSubmit={handleSubmit} className="entry-form-wrapper">
      <h3 style={{ marginTop: 0 }}>
        {isReply ? 'Reply to message' : 'Sign the Guestbook'}
      </h3>
      <input
        type="text"
        name="website_url_check"
        value={botField}
        onChange={e => setBotField(e.target.value)}
        className="honeypot"
        tabIndex="-1"
        autoComplete="off"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
        <div className="form-group">
          <label htmlFor={`sender-name-${isReply ? 'reply' : 'main'}`}>Name *</label>
          <input
            id={`sender-name-${isReply ? 'reply' : 'main'}`}
            type="text"
            placeholder="Your name"
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor={`sender-website-${isReply ? 'reply' : 'main'}`}>Website (Optional)</label>
          <input
            id={`sender-website-${isReply ? 'reply' : 'main'}`}
            type="url"
            placeholder="https://example.com"
            value={senderWebsite}
            onChange={e => setSenderWebsite(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor={`message-${isReply ? 'reply' : 'main'}`}>
          {isReply ? 'Reply Message *' : 'Your Message *'}
        </label>
        <textarea
          id={`message-${isReply ? 'reply' : 'main'}`}
          rows={isReply ? 3 : 4}
          placeholder={isReply ? 'Write a reply...' : 'Leave a note...'}
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
        />
      </div>

      {!isReply && (
        <label className="checkbox-label" style={{ marginTop: '0.25rem' }}>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
          />
          Private message (Owner only)
        </label>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button type="submit">
          {isReply ? 'Post Reply' : 'Publish Note'}
        </button>

        {isReply && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );

  const embedBaseCss = isEmbed
    ? `
      :root { color-scheme: light dark; }
      html, body { background: var(--bg-color); color: var(--text-main); }
      footer { display: none; }
    `.trim()
    : '';

  return (
    <div
      ref={rootRef}
      style={{
        maxWidth: isEmbed ? '100%' : (overrideUsername ? '800px' : '100%'),
        margin: isEmbed ? 0 : '0 auto',
        padding: isEmbed ? '1rem' : 0,
      }}
    >
      <style>{`${embedBaseCss}\n${customCss}`}</style>

      <header style={{ marginBottom: '2rem' }}>
        <div className="user-custom-header" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(customHtml, SAFE_CONFIG) }} />
        {!customHtml && (
          <>
            <h1 style={{ marginBottom: 0 }}>{username}'s Guestbook</h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Leave a note below to say hi.
            </p>
          </>
        )}
      </header>

      {!replyingTo && (
        <section style={{ marginBottom: '2rem' }}>
          <EntryForm />
        </section>
      )}

      <hr />

      <section className="entries-list public-entries">
        <div className="entries-header">
          <h3 style={{ margin: 0 }}>Guestbook Entries</h3>
          <div className="entries-count">{rootEntries.length}</div>
        </div>

        {rootEntries.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Be the first to sign this guestbook!</p>
        ) : (
          rootEntries.map(entry => (
            <article key={entry.id} className="entry-thread">
              <div className="entry-card">
                <header className="entry-card-header">
                  <div className="entry-title-row">
                    <div className="entry-name">
                      {entry.sender_name}
                      {entry.is_owner === 1 && <span className="badge owner">Owner</span>}
                    </div>

                    {entry.sender_website && (
                      <a
                        className="entry-website"
                        href={entry.sender_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open sender website"
                        title="Open sender website"
                      >
                        <IconExternalLink />
                      </a>
                    )}
                  </div>

                  <div className="entry-date">
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </header>

                <div className="entry-content">{entry.message}</div>

                <div className="entry-actions">
                  <button
                    className="secondary icon-button"
                    onClick={() => handleLike(entry.id)}
                    disabled={likingIds.has(entry.id)}
                    aria-label="Like entry"
                  >
                    <IconHeart />
                    <span>{entry.likes || 0}</span>
                  </button>

                  <button
                    className="secondary icon-button"
                    onClick={() => { setReplyingTo(entry.id); setMessage(''); setIsPrivate(false); }}
                    aria-label="Reply to entry"
                  >
                    <IconReply />
                    <span>Reply</span>
                  </button>
                </div>
              </div>

              {replyingTo === entry.id && (
                <div className="reply-form-wrapper">
                  <EntryForm isReply={true} onCancel={() => setReplyingTo(null)} />
                </div>
              )}

              {getReplies(entry.id).length > 0 && (
                <div className="replies">
                  {getReplies(entry.id).map(reply => (
                    <div key={reply.id} className="reply-card">
                      <div className="reply-header">
                        <div className="reply-name">
                          {reply.sender_name}
                          {reply.is_owner === 1 && <span className="badge owner">Owner</span>}
                        </div>
                        <div className="reply-date">
                          {new Date(reply.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="reply-content">{reply.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </section>

      <footer>
        Powered by <a href="https://guestbook.blackpiratex.com" target="_blank" rel="noreferrer">Guestbook Service</a>
      </footer>
    </div>
  );
}
