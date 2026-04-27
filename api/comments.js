import { db, initCommentsTables, initRateLimitTable, sendTelegramNotification } from './db.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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
    await initRateLimitTable();
  } catch (e) {}

  const { method } = req;
  let { section: sectionId, auth, page_url: queryPageUrl } = req.query;
  if (queryPageUrl && !queryPageUrl.endsWith('/')) queryPageUrl += '/';

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
        // Only filter by URL for public users (not in dashboard moderation mode)
        if (queryPageUrl) {
          sql += " AND page_url = ?";
          args.push(queryPageUrl);
        }
      }

      sql += ' ORDER BY created_at ASC';

      const result = await db.execute({ sql, args });
      
      return res.json({
        comments: result.rows
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
      website_url_check // Honeypot
    } = body;
    let { page_url } = body;
    if (page_url && !page_url.endsWith('/')) page_url += '/';

    if (!section_id || !comment_text) {
      return res.status(400).json({ error: 'Section ID and comment text are required' });
    }

    if (website_url_check) {
      // Bot detected via honeypot
      return res.status(400).json({ error: 'Spam detected' });
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

    // Check if owner is posting (bypass moderation and rate limiting)
    const token = req.headers.authorization?.split(' ')[1];
    let isOwnerPosting = false;
    if (token) {
      try {
        const decoded = jwt.verify(token, SECRET);
        if (decoded.username === owner_username) isOwnerPosting = true;
      } catch (e) {}
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (!isOwnerPosting) {
      // Rate Limiting
      const now = Date.now();
      const rateKey = `comments:${ip}`;
      
      const rateRes = await db.execute({
        sql: 'SELECT * FROM rate_limits WHERE key = ?',
        args: [rateKey]
      });

      if (rateRes.rows.length > 0) {
        let { last_attempt, hourly_count, window_reset } = rateRes.rows[0];
        
        // 5 second cooldown
        if (now - last_attempt < 5000) {
          return res.status(429).json({ error: 'Please wait 5 seconds between comments' });
        }

        // 10 comments per hour
        if (now > window_reset) {
          // Reset window
          hourly_count = 1;
          window_reset = now + 3600000;
        } else {
          if (hourly_count >= 10) {
            const minutesLeft = Math.ceil((window_reset - now) / 60000);
            return res.status(429).json({ error: `Too many comments. Try again in ${minutesLeft} minutes.` });
          }
          hourly_count += 1;
        }

        await db.execute({
          sql: 'UPDATE rate_limits SET last_attempt = ?, hourly_count = ?, window_reset = ? WHERE key = ?',
          args: [now, hourly_count, window_reset, rateKey]
        });
      } else {
        // First attempt for this IP
        await db.execute({
          sql: 'INSERT INTO rate_limits (key, last_attempt, hourly_count, window_reset) VALUES (?, ?, ?, ?)',
          args: [rateKey, now, 1, now + 3600000]
        });
      }

      // Validate Required Fields
      if (!is_anonymous) {
        if (settings.fields?.name?.required && !sender_name) {
          return res.status(400).json({ error: 'Name is required' });
        }
        if (settings.fields?.email?.required && !sender_email) {
          return res.status(400).json({ error: 'Email is required' });
        }
        if (settings.fields?.url?.required && !sender_url) {
          return res.status(400).json({ error: 'URL is required' });
        }
      }
    }

    const status = (isOwnerPosting || !settings.require_approval) ? 'approved' : 'pending';

    try {
      await db.execute({
        sql: `INSERT INTO comments 
              (section_id, parent_id, sender_name, sender_email, sender_url, comment_text, is_anonymous, is_owner, status, ip_address, page_url) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          ip,
          page_url || ''
        ]
      });
      
      if (!isOwnerPosting) {
        await sendTelegramNotification(owner_username, {
          type: 'comment',
          sender_name: is_anonymous ? 'Anonymous' : sender_name,
          message: comment_text,
          url: page_url || ''
        });
      }

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
