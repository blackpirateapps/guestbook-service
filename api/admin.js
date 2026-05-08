import { db } from './db.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'secret';
const ADMIN_USERNAME = 'sudip';
const RESET_TOKEN_TTL_MINUTES = 30;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function getJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

async function ensureUserColumns() {
  try { await db.execute('ALTER TABLE users ADD COLUMN email TEXT'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN telegram_chat_id TEXT'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN telegram_notifications INTEGER DEFAULT 0'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN password_reset_token_hash TEXT'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN password_reset_expires TEXT'); } catch {}
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function getRequestOrigin(req, bodyOrigin = '') {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const candidate = String(bodyOrigin || '').trim();

  if (candidate) {
    try {
      const parsed = new URL(candidate);
      const isAllowedProtocol = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      if (isAllowedProtocol && (!host || parsed.host === host)) {
        return parsed.origin;
      }
    } catch {}
  }

  if (host) return `${proto}://${host}`;
  return 'https://blackpiratex.com';
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return '';
  return token;
}

function verifyAdmin(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded.username !== ADMIN_USERNAME) {
      res.status(403).json({ error: 'Admin access required' });
      return null;
    }
    return decoded;
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
}

function serializeUser(row) {
  const expiresAt = row.password_reset_expires || '';
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;

  return {
    username: row.username || '',
    email: row.email || '',
    telegram_chat_id: row.telegram_chat_id || '',
    telegram_notifications: Number(row.telegram_notifications) === 1 ? 1 : 0,
    password_reset_expires: expiresAt,
    has_active_reset: Boolean(expiresMs && expiresMs > Date.now())
  };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const admin = verifyAdmin(req, res);
  if (!admin) return;

  try {
    await ensureUserColumns();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Could not prepare admin tables' });
  }

  if (req.method === 'GET') {
    try {
      const result = await db.execute({
        sql: `SELECT username, email, telegram_chat_id, telegram_notifications, password_reset_expires
              FROM users
              ORDER BY lower(username) ASC`
      });
      return res.json({
        users: result.rows.map(serializeUser),
        admin_username: admin.username
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Could not load users' });
    }
  }

  if (req.method === 'POST') {
    const { action } = req.query;
    if (action !== 'generate_password_reset') {
      return res.status(400).json({ error: 'Unsupported admin action' });
    }

    const { username, origin } = getJsonBody(req);
    const targetUsername = String(username || '').trim();
    if (!targetUsername) return res.status(400).json({ error: 'Username is required' });

    try {
      const existing = await db.execute({
        sql: 'SELECT username FROM users WHERE username = ?',
        args: [targetUsername]
      });

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const token = crypto.randomBytes(32).toString('base64url');
      const tokenHash = hashResetToken(token);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

      await db.execute({
        sql: 'UPDATE users SET password_reset_token_hash = ?, password_reset_expires = ? WHERE username = ?',
        args: [tokenHash, expiresAt, targetUsername]
      });

      const resetLink = `${getRequestOrigin(req, origin)}/reset-password?token=${encodeURIComponent(token)}`;

      return res.json({
        success: true,
        username: targetUsername,
        reset_link: resetLink,
        expires_at: expiresAt,
        expires_minutes: RESET_TOKEN_TTL_MINUTES
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Could not generate password reset link' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
