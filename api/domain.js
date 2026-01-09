import { db } from './db.js';
import jwt from 'jsonwebtoken';

// Vercel API Configuration
const VERCEL_API_URL = 'https://api.vercel.com/v9/projects';
const PROJECT_ID = process.env.PROJECT_ID_VERCEL;
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
// Only add ?teamId if the env var exists
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
      // Return the username so the frontend knows who this domain belongs to
      return res.json(result.rows[0]); 
    } catch (e) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // ---------------------------------------------------------
  // 2. POST: Add/Connect Domain (Auth Required)
  // ---------------------------------------------------------
  if (method === 'POST') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, SECRET);
      const { custom_domain } = JSON.parse(req.body);

      if (!custom_domain) return res.status(400).json({ error: 'Domain is required' });

      // Step A: Call Vercel API to attach the domain to your project
      const vercelRes = await fetch(`${VERCEL_API_URL}/${PROJECT_ID}/domains${TEAM_ID_PARAM}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: custom_domain }),
      });

      // Handle Vercel Errors (e.g., Domain already taken, Invalid domain)
      if (!vercelRes.ok) {
        const errorData = await vercelRes.json();
        return res.status(400).json({ error: errorData.error?.message || 'Failed to add domain to Vercel' });
      }

      // Step B: Update Database to link domain to user
      await db.execute({
        sql: 'UPDATE users SET custom_domain = ? WHERE username = ?',
        args: [custom_domain, decoded.username]
      });

      return res.json({ success: true });

    } catch (e) {
      console.error(e);
      // Check for Unique Constraint error (if another user already claimed it)
      if (e.message && e.message.includes('UNIQUE constraint failed')) {
         return res.status(409).json({ error: 'This domain is already connected to another user.' });
      }
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // ---------------------------------------------------------
  // 3. DELETE: Remove/Disconnect Domain (Auth Required)
  // ---------------------------------------------------------
  if (method === 'DELETE') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, SECRET);

      // Step A: Get the current domain from DB to know what to delete
      const result = await db.execute({
        sql: 'SELECT custom_domain FROM users WHERE username = ?',
        args: [decoded.username]
      });

      const currentDomain = result.rows[0]?.custom_domain;
      if (!currentDomain) return res.status(404).json({ error: 'No domain connected to this account' });

      // Step B: Remove from Vercel
      const vercelRes = await fetch(`${VERCEL_API_URL}/${PROJECT_ID}/domains/${currentDomain}${TEAM_ID_PARAM}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
      });

      if (!vercelRes.ok) {
        console.warn("Vercel API Warning: Could not delete domain from Vercel. It might already be gone.");
      }

      // Step C: Clear from Database
      await db.execute({
        sql: 'UPDATE users SET custom_domain = NULL WHERE username = ?',
        args: [decoded.username]
      });

      return res.json({ success: true });

    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server Error during deletion' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}