import jwt from 'jsonwebtoken';
import { db } from './db.js';

export const SECRET = process.env.JWT_SECRET || 'secret';
export const PRIMARY_ADMIN_USERNAME = 'sudip';

export async function ensureAccountColumns() {
  try { await db.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"); } catch {}
  try { await db.execute("ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active'"); } catch {}

  try {
    await db.execute("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''");
    await db.execute("UPDATE users SET account_status = 'active' WHERE account_status IS NULL OR account_status = ''");
    await db.execute({
      sql: "UPDATE users SET role = 'admin', account_status = 'active' WHERE username = ?",
      args: [PRIMARY_ADMIN_USERNAME]
    });
  } catch {}
}

export function normalizeRole(role) {
  return role === 'admin' ? 'admin' : 'user';
}

export function normalizeAccountStatus(status) {
  return status === 'suspended' ? 'suspended' : 'active';
}

export function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return '';
  return token;
}

export async function getAccount(username) {
  const targetUsername = String(username || '').trim();
  if (!targetUsername) return null;

  await ensureAccountColumns();
  const result = await db.execute({
    sql: 'SELECT username, role, account_status FROM users WHERE username = ?',
    args: [targetUsername]
  });
  const row = result.rows[0];
  if (!row) return null;

  return {
    username: row.username,
    role: row.username === PRIMARY_ADMIN_USERNAME ? 'admin' : normalizeRole(row.role),
    account_status: row.username === PRIMARY_ADMIN_USERNAME ? 'active' : normalizeAccountStatus(row.account_status)
  };
}

export async function getAccountAccess(username) {
  const account = await getAccount(username);
  return {
    exists: Boolean(account),
    account,
    is_suspended: account?.account_status === 'suspended',
    is_admin: account?.role === 'admin'
  };
}

export function verifyJwtToken(token) {
  return jwt.verify(token, SECRET);
}

export async function getAuthenticatedAccount(req) {
  const token = getBearerToken(req);
  if (!token) return { error: 'No token', status: 401 };

  let decoded;
  try {
    decoded = verifyJwtToken(token);
  } catch {
    return { error: 'Unauthorized', status: 401 };
  }

  const account = await getAccount(decoded.username);
  if (!account) return { error: 'Unauthorized', status: 401 };
  if (account.account_status === 'suspended') {
    return {
      error: 'Your account has been suspended.',
      code: 'account_suspended',
      status: 403,
      account
    };
  }

  return { decoded, account };
}

export async function requireActiveUser(req, res) {
  const auth = await getAuthenticatedAccount(req);
  if (auth.error) {
    res.status(auth.status).json({
      error: auth.error,
      ...(auth.code ? { code: auth.code } : {})
    });
    return null;
  }
  return auth;
}

export async function requireAdmin(req, res) {
  const auth = await getAuthenticatedAccount(req);
  if (auth.error) {
    res.status(auth.status).json({
      error: auth.error,
      ...(auth.code ? { code: auth.code } : {})
    });
    return null;
  }

  if (auth.account.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }

  return auth;
}

export async function assertAccountCanReceive(ownerUsername) {
  const access = await getAccountAccess(ownerUsername);
  if (!access.exists) {
    return { ok: false, status: 404, error: 'User not found' };
  }
  if (access.is_suspended) {
    return { ok: false, status: 403, error: 'This account has been suspended.' };
  }
  return { ok: true, account: access.account };
}
