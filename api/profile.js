import { db } from './db.js';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

async function ensureEmbedCssUrlColumn() {
  try {
    await db.execute({ sql: 'ALTER TABLE users ADD COLUMN embed_css_url TEXT' });
  } catch {
    // Column likely already exists (or DB doesn't support this exact syntax); ignore.
  }
}

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
      await ensureEmbedCssUrlColumn();
      // Fetch custom design
      const result = await db.execute({
        sql: 'SELECT custom_css, custom_html, require_approval, embed_css_url FROM users WHERE username = ?',
        args: [username]
      });
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const profile = result.rows[0];
      
      return res.json({
        custom_css: profile.custom_css || '',
        custom_html: profile.custom_html || '',
        require_approval: profile.require_approval === 1 ? 1 : 0,
        embed_css_url: profile.embed_css_url || ''
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
      await ensureEmbedCssUrlColumn();
      const decoded = jwt.verify(token, SECRET);
      const { custom_css, custom_html, require_approval, embed_css_url } = JSON.parse(req.body);

      const nextEmbedCssUrl = (embed_css_url || '').trim();
      if (nextEmbedCssUrl) {
        try {
          const parsed = new URL(nextEmbedCssUrl);
          if (parsed.protocol !== 'https:') {
            return res.status(400).json({ error: 'Embed CSS URL must start with https://' });
          }
        } catch {
          return res.status(400).json({ error: 'Embed CSS URL must be a valid URL' });
        }
      }

      await db.execute({
        sql: 'UPDATE users SET custom_css = ?, custom_html = ?, require_approval = ?, embed_css_url = ? WHERE username = ?',
        args: [custom_css || '', custom_html || '', require_approval ? 1 : 0, nextEmbedCssUrl, decoded.username]
      });

      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(401).json({ error: 'Unauthorized or Update Failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
