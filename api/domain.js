import { db } from './db.js';
import jwt from 'jsonwebtoken';

const VERCEL_API_URL = 'https://api.vercel.com/v9/projects';
const PROJECT_ID = process.env.PROJECT_ID_VERCEL;
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
const TEAM_ID_PARAM = process.env.TEAM_ID_VERCEL ? `?teamId=${process.env.TEAM_ID_VERCEL}` : '';
const SECRET = process.env.JWT_SECRET || 'secret';

export default async function handler(req, res) {
  const { method } = req;

  // ---------------------------------------------------------
  // 1. GET: Resolve Domain (Used by App.jsx to find owner)
  // ---------------------------------------------------------
  if (method === 'GET') {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: 'Domain required' });

    try {
      const result = await db.execute({
        sql: 'SELECT username FROM users WHERE custom_domain = ?',
        args: [domain]
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Domain not connected' });
      }
      return res.json(result.rows[0]); // Returns { username: "sudip" }
    } catch (e) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // ---------------------------------------------------------
  // 2. POST: Add Domain (Used by Dashboard)
  // ---------------------------------------------------------
  if (method === 'POST') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, SECRET);
      const { custom_domain } = JSON.parse(req.body);

      // A. Tell Vercel to serve this domain
      const vercelRes = await fetch(`${VERCEL_API_URL}/${PROJECT_ID}/domains${TEAM_ID_PARAM}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: custom_domain }),
      });

      // If Vercel rejects it (invalid, already taken, etc.)
      if (!vercelRes.ok) {
        const errorData = await vercelRes.json();
        return res.status(400).json({ error: errorData.error?.message || 'Failed to add domain to Vercel' });
      }

      // B. Save to Database
      await db.execute({
        sql: 'UPDATE users SET custom_domain = ? WHERE username = ?',
        args: [custom_domain, decoded.username]
      });

      return res.json({ success: true });

    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}