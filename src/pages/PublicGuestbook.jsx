import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';

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

  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');

  const [senderName, setSenderName] = useState('');
  const [senderWebsite, setSenderWebsite] = useState('');
  const [message, setMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [botField, setBotField] = useState('');

  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    if (username) {
      Promise.all([fetchEntries(), fetchProfile()]);
    }
  }, [username]);

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
    setEntries(prev => prev.map(e => e.id === id ? { ...e, likes: (e.likes || 0) + 1 } : e));

    await fetch('/api/entries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like', id })
    });
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
        alert("Message sent! It is waiting for moderator approval.");
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
      <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: isReply ? '1.1rem' : '1.3rem' }}>
        {isReply ? 'Reply to message' : 'Sign the Guestbook'}
      </h3>
      {/* Honeypot field (hidden) */}
      <input
        type="text"
        name="website_url_check"
        value={botField}
        onChange={e => setBotField(e.target.value)}
        className="honeypot"
        tabIndex="-1"
        autoComplete="off"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
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
          rows={isReply ? 3 : 5}
          placeholder={isReply ? 'Write a friendly reply...' : 'Leave a note, share a thought, or just say hi...'}
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
        />
      </div>

      {!isReply && (
        <label className="checkbox-label" style={{ marginTop: '8px' }}>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
          />
          🔒 Private message (Only the owner can see this)
        </label>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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

  return (
    <div style={{ maxWidth: overrideUsername ? '800px' : '100%', margin: overrideUsername ? '40px auto' : '0' }}>
      <style>{customCss}</style>

      {/* Hero Section */}
      <div className="card text-center" style={{ marginBottom: '40px', padding: '40px 24px' }}>
        <div className="user-custom-header" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(customHtml, SAFE_CONFIG) }} />
        {!customHtml && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 'bold',
              margin: '0 auto 20px auto',
              boxShadow: '0 10px 20px rgba(139, 92, 246, 0.4)'
            }}>
              {username.charAt(0).toUpperCase()}
            </div>
            <h1>{username}'s Guestbook</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
              Welcome to my digital space. I'd love to hear from you. Drop a message below to let me know you were here!
            </p>
          </>
        )}
      </div>

      {!replyingTo && (
        <div style={{ marginBottom: '40px' }}>
          <EntryForm />
        </div>
      )}

      <div className="entries-list">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          Guestbook Entries
          <span style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            {rootEntries.length}
          </span>
        </h3>

        {rootEntries.length === 0 ? (
          <div className="card text-center" style={{ padding: '40px 20px', borderStyle: 'dashed' }}>
            <p style={{ color: 'var(--text-muted)' }}>Be the first to sign this guestbook!</p>
          </div>
        ) : (
          rootEntries.map(entry => (
            <div key={entry.id} className="entry-thread">
              <div className="entry-item card" style={{ background: 'var(--bg-card)' }}>
                <div className="entry-header">
                  <div className="entry-meta-top">
                    <div className="entry-name">
                      {entry.sender_name}
                      {entry.is_owner === 1 && <span title="Verified Owner" style={{ fontSize: '1rem' }}>👑</span>}
                      {entry.sender_website && (
                        <a href={entry.sender_website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          🔗 Website
                        </a>
                      )}
                    </div>
                    <div className="entry-date">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <p className="entry-content">{entry.message}</p>

                <div className="entry-actions">
                  <button className="secondary" onClick={() => handleLike(entry.id)}>
                    ❤️ {entry.likes || 0}
                  </button>

                  <button className="secondary" onClick={() => { setReplyingTo(entry.id); setMessage(''); setIsPrivate(false); }}>
                    ↩ Reply
                  </button>
                </div>
              </div>

              {replyingTo === entry.id && (
                <div style={{ marginLeft: '24px' }}>
                  <EntryForm isReply={true} onCancel={() => setReplyingTo(null)} />
                </div>
              )}

              {getReplies(entry.id).length > 0 && (
                <div className="replies">
                  {getReplies(entry.id).map(reply => (
                    <div key={reply.id} className="reply-item">
                      <div className="entry-header" style={{ marginBottom: '8px' }}>
                        <div className="entry-meta-top">
                          <div className="entry-name" style={{ fontSize: '1rem' }}>
                            {reply.sender_name}
                            {reply.is_owner === 1 && <span title="Verified Owner" style={{ fontSize: '0.9rem' }}>👑</span>}
                          </div>
                          <div className="entry-date" style={{ fontSize: '0.75rem' }}>
                            {new Date(reply.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <p className="entry-content" style={{ fontSize: '0.95rem', marginBottom: '0' }}>{reply.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <footer style={{ marginTop: '80px', marginBottom: '40px' }}>
        <p>
          Powered by <a href="https://guestbook.blackpiratex.com" target="_blank" rel="noreferrer">Guestbook Service</a>
        </p>
      </footer>
    </div>
  );
}
