import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';

// ... (Keep your SAFE_CONFIG and DOMPurify hook same as before) ...
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
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState(null); // ID of comment being replied to

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
        parent_id: replyingTo // Send the ID if replying
      })
    });
    
    if (res.ok) {
      setSenderName('');
      setSenderWebsite('');
      setMessage('');
      setReplyingTo(null); // Close reply form
      fetchEntries();
    } else {
      alert("Failed to send message.");
    }
  }

  // --- RENDERING HELPERS ---

  // Separate entries into "Roots" (new threads) and "Replies"
  const rootEntries = entries.filter(e => !e.parent_id);
  const getReplies = (parentId) => entries.filter(e => e.parent_id === parentId);

  // Reusable Form Component (Used for main input AND replies)
  const EntryForm = ({ isReply = false, onCancel }) => (
    <form onSubmit={handleSubmit} style={{ marginTop: '10px', marginBottom: '20px' }}>
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
        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '10px' }}
      />
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
    </form>
  );

  return (
    <div className="guestbook-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{customCss}</style>

      {/* Main Content Wrapper */}
      <div style={{ flex: 1 }}>
        
        {/* Header */}
        <div 
          className="user-custom-header"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(customHtml, SAFE_CONFIG) }} 
        />
        {!customHtml && <h1>{username}'s Guestbook</h1>}
        <hr />

        {/* Main Entry Form (Only show if not currently replying to someone to keep UI clean) */}
        {!replyingTo && (
          <div className="guestbook-form-section">
            <h3>Sign Guestbook</h3>
            <EntryForm />
          </div>
        )}

        <br />

        {/* Entries List */}
        <div className="entries-list">
          <h3>Messages ({entries.length})</h3>
          
          {rootEntries.map(entry => (
            <div key={entry.id} className="entry-thread" style={{ marginBottom: '25px' }}>
              
              {/* Parent Message */}
              <div className="entry-item" style={{ padding: '15px', background: '#fff', border: '1px solid #eee', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <strong>{entry.sender_name}</strong>
                  <small style={{ color: '#999' }}>{new Date(entry.created_at).toLocaleDateString()}</small>
                </div>
                
                {entry.sender_website && (
                  <div style={{ fontSize: '0.85em', marginBottom: '8px' }}>
                    <a href={entry.sender_website} target="_blank" rel="noopener noreferrer">Website</a>
                  </div>
                )}
                
                <p style={{ margin: '0 0 10px 0', whiteSpace: 'pre-wrap' }}>{entry.message}</p>
                
                {/* Reply Button */}
                <button 
                  onClick={() => { setReplyingTo(entry.id); setMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', padding: 0, fontSize: '0.9em' }}
                >
                  ↩ Reply
                </button>
              </div>

              {/* Reply Form (Shows directly under the message if selected) */}
              {replyingTo === entry.id && (
                <div style={{ marginLeft: '20px', marginTop: '10px', paddingLeft: '10px', borderLeft: '2px solid #ddd' }}>
                  <EntryForm isReply={true} onCancel={() => setReplyingTo(null)} />
                </div>
              )}

              {/* Child Messages (Replies) */}
              <div className="replies" style={{ marginLeft: '30px', marginTop: '10px' }}>
                {getReplies(entry.id).map(reply => (
                  <div key={reply.id} style={{ background: '#f9f9f9', padding: '10px', borderRadius: '4px', marginBottom: '8px', border: '1px solid #eee' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{reply.sender_name}</strong>
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

      {/* Footer Credit */}
      <footer style={{ marginTop: '50px', padding: '20px 0', borderTop: '1px solid #eee', textAlign: 'center', color: '#666', fontSize: '0.9em' }}>
        <p>
          Guestbook Service by <a href="https://guestbook.blackpiratex.com" target="_blank" style={{ color: '#000', textDecoration: 'none', fontWeight: 'bold' }}>BlackPirateX</a>
        </p>
      </footer>

    </div>
  );
}