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
  
  // Form State
  const [senderName, setSenderName] = useState('');
  const [senderWebsite, setSenderWebsite] = useState('');
  const [message, setMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false); // Feature 2: Private Msg
  const [botField, setBotField] = useState(''); // Feature 5: Honeypot

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

  // Feature 6: Likes
  async function handleLike(id) {
    // Optimistic UI update
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
        is_private: isPrivate, // Feature 2
        bot_field: botField // Feature 5
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      setSenderName('');
      setSenderWebsite('');
      setMessage('');
      setIsPrivate(false);
      setReplyingTo(null);
      
      // Feature 4: Feedback for pending messages
      if (data.status === 'pending') {
        alert("Message sent! It is waiting for moderator approval.");
      } else if (isPrivate) {
        alert("Private message sent to the owner!");
      } else {
        fetchEntries(); // Refresh list if public and approved
      }
    } else {
      alert("Failed to send message.");
    }
  }

  // Helpers
  const rootEntries = entries.filter(e => !e.parent_id);
  const getReplies = (parentId) => entries.filter(e => e.parent_id === parentId);

  // Reusable Form Component
  const EntryForm = ({ isReply = false, onCancel }) => (
    <form onSubmit={handleSubmit} style={{ marginTop: '10px', marginBottom: '20px' }}>
      
      {/* Feature 5: HONEYPOT (Hidden from humans) */}
      <input 
        type="text" 
        name="website_url_check" 
        value={botField} 
        onChange={e => setBotField(e.target.value)}
        style={{ display: 'none' }} 
        tabIndex="-1"
        autoComplete="off"
      />

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <input 
          placeholder="Name *" 
          value={senderName} 
          onChange={e => setSenderName(e.target.value)} 
          required 
          style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} 
        />
        <input 
          type="url" 
          placeholder="Website (opt)" 
          value={senderWebsite} 
          onChange={e => setSenderWebsite(e.target.value)} 
          style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} 
        />
      </div>
      
      <textarea 
        rows={isReply ? 2 : 4} 
        placeholder={isReply ? "Write a reply..." : "Write a message..."} 
        value={message} 
        onChange={e => setMessage(e.target.value)} 
        required 
        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} 
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        
        {/* Feature 2: Private Message Toggle */}
        <label style={{ fontSize: '0.9em', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <input 
            type="checkbox" 
            checked={isPrivate} 
            onChange={e => setIsPrivate(e.target.checked)} 
            style={{ marginRight: '5px' }}
          />
          🔒 Private Message (Owner only)
        </label>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer', background: '#000', color: '#fff', border: 'none', borderRadius: '4px' }}>
            {isReply ? 'Post Reply' : 'Post Message'}
          </button>
          {isReply && (
            <button type="button" onClick={onCancel} style={{ padding: '8px 16px', cursor: 'pointer', background: '#eee', border: 'none', borderRadius: '4px' }}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );

  return (
    <div className="guestbook-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{customCss}</style>

      <div style={{ flex: 1 }}>
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
            <div key={entry.id} className="entry-thread" style={{ marginBottom: '25px' }}>
              
              <div className="entry-item" style={{ padding: '15px', background: '#fff', border: '1px solid #eee', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <strong>{entry.sender_name}</strong>
                    {/* Feature 1: Verified Badge */}
                    {entry.is_owner === 1 && <span title="Verified Owner" style={{ fontSize: '1em' }}>✅</span>}
                  </div>
                  <small style={{ color: '#999' }}>{new Date(entry.created_at).toLocaleDateString()}</small>
                </div>
                
                {entry.sender_website && (
                  <div style={{ fontSize: '0.85em', marginBottom: '8px' }}>
                    <a href={entry.sender_website} target="_blank" rel="noopener noreferrer">Website</a>
                  </div>
                )}
                
                <p style={{ margin: '0 0 10px 0', whiteSpace: 'pre-wrap' }}>{entry.message}</p>
                
                <div style={{ display: 'flex', gap: '15px', fontSize: '0.9em' }}>
                  {/* Feature 6: Like Button */}
                  <button 
                    onClick={() => handleLike(entry.id)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e0245e', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                  >
                    ❤️ {entry.likes || 0}
                  </button>
                  
                  <button 
                    onClick={() => { setReplyingTo(entry.id); setMessage(''); setIsPrivate(false); }}
                    style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', padding: 0 }}
                  >
                    ↩ Reply
                  </button>
                </div>
              </div>

              {/* Reply Form */}
              {replyingTo === entry.id && (
                <div style={{ marginLeft: '20px', marginTop: '10px', paddingLeft: '10px', borderLeft: '2px solid #ddd' }}>
                  <EntryForm isReply={true} onCancel={() => setReplyingTo(null)} />
                </div>
              )}

              {/* Replies List */}
              <div className="replies" style={{ marginLeft: '30px', marginTop: '10px' }}>
                {getReplies(entry.id).map(reply => (
                  <div key={reply.id} style={{ background: '#f9f9f9', padding: '10px', borderRadius: '4px', marginBottom: '8px', border: reply.is_owner ? '1px solid #cce5ff' : '1px solid #eee' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <strong>{reply.sender_name}</strong>
                          {/* Feature 1: Verified Badge for Replies */}
                          {reply.is_owner === 1 && <span title="Verified Owner" style={{ fontSize: '1em' }}>✅</span>}
                        </div>
                        <small style={{ color: '#999' }}>{new Date(reply.created_at).toLocaleDateString()}</small>
                     </div>
                     <p style={{ margin: '5px 0 0 0', fontSize: '0.95em' }}>{reply.message}</p>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      </div>

      <footer style={{ marginTop: '50px', padding: '20px 0', borderTop: '1px solid #eee', textAlign: 'center', color: '#666', fontSize: '0.9em' }}>
        <p>
          Guestbook Service by <a href="https://guestbook.blackpiratex.com" target="_blank" style={{ color: '#000', textDecoration: 'none', fontWeight: 'bold' }}>BlackPirateX</a>
        </p>
      </footer>

    </div>
  );
}