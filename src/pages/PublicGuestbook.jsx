import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';

export default function PublicGuestbook() {
  const { username } = useParams();
  const [entries, setEntries] = useState([]);
  
  // Form State
  const [senderName, setSenderName] = useState('');
  const [senderWebsite, setSenderWebsite] = useState('');
  const [message, setMessage] = useState('');
  
  // Design State
  const [customCss, setCustomCss] = useState('');
  const [customHtml, setCustomHtml] = useState('');

  useEffect(() => {
    fetchEntries();
    fetchProfile();
  }, [username]);

  async function fetchEntries() {
    const res = await fetch(`/api/entries?user=${username}`);
    if (res.ok) setEntries(await res.json());
  }

  async function fetchProfile() {
    const res = await fetch(`/api/profile?username=${username}`);
    if (res.ok) {
      const data = await res.json();
      setCustomCss(data.custom_css || '');
      setCustomHtml(data.custom_html || '');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
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
      fetchEntries(); // Reload list
    } else {
      alert("Failed to post message");
    }
  }

  return (
    <div className="guestbook-container">
      {/* 1. Inject User's Custom CSS */}
      <style>{customCss}</style>

      {/* 2. Inject User's Custom HTML (Sanitized) */}
      <div 
        className="user-custom-header"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(customHtml) }} 
      />

      {/* Fallback header if they haven't added custom HTML */}
      {!customHtml && <h1>{username}'s Guestbook</h1>}
      
      <hr />

      {/* 3. The Guestbook Form */}
      <div className="guestbook-form">
        <h3>Sign the Guestbook</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Name:</label><br />
            <input 
              type="text" 
              value={senderName} 
              onChange={e => setSenderName(e.target.value)} 
              required 
            />
          </div>
          <br />
          <div>
            <label>Website (Optional):</label><br />
            <input 
              type="url" 
              value={senderWebsite} 
              onChange={e => setSenderWebsite(e.target.value)} 
            />
          </div>
          <br />
          <div>
            <label>Message:</label><br />
            <textarea 
              rows="4" 
              cols="50"
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              required 
            />
          </div>
          <br />
          <button type="submit">Send Message</button>
        </form>
      </div>

      <hr />
      
      {/* 4. The Entries List */}
      <div className="entries-list">
        {entries.map(entry => (
          <div key={entry.id} className="entry">
            <strong>{entry.sender_name}</strong>
            
            {entry.sender_website && (
              <span> • <a href={entry.sender_website} target="_blank" rel="noopener noreferrer">
                {entry.sender_website}
              </a></span>
            )}
            
            <p>{entry.message}</p>
            <small style={{ color: '#666' }}>
              {new Date(entry.created_at).toLocaleString()}
            </small>
            <hr />
          </div>
        ))}
      </div>
    </div>
  );
}