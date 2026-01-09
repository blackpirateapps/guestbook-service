import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';

const SAFE_CONFIG = {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'span', 'div', 'br', 'hr', 'b', 'i', 'strong', 'em', 'ul', 'li', 'img', 'a'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'target', 'rel'],
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
  const [isPrivate, setIsPrivate] = useState(false);
  const [botField, setBotField] = useState(''); // Honeypot

  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => { if (username) Promise.all([fetchEntries(), fetchProfile()]); }, [username]);

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

  async function handleLike(id) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, likes: e.likes + 1 } : e));
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
        alert("Message sent! It is waiting for approval.");
      } else if (isPrivate) {
        alert("Private message sent!");
      } else {
        fetchEntries();
      }
    } else {
      alert("Failed to send message.");
    }
  }

  const rootEntries = entries.filter(e => !e.parent_id);
  const getReplies = (parentId) => entries.filter(e => e.parent_id === parentId);

  // Reusable Form
  const EntryForm = ({ isReply = false, onCancel }) => (
    <form onSubmit={handleSubmit}>
      
      {/* HONEYPOT (Using hidden attribute) */}
      <input 
        type="text" 
        name="website_url_check" 
        value={botField} 
        onChange={e => setBotField(e.target.value)}
        hidden 
        autoComplete="off"
      />

      <div>
        <input placeholder="Name *" value={senderName} onChange={e => setSenderName(e.target.value)} required />
        <input type="url" placeholder="Website (opt)" value={senderWebsite} onChange={e => setSenderWebsite(e.target.value)} />
      </div>
      
      <div>
        <textarea rows={isReply ? 2 : 4} placeholder={isReply ? "Write a reply..." : "Write a message..."} value={message} onChange={e => setMessage(e.target.value)} required />
      </div>
      
      <div>
        <label>
          <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
          Private Message
        </label>
      </div>

      <div>
        <button type="submit">{isReply ? 'Reply' : 'Post'}</button>
        {isReply && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );

  return (
    <div>
      <style>{customCss}</style>
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(customHtml, SAFE_CONFIG) }} />
      {!customHtml && <h1>{username}'s Guestbook</h1>}
      <hr />

      {!replyingTo && (
        <div>
          <h3>Sign Guestbook</h3>
          <EntryForm />
        </div>
      )}

      <div>
        {rootEntries.map(entry => (
          <div key={entry.id}>
            <hr />
            <div>
              <div>
                <strong>{entry.sender_name}</strong>
                {entry.is_owner === 1 && <span> [VERIFIED]</span>}
                <small> - {new Date(entry.created_at).toLocaleDateString()}</small>
              </div>
              
              <p>{entry.message}</p>
              
              <div>
                <button onClick={() => handleLike(entry.id)}>
                  ❤️ {entry.likes}
                </button>
                <button onClick={() => setReplyingTo(entry.id)}>
                  Reply
                </button>
              </div>
            </div>

            {/* Render Replies */}
            {replyingTo === entry.id && (
              <div>
                <EntryForm isReply={true} onCancel={() => setReplyingTo(null)} />
              </div>
            )}

            <div className="replies">
              {getReplies(entry.id).map(reply => (
                <div key={reply.id}>
                   <blockquote>
                      <strong>{reply.sender_name}</strong>
                      {reply.is_owner === 1 && <span> [VERIFIED]</span>}
                      : {reply.message}
                   </blockquote>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <hr />
      <footer>
        <p>Guestbook Service by <a href="https://guestbook.blackpiratex.com" target="_blank">BlackPirateX</a></p>
      </footer>
    </div>
  );
}