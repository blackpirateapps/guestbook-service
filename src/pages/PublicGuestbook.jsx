import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function PublicGuestbook() {
  const { username } = useParams();
  const [entries, setEntries] = useState([]);
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEntries();
  }, [username]);

  async function fetchEntries() {
    // Note: We pass the username in the query string for public access
    const res = await fetch(`/api/entries?user=${username}`);
    if (res.ok) setEntries(await res.json());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await fetch('/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        owner_username: username,
        sender_name: senderName,
        message: message
      })
    });
    setSenderName('');
    setMessage('');
    fetchEntries();
  }

  return (
    <div>
      <h1>{username}'s Guestbook</h1>
      
      <h3>Leave a message</h3>
      <form onSubmit={handleSubmit}>
        <input 
          placeholder="Your Name" 
          value={senderName} 
          onChange={e => setSenderName(e.target.value)} 
          required 
        />
        <br />
        <textarea 
          placeholder="Message" 
          value={message} 
          onChange={e => setMessage(e.target.value)} 
          required 
        />
        <br />
        <button type="submit">Send</button>
      </form>

      <hr />
      
      <h3>Messages</h3>
      {entries.map(entry => (
        <div key={entry.id}>
          <strong>{entry.sender_name}</strong>: {entry.message}
          <br /><br />
        </div>
      ))}
    </div>
  );
}