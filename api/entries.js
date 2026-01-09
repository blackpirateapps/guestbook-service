import { db } from './db.js';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

export default async function handler(req, res) {
  const { method } = req;
  const { user } = req.query; // Used for public fetching (e.g., ?user=sudip)

  // --------------------------------------------
  // 1. GET: Fetch entries
  // --------------------------------------------
  if (method === 'GET') {
    if (user) {
      // PUBLIC: Fetch entries for a specific user's guestbook
      try {
        const result = await db.execute({
          sql: 'SELECT id, sender_name, message, sender_website, created_at FROM entries WHERE owner_username = ? ORDER BY created_at DESC',
          args: [user]
        });
        return res.json(result.rows);
      } catch (e) {
        return res.status(500).json({ error: 'Database error' });
      }
    } else {
      // DASHBOARD: Fetch entries for the logged-in user (Requires Auth)
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'No token provided' });

      try {
        const decoded = jwt.verify(token, SECRET);
        const result = await db.execute({
          sql: 'SELECT * FROM entries WHERE owner_username = ? ORDER BY created_at DESC',
          args: [decoded.username]
        });
        return res.json(result.rows);
      } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
  }

  // --------------------------------------------
  // 2. POST: Create new entry (Public)
  // --------------------------------------------
  if (method === 'POST') {
    try {
      const { owner_username, sender_name, message, sender_website } = JSON.parse(req.body);

      // Simple validation
      if (!owner_username || !sender_name || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await db.execute({
        sql: 'INSERT INTO entries (owner_username, sender_name, message, sender_website) VALUES (?, ?, ?, ?)',
        args: [owner_username, sender_name, message, sender_website || ''] // Handle empty website
      });
      return res.status(201).json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to post entry' });
    }
  }

  // --------------------------------------------
  // 3. DELETE: Delete entry (Dashboard Only)
  // --------------------------------------------
  if (method === 'DELETE') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
      const decoded = jwt.verify(token, SECRET);
      const { id } = JSON.parse(req.body);
      
      // Ensure user can only delete their OWN entries
      const result = await db.execute({
        sql: 'DELETE FROM entries WHERE id = ? AND owner_username = ?',
        args: [id, decoded.username]
      });

      if (result.rowsAffected === 0) {
        return res.status(404).json({ error: 'Entry not found or unauthorized' });
      }

      return res.json({ success: true });
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}