import { db } from './db.js';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

export default async function handler(req, res) {
  const { method } = req;

  // ---------------------------------------------------------
  // 1. GET: Fetch Profile (CSS, HTML, moderation)
  // ---------------------------------------------------------
  if (method === 'GET') {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    try {
      // Fetch custom design
      const result = await db.execute({
        sql: 'SELECT custom_css, custom_html, require_approval FROM users WHERE username = ?',
        args: [username]
      });
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const profile = result.rows[0];
      
      return res.json({
        custom_css: profile.custom_css || '',
        custom_html: profile.custom_html || '',
        require_approval: profile.require_approval === 1 ? 1 : 0
      });

    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // ---------------------------------------------------------
  // 2. PUT: Update Design Settings (Auth Required)
  // ---------------------------------------------------------
  if (method === 'PUT') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, SECRET);
      const { custom_css, custom_html, require_approval } = JSON.parse(req.body);

      await db.execute({
        sql: 'UPDATE users SET custom_css = ?, custom_html = ?, require_approval = ? WHERE username = ?',
        args: [custom_css || '', custom_html || '', require_approval ? 1 : 0, decoded.username]
      });

      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(401).json({ error: 'Unauthorized or Update Failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
