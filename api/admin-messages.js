import { db, initAdminMessageTables } from './db.js';
import { requireActiveUser, requireAdmin } from './access.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
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

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await initAdminMessageTables();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Could not prepare admin messages' });
  }

  if (req.method === 'POST') {
    const auth = await requireActiveUser(req, res);
    if (!auth) return;

    const body = getJsonBody(req);
    const subject = cleanText(body.subject || 'Support request', 140) || 'Support request';
    const message = cleanText(body.message, 4000);

    if (!message) return res.status(400).json({ error: 'Message is required' });

    try {
      const result = await db.execute({
        sql: `INSERT INTO admin_messages (sender_username, subject, message, status)
              VALUES (?, ?, ?, 'open')`,
        args: [auth.account.username, subject, message]
      });

      return res.status(201).json({ success: true, id: Number(result.lastInsertRowid) || null });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Could not send message' });
    }
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    try {
      const result = await db.execute({
        sql: `SELECT id, sender_username, subject, message, status, created_at, updated_at
              FROM admin_messages
              ORDER BY created_at DESC`
      });
      return res.json({ messages: result.rows });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Could not load messages' });
    }
  }

  if (req.method === 'PUT') {
    const { id, status } = getJsonBody(req);
    const nextStatus = ['open', 'read', 'closed'].includes(status) ? status : '';
    if (!id) return res.status(400).json({ error: 'Message ID is required' });
    if (!nextStatus) return res.status(400).json({ error: 'Valid status is required' });

    try {
      await db.execute({
        sql: `UPDATE admin_messages
              SET status = ?, updated_at = datetime('now')
              WHERE id = ?`,
        args: [nextStatus, id]
      });
      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Could not update message' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = getJsonBody(req);
    if (!id) return res.status(400).json({ error: 'Message ID is required' });

    try {
      await db.execute({
        sql: 'DELETE FROM admin_messages WHERE id = ?',
        args: [id]
      });
      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Could not delete message' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
