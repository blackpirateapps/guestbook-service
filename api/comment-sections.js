import { db, initCommentsTables } from './db.js';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

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

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await initCommentsTables();
  } catch (e) {}

  const { method } = req;
  const token = req.headers.authorization?.split(' ')[1];
  
  // Public GET (for single section)
  if (method === 'GET' && req.query.id && !token) {
    try {
      const result = await db.execute({
        sql: 'SELECT id, owner_username, name, settings FROM comment_sections WHERE id = ?',
        args: [req.query.id]
      });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const section = result.rows[0];
      section.settings = JSON.parse(section.settings);
      return res.json(section);
    } catch (e) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // Auth required for everything else
  if (!token) return res.status(401).json({ error: 'No token' });
  let decoded;
  try {
    decoded = jwt.verify(token, SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const username = decoded.username;

  if (method === 'GET') {
    try {
      const result = await db.execute({
        sql: `SELECT s.*, 
              (SELECT COUNT(*) FROM comments WHERE section_id = s.id) as comment_count
              FROM comment_sections s 
              WHERE s.owner_username = ? 
              ORDER BY s.created_at DESC`,
        args: [username]
      });
      const sections = result.rows.map(s => ({
        ...s,
        settings: JSON.parse(s.settings)
      }));
      return res.json(sections);
    } catch (e) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (method === 'POST') {
    const { name, settings } = getJsonBody(req);
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = generateId();
    try {
      await db.execute({
        sql: 'INSERT INTO comment_sections (id, owner_username, name, settings) VALUES (?, ?, ?, ?)',
        args: [id, username, name, JSON.stringify(settings || {})]
      });
      return res.status(201).json({ id, name, settings });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to create' });
    }
  }

  if (method === 'PUT') {
    const { id, name, settings } = getJsonBody(req);
    if (!id) return res.status(400).json({ error: 'ID is required' });
    try {
      const result = await db.execute({
        sql: 'UPDATE comment_sections SET name = COALESCE(?, name), settings = COALESCE(?, settings) WHERE id = ? AND owner_username = ?',
        args: [name, settings ? JSON.stringify(settings) : null, id, username]
      });
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update' });
    }
  }

  if (method === 'DELETE') {
    const { id } = getJsonBody(req);
    if (!id) return res.status(400).json({ error: 'ID is required' });
    try {
      await db.execute({
        sql: 'DELETE FROM comment_sections WHERE id = ? AND owner_username = ?',
        args: [id, username]
      });
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete' });
    }
  }
}
