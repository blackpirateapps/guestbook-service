import { db } from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

async function ensureUserColumns() {
  try { await db.execute('ALTER TABLE users ADD COLUMN embed_css_url TEXT'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN email TEXT'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN telegram_chat_id TEXT'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN telegram_notifications INTEGER DEFAULT 0'); } catch {}
}

export default async function handler(req, res) {
  const { method } = req;
  const { action } = req.query;

  // 1. SIGNUP (POST ?action=signup)
  if (method === 'POST' && action === 'signup') {
    const { username, password } = JSON.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      await db.execute({
        sql: 'INSERT INTO users (username, password) VALUES (?, ?)',
        args: [username, hashedPassword]
      });
      return res.status(201).json({ message: 'User created' });
    } catch (err) {
      return res.status(400).json({ error: 'Username likely taken' });
    }
  }

  // 2. LOGIN (POST ?action=login)
  if (method === 'POST' && action === 'login') {
    const { username, password } = JSON.parse(req.body);
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username]
    });
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ username: user.username }, SECRET);
      return res.status(200).json({ token, username: user.username });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 3. PROFILE GET (GET ?username=...)
  if (method === 'GET') {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username required' });
    try {
      await ensureUserColumns();
      const result = await db.execute({
        sql: 'SELECT custom_css, custom_html, require_approval, embed_css_url, email, telegram_chat_id, telegram_notifications FROM users WHERE username = ?',
        args: [username]
      });
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const profile = result.rows[0];
      return res.json({
        custom_css: profile.custom_css || '',
        custom_html: profile.custom_html || '',
        require_approval: profile.require_approval === 1 ? 1 : 0,
        embed_css_url: profile.embed_css_url || '',
        email: profile.email || '',
        telegram_chat_id: profile.telegram_chat_id || '',
        telegram_notifications: profile.telegram_notifications === 1 ? 1 : 0
      });
    } catch (e) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // 4. PROFILE UPDATE (PUT - Auth Required)
  if (method === 'PUT') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      await ensureUserColumns();
      const decoded = jwt.verify(token, SECRET);
      const { custom_css, custom_html, require_approval, embed_css_url, email, telegram_chat_id, telegram_notifications } = JSON.parse(req.body);

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
      
      let finalTelegramId = (telegram_chat_id || '').trim();
      let nextNotifications = telegram_notifications ? 1 : 0;
      if (!finalTelegramId) {
        nextNotifications = 0; // Auto-disable if chat id is empty
      }

      await db.execute({
        sql: 'UPDATE users SET custom_css = ?, custom_html = ?, require_approval = ?, embed_css_url = ?, email = ?, telegram_chat_id = ?, telegram_notifications = ? WHERE username = ?',
        args: [
          custom_css || '', 
          custom_html || '', 
          require_approval ? 1 : 0, 
          nextEmbedCssUrl, 
          (email || '').trim(), 
          finalTelegramId, 
          nextNotifications, 
          decoded.username
        ]
      });
      return res.json({ success: true });
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized or Update Failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
