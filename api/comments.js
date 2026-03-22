import { db, initCommentsTables } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await initCommentsTables();
  } catch (e) {}

  const { method } = req;
  const { section: sectionId, auth } = req.query;

  // 1. GET: Fetch comments (Public or Auth)
  if (method === 'GET') {
    if (!sectionId) return res.status(400).json({ error: 'Section ID required' });

    const token = req.headers.authorization?.split(' ')[1];
    let isOwner = false;
    let username = null;

    if (token && auth === '1') {
      try {
        const decoded = jwt.verify(token, SECRET);
        username = decoded.username;
        // Verify ownership of the section
        const sectionCheck = await db.execute({
          sql: 'SELECT owner_username FROM comment_sections WHERE id = ?',
          args: [sectionId]
        });
        if (sectionCheck.rows.length > 0 && sectionCheck.rows[0].owner_username === username) {
          isOwner = true;
        }
      } catch (e) {}
    }

    try {
      let sql = 'SELECT * FROM comments WHERE section_id = ?';
      let args = [sectionId];

      if (!isOwner) {
        sql += " AND status = 'approved'";
      }

      sql += ' ORDER BY created_at ASC'; // Ascending for threaded view usually works better

      const result = await db.execute({ sql, args });
      
      // Generate captcha for public users
      let captcha = null;
      if (!isOwner) {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        const answer = (a + b).toString();
        const hash = await bcrypt.hash(answer, 8);
        captcha = {
          question: `${a} + ${b}`,
          key: hash
        };
      }

      return res.json({
        comments: result.rows,
        captcha
      });
    } catch (e) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // 2. POST: Create comment
  if (method === 'POST') {
    const body = getJsonBody(req);
    const { 
      section_id, 
      parent_id, 
      sender_name, 
      sender_email, 
      sender_url, 
      comment_text, 
      is_anonymous,
      captcha_answer,
      captcha_key
    } = body;

    if (!section_id || !comment_text) {
      return res.status(400).json({ error: 'Section ID and comment text are required' });
    }

    // Get section settings
    const sectionRes = await db.execute({
      sql: 'SELECT owner_username, settings FROM comment_sections WHERE id = ?',
      args: [section_id]
    });
    if (sectionRes.rows.length === 0) return res.status(404).json({ error: 'Section not found' });
    
    const section = sectionRes.rows[0];
    const settings = JSON.parse(section.settings);
    const owner_username = section.owner_username;

    // Check if owner is posting (bypass captcha/moderation)
    const token = req.headers.authorization?.split(' ')[1];
    let isOwnerPosting = false;
    if (token) {
      try {
        const decoded = jwt.verify(token, SECRET);
        if (decoded.username === owner_username) isOwnerPosting = true;
      } catch (e) {}
    }

    if (!isOwnerPosting) {
      // Validate Captcha
      if (settings.use_captcha) {
        if (!captcha_answer || !captcha_key) {
          return res.status(400).json({ error: 'Captcha is required' });
        }
        const isValid = await bcrypt.compare(captcha_answer.toString(), captcha_key);
        if (!isValid) return res.status(400).json({ error: 'Invalid captcha answer' });
      }

      // Validate Required Fields
      if (settings.fields?.name?.required && !sender_name && !is_anonymous) {
        return res.status(400).json({ error: 'Name is required' });
      }
      if (settings.fields?.email?.required && !sender_email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      if (settings.fields?.url?.required && !sender_url) {
        return res.status(400).json({ error: 'URL is required' });
      }
    }

    const status = (isOwnerPosting || !settings.require_approval) ? 'approved' : 'pending';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
      await db.execute({
        sql: `INSERT INTO comments 
              (section_id, parent_id, sender_name, sender_email, sender_url, comment_text, is_anonymous, is_owner, status, ip_address) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          section_id,
          parent_id || null,
          isOwnerPosting ? owner_username : (is_anonymous ? 'Anonymous' : sender_name),
          sender_email || '',
          sender_url || '',
          comment_text,
          is_anonymous ? 1 : 0,
          isOwnerPosting ? 1 : 0,
          status,
          ip
        ]
      });
      return res.status(201).json({ success: true, status });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to post comment' });
    }
  }

  // 3. PUT: Like or Approve
  if (method === 'PUT') {
    const { action, id } = getJsonBody(req);
    if (!id) return res.status(400).json({ error: 'Comment ID required' });

    if (action === 'like') {
      try {
        await db.execute({
          sql: 'UPDATE comments SET likes = likes + 1 WHERE id = ?',
          args: [id]
        });
        return res.json({ success: true });
      } catch (e) {
        return res.status(500).json({ error: 'Failed to like' });
      }
    }

    if (action === 'approve') {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      try {
        const decoded = jwt.verify(token, SECRET);
        const username = decoded.username;
        
        // Verify ownership via section
        await db.execute({
          sql: `UPDATE comments SET status = 'approved' 
                WHERE id = ? AND section_id IN (SELECT id FROM comment_sections WHERE owner_username = ?)`,
          args: [id, username]
        });
        return res.json({ success: true });
      } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
  }

  // 4. DELETE: Delete comment
  if (method === 'DELETE') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = getJsonBody(req);
    
    try {
      const decoded = jwt.verify(token, SECRET);
      const username = decoded.username;
      
      await db.execute({
        sql: `DELETE FROM comments 
              WHERE id = ? AND section_id IN (SELECT id FROM comment_sections WHERE owner_username = ?)`,
        args: [id, username]
      });
      return res.json({ success: true });
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
