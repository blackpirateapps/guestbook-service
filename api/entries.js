import { db } from './db.js';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

export default async function handler(req, res) {
  const { method } = req;
  const { user } = req.query; // For public fetching

  // 1. GET: Fetch entries (Either for a specific public user OR for the logged in dashboard)
  if (method === 'GET') {
    if (user) {
      // Public fetch
      const result = await db.execute({
        sql: 'SELECT * FROM entries WHERE owner_username = ? ORDER BY created_at DESC',
        args: [user]
      });
      return res.json(result.rows);
    } else {
      // Dashboard fetch (needs auth)
      const token = req.headers.authorization?.split(' ')[1];
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

  // 2. POST: Create new entry (Public action)
  if (method === 'POST') {
    const { owner_username, sender_name, message } = JSON.parse(req.body);
    await db.execute({
      sql: 'INSERT INTO entries (owner_username, sender_name, message) VALUES (?, ?, ?)',
      args: [owner_username, sender_name, message]
    });
    return res.status(201).json({ success: true });
  }

  // 3. DELETE: Delete entry (Dashboard only)
  if (method === 'DELETE') {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SECRET);
      const { id } = JSON.parse(req.body);
      
      // We must ensure the user owns the entry they are deleting
      await db.execute({
        sql: 'DELETE FROM entries WHERE id = ? AND owner_username = ?',
        args: [id, decoded.username]
      });
      return res.json({ success: true });
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
}