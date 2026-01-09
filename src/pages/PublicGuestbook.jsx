import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';

// -----------------------------------------------------------------------------
// SECURITY CONFIGURATION
// -----------------------------------------------------------------------------
const SAFE_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
    'p', 'span', 'div', 'br', 'hr',
    'b', 'i', 'u', 'strong', 'em', 'small', 'big', 'blockquote', 'code', 'pre',
    'ul', 'ol', 'li',
    'img', 'a' 
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'style', 'rel'
  ],
};

DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if ('target' in node && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------
// UPDATED: Now accepts 'overrideUsername' prop for Custom Domain support
export default function PublicGuestbook({ overrideUsername }) {
  const { username: paramUsername } = useParams();
  
  // LOGIC: If App.jsx passes a username (because of a custom domain), use it.
  // Otherwise, grab it from the URL path (/u/username).
  const username = overrideUsername || paramUsername;

  const [entries, setEntries] = useState([]);
  
  // Form State
  const [senderName, setSenderName] = useState('');
  const [senderWebsite, setSenderWebsite] = useState('');
  const [message, setMessage] = useState('');
  
  // Design State
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');

  // Loading State
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (username) {
      Promise.all([fetchEntries(), fetchProfile()])
        .then(() => setIsLoading(false));
    }
  }, [username]);

  async function fetchEntries() {
    try {
      const res = await fetch(`/api/entries?user=${username}`);
      if (res.ok) setEntries(await res.json());
    } catch (err) {
      console.error("Failed to load entries", err);
    }
  }

  async function fetchProfile() {
    try {
      const res = await fetch(`/api/profile?username=${username}`);
      if (res.ok) {
        const data = await res.json();
        setCustomCss(data.custom_css || '');
        setCustomHtml(data.custom_html || '');
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!senderName.trim() || !message.trim()) return;

    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        body: JSON.stringify({
          owner_username: username,
          sender_name: senderName,
          sender_website: senderWebsite,
          message: message
        })
      });
      
      if (res.ok) {
        setSenderName('');
        setSenderWebsite('');
        setMessage('');
        fetchEntries(); 
      } else {
        alert("Failed to post message. Please try again.");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    }
  }

  if (isLoading) return <div>Loading Guestbook...</div>;
  if (!username) return <div>User not found.</div>;

  return (
    <div className="guestbook-container">
      {/* 1. Inject User's Custom CSS */}
      <style>{customCss}</style>

      {/* 2. Inject User's Custom HTML (Strictly Sanitized) */}
      <div 
        className="user-custom-header"
        dangerouslySetInnerHTML={{ 
          __html: DOMPurify.sanitize(customHtml, SAFE_CONFIG) 
        }} 
      />

      {/* Fallback header if they haven't added custom HTML */}
      {!customHtml && <h1>{username}'s Guestbook</h1>}
      
      <hr />

      {/* 3. The Guestbook Form */}
      <div className="guestbook-form-section">
        <h3>Sign the Guestbook</h3>
        <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Name *</label>
            <input 
              type="text" 
              value={senderName} 
              onChange={e => setSenderName(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Website (Optional)</label>
            <input 
              type="url" 
              placeholder="https://..."
              value={senderWebsite} 
              onChange={e => setSenderWebsite(e.target.value)} 
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Message *</label>
            <textarea 
              rows="4" 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          
          <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>
            Send Message
          </button>
        </form>
      </div>

      <br /><hr /><br />
      
      {/* 4. The Entries List */}
      <div className="entries-list">
        <h3>Messages ({entries.length})</h3>
        
        {entries.length === 0 && <p>Be the first to sign!</p>}

        {entries.map(entry => (
          <div key={entry.id} className="entry-item" style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
            <div className="entry-header">
              <strong>{entry.sender_name}</strong>
              
              {entry.sender_website && (
                <span style={{ marginLeft: '10px', fontSize: '0.9em' }}>
                   • <a href={entry.sender_website} target="_blank" rel="noopener noreferrer">
                    Website
                  </a>
                </span>
              )}
              
              <span style={{ float: 'right', color: '#888', fontSize: '0.8em' }}>
                {new Date(entry.created_at).toLocaleDateString()}
              </span>
            </div>
            
            <p style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>{entry.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}