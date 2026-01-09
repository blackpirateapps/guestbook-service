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
      body: JSON.stringify({ action: 'like', id })
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!senderName.trim() || !message.trim()) return;

    const res = await fetch('/api/entries', {
      method: 'POST',
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
  <form onSubmit={handleSubmit}>

    {/* Honeypot field (hidden via CSS) */}
    <input
      type="text"
      name="website_url_check"
      value={botField}
      onChange={e => setBotField(e.target.value)}
      className="honeypot"
      tabIndex="-1"
      autoComplete="off"
    />

    <div>
      <label htmlFor="sender-name">Name *</label>
      <input
        id="sender-name"
        type="text"
        placeholder="Your name"
        value={senderName}
        onChange={e => setSenderName(e.target.value)}
        required
      />
    </div>

    <div>
      <label htmlFor="sender-website">Website (optional)</label>
      <input
        id="sender-website"
        type="url"
        placeholder="https://example.com"
        value={senderWebsite}
        onChange={e => setSenderWebsite(e.target.value)}
      />
    </div>

    <div>
      <label htmlFor="message">
        {isReply ? 'Reply *' : 'Message *'}
      </label>
      <textarea
        id="message"
        rows={isReply ? 2 : 4}
        placeholder={isReply ? 'Write a reply…' : 'Write a message…'}
        value={message}
        onChange={e => setMessage(e.target.value)}
        required
      />
    </div>

    <div>
      <label>
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={e => setIsPrivate(e.target.checked)}
        />
        🔒 Private message (owner only)
      </label>
    </div>

    <div>
      <button type="submit">
        {isReply ? 'Post Reply' : 'Post Message'}
      </button>

      {isReply && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>

  </form>
);


  return (
    <div className="guestbook-container">
      <style>{customCss}</style>

      <div>
        <div className="user-custom-header" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(customHtml, SAFE_CONFIG) }} />
        {!customHtml && <h1>{username}'s Guestbook</h1>}
        <hr />

        {!replyingTo && (
          <div className="guestbook-form-section">
            <h3>Sign Guestbook</h3>
            <EntryForm />
          </div>
        )}

        <br />

        <div className="entries-list">
          <h3>Messages ({rootEntries.length})</h3>
          
          {rootEntries.map(entry => (
            <div key={entry.id} className="entry-thread">
              
              <div className="entry-item">
                <div>
                  <div>
                    <strong>{entry.sender_name}</strong>
                    {entry.is_owner === 1 && <span title="Verified Owner">✅</span>}
                  </div>
                  <small>{new Date(entry.created_at).toLocaleDateString()}</small>
                </div>
                
                {entry.sender_website && (
                  <div>
                    <a href={entry.sender_website} target="_blank" rel="noopener noreferrer">Website</a>
                  </div>
                )}
                
                <p>{entry.message}</p>
                
                <div>
                  <button onClick={() => handleLike(entry.id)}>
                    ❤️ {entry.likes || 0}
                  </button>
                  
                  <button 
                    onClick={() => { setReplyingTo(entry.id); setMessage(''); setIsPrivate(false); }}
                  >
                    ↩ Reply
                  </button>
                </div>
              </div>

              {replyingTo === entry.id && (
                <div>
                  <EntryForm isReply={true} onCancel={() => setReplyingTo(null)} />
                </div>
              )}

              <div className="replies">
                {getReplies(entry.id).map(reply => (
                  <div key={reply.id}>
                     <div>
                        <div>
                          <strong>{reply.sender_name}</strong>
                          {reply.is_owner === 1 && <span title="Verified Owner">✅</span>}
                        </div>
                        <small>{new Date(reply.created_at).toLocaleDateString()}</small>
                     </div>
                     <p>{reply.message}</p>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      </div>

      <footer>
        <p>
          Guestbook Service by <a href="https://guestbook.blackpiratex.com" target="_blank">BlackPirateX</a>
        </p>
      </footer>

    </div>
  );
}
