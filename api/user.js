import { db, sendTelegramNotification } from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { SECRET, ensureAccountColumns, getAccount, requireActiveUser } from './access.js';

const RESET_TOKEN_TTL_MINUTES = 30;

async function ensureUserColumns() {
  await ensureAccountColumns();
  try { await db.execute('ALTER TABLE users ADD COLUMN embed_css_url TEXT'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN email TEXT'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN telegram_chat_id TEXT'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN telegram_notifications INTEGER DEFAULT 0'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN password_reset_token_hash TEXT'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN password_reset_expires TEXT'); } catch {}
}

function getJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
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

function validatePassword(password) {
  if (!password || String(password).length < 8) {
    return 'Password must be at least 8 characters long';
  }
  return '';
}

export default async function handler(req, res) {
  const { method } = req;
  const { action } = req.query;

  // 1. SIGNUP (POST ?action=signup)
  if (method === 'POST' && action === 'signup') {
    const { username, password } = getJsonBody(req);
    const passwordError = validatePassword(password);
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    if (passwordError) return res.status(400).json({ error: passwordError });
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      await ensureUserColumns();
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
    const { username, password } = getJsonBody(req);
    await ensureUserColumns();
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username]
    });
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
      const account = await getAccount(user.username);
      if (account?.account_status === 'suspended') {
        return res.status(403).json({
          error: 'Your account has been suspended.',
          code: 'account_suspended'
        });
      }
      const token = jwt.sign({ username: user.username }, SECRET);
      return res.status(200).json({
        token,
        username: user.username,
        role: account?.role || 'user',
        account_status: account?.account_status || 'active'
      });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 2b. REQUEST PASSWORD RESET (POST ?action=request_password_reset)
  if (method === 'POST' && action === 'request_password_reset') {
    const { username, origin } = getJsonBody(req);
    const requestedUsername = String(username || '').trim();
    if (!requestedUsername) return res.status(400).json({ error: 'Username is required' });

    try {
      await ensureUserColumns();
      const result = await db.execute({
        sql: 'SELECT username, telegram_chat_id FROM users WHERE username = ?',
        args: [requestedUsername]
      });

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          message: 'If that username exists and has Telegram set up, a reset link has been sent.'
        });
      }

      const user = result.rows[0];
      if (!String(user.telegram_chat_id || '').trim()) {
        return res.status(400).json({
          error: 'No Telegram Chat ID is set for this account. Contact admin to reset your password.',
          code: 'missing_telegram_chat_id',
          contact_url: 'https://blackpiratex.com/contact'
        });
      }

      const token = crypto.randomBytes(32).toString('base64url');
      const tokenHash = hashResetToken(token);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

      await db.execute({
        sql: 'UPDATE users SET password_reset_token_hash = ?, password_reset_expires = ? WHERE username = ?',
        args: [tokenHash, expiresAt, user.username]
      });

      const resetLink = `${getRequestOrigin(req, origin)}/reset-password?token=${encodeURIComponent(token)}`;
      const telegramResult = await sendTelegramNotification(user.username, {
        type: 'password_reset',
        reset_link: resetLink,
        expires_minutes: RESET_TOKEN_TTL_MINUTES
      }, { requireEnabled: false });

      if (!telegramResult?.sent) {
        await db.execute({
          sql: 'UPDATE users SET password_reset_token_hash = NULL, password_reset_expires = NULL WHERE username = ?',
          args: [user.username]
        });
        return res.status(400).json({
          error: 'Could not send the reset link through Telegram. Contact admin to reset your password.',
          code: telegramResult?.reason || 'telegram_send_failed',
          contact_url: 'https://blackpiratex.com/contact'
        });
      }

      return res.json({ success: true, message: 'Password reset link sent through Telegram.' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Could not request password reset' });
    }
  }

  // 2c. RESET PASSWORD (POST ?action=reset_password)
  if (method === 'POST' && action === 'reset_password') {
    const { token, password } = getJsonBody(req);
    const passwordError = validatePassword(password);
    if (!token) return res.status(400).json({ error: 'Reset token is required' });
    if (passwordError) return res.status(400).json({ error: passwordError });

    try {
      await ensureUserColumns();
      const tokenHash = hashResetToken(token);
      const result = await db.execute({
        sql: 'SELECT username, password_reset_expires FROM users WHERE password_reset_token_hash = ?',
        args: [tokenHash]
      });

      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Reset link is invalid or expired' });
      }

      const user = result.rows[0];
      const expiresAt = new Date(user.password_reset_expires || 0).getTime();
      if (!expiresAt || expiresAt < Date.now()) {
        await db.execute({
          sql: 'UPDATE users SET password_reset_token_hash = NULL, password_reset_expires = NULL WHERE username = ?',
          args: [user.username]
        });
        return res.status(400).json({ error: 'Reset link is invalid or expired' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.execute({
        sql: 'UPDATE users SET password = ?, password_reset_token_hash = NULL, password_reset_expires = NULL WHERE username = ?',
        args: [hashedPassword, user.username]
      });

      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Could not reset password' });
    }
  }

  // 2d. TEST TELEGRAM (POST ?action=test_telegram)
  if (method === 'POST' && action === 'test_telegram') {
    const auth = await requireActiveUser(req, res);
    if (!auth) return;

    try {
      await ensureUserColumns();
      const result = await sendTelegramNotification(auth.account.username, {
        type: 'test',
        message: 'This is a test alert from Website Tools.'
      });

      if (result?.sent) {
        return res.json({ success: true });
      }

      return res.status(400).json({
        error: 'Telegram notification was not sent',
        reason: result?.reason || 'unknown'
      });
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized or Telegram test failed' });
    }
  }

  // 2e. CHANGE PASSWORD (POST ?action=change_password)
  if (method === 'POST' && action === 'change_password') {
    const auth = await requireActiveUser(req, res);
    if (!auth) return;

    const { current_password, new_password } = getJsonBody(req);
    const passwordError = validatePassword(new_password);
    if (!current_password || !new_password) return res.status(400).json({ error: 'Current and new passwords are required' });
    if (passwordError) return res.status(400).json({ error: passwordError });

    try {
      await ensureUserColumns();
      const result = await db.execute({
        sql: 'SELECT password FROM users WHERE username = ?',
        args: [auth.account.username]
      });
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(current_password, user.password))) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);
      await db.execute({
        sql: 'UPDATE users SET password = ?, password_reset_token_hash = NULL, password_reset_expires = NULL WHERE username = ?',
        args: [hashedPassword, auth.account.username]
      });

      return res.json({ success: true });
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized or password update failed' });
    }
  }

  // 3. PROFILE GET (GET ?username=...)
  if (method === 'GET') {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username required' });
    try {
      await ensureUserColumns();
      const result = await db.execute({
        sql: 'SELECT custom_css, custom_html, require_approval, embed_css_url, email, telegram_chat_id, telegram_notifications, account_status FROM users WHERE username = ?',
        args: [username]
      });
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const profile = result.rows[0];
      if (profile.account_status === 'suspended') {
        return res.status(403).json({
          error: 'This account has been suspended.',
          code: 'account_suspended'
        });
      }
      return res.json({
        custom_css: profile.custom_css || '',
        custom_html: profile.custom_html || '',
        require_approval: profile.require_approval === 1 ? 1 : 0,
        embed_css_url: profile.embed_css_url || '',
        email: profile.email || '',
        telegram_chat_id: profile.telegram_chat_id || '',
        telegram_notifications: Number(profile.telegram_notifications) === 1 ? 1 : 0
      });
    } catch (e) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // 4. PROFILE UPDATE (PUT - Auth Required)
  if (method === 'PUT') {
    const auth = await requireActiveUser(req, res);
    if (!auth) return;

    try {
      await ensureUserColumns();
      const { custom_css, custom_html, require_approval, embed_css_url, email, telegram_chat_id, telegram_notifications } = getJsonBody(req);

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
          auth.account.username
        ]
      });
      return res.json({ success: true });
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized or Update Failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
