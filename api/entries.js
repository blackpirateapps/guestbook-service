import { db } from './db.js';
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

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { method } = req;
  const { user } = req.query;

  // --------------------------------------------
  // 1. GET: Fetch Entries
  // --------------------------------------------
  if (method === 'GET') {
    if (user) {
      // PUBLIC MODE:
      // - Must match owner
      // - Must NOT be private
      // - Must be APPROVED
      try {
        const result = await db.execute({
          sql: `SELECT id, sender_name, message, sender_website, parent_id, created_at, likes, is_owner 
                FROM entries 
                WHERE owner_username = ? 
                  AND is_private = 0 
                  AND status = 'approved'
                ORDER BY created_at DESC`,
          args: [user]
        });
        return res.json(result.rows);
      } catch (e) {
        return res.status(500).json({ error: 'Database error' });
      }
    } else {
      // DASHBOARD MODE (Auth Required):
      // - Shows EVERYTHING (Private, Pending, Approved)
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'No token' });

      try {
        const decoded = jwt.verify(token, SECRET);
        const result = await db.execute({
          sql: 'SELECT * FROM entries WHERE owner_username = ? ORDER BY created_at DESC',
          args: [decoded.username]
        });
        return res.json(result.rows);
      } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
  }

  // --------------------------------------------
  // 2. POST: Create Entry (or Reply)
  // --------------------------------------------
  if (method === 'POST') {
    try {
      const body = getJsonBody(req);

      // OWNER IMPORT MODE (Auth Required):
      // Allows owners to manually import older entries with a specified date.
      if (body.action === 'import') {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let decoded;
        try {
          decoded = jwt.verify(token, SECRET);
        } catch {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const ownerUsername = (body.owner_username || '').trim();
        const senderName = (body.sender_name || '').trim();
        const senderWebsite = (body.sender_website || '').trim();
        const message = (body.message || '').trim();
        const createdAtRaw = (body.created_at || '').trim();

        if (!ownerUsername || decoded.username !== ownerUsername) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        if (!senderName || !message || !createdAtRaw) {
          return res.status(400).json({ error: 'Name, message, and date are required' });
        }

        const createdAt = new Date(createdAtRaw);
        if (Number.isNaN(createdAt.getTime())) {
          return res.status(400).json({ error: 'Invalid date' });
        }

        // Basic URL sanity (optional field)
        if (senderWebsite) {
          try { new URL(senderWebsite); } catch { return res.status(400).json({ error: 'Invalid website URL' }); }
        }

        try {
          await db.execute({
            sql: `INSERT INTO entries
                  (owner_username, sender_name, message, sender_website, parent_id, is_private, is_owner, status, created_at)
                  VALUES (?, ?, ?, ?, NULL, 0, 0, 'approved', ?)`,
            args: [ownerUsername, senderName, message, senderWebsite, createdAt.toISOString()]
          });
        } catch (e) {
          // Backward-compatible fallback if the DB doesn't support setting created_at explicitly.
          await db.execute({
            sql: `INSERT INTO entries
                  (owner_username, sender_name, message, sender_website, parent_id, is_private, is_owner, status)
                  VALUES (?, ?, ?, ?, NULL, 0, 0, 'approved')`,
            args: [ownerUsername, senderName, message, senderWebsite]
          });
        }

        return res.status(201).json({ success: true });
      }
      
      // A. SPAM PROTECTION (Honeypot)
      // If the hidden field "bot_field" has text, it's a bot. Fail silently (return 200).
      if (body.bot_field) return res.json({ success: true });

      const { owner_username, sender_name, message, sender_website, parent_id, is_private } = body;
      
      // B. DETERMINE STATUS & OWNER
      let status = 'approved';
      let isOwner = 0;

      // Check if the poster is actually the Owner (Logged in)
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, SECRET);
          if (decoded.username === owner_username) {
            isOwner = 1; // Verified Owner
            status = 'approved'; // Owners bypass moderation
          }
        } catch (e) { /* Invalid token, treat as guest */ }
      }

      // If NOT owner, check Moderation Settings
      if (!isOwner) {
        const userRes = await db.execute({
          sql: 'SELECT require_approval FROM users WHERE username = ?',
          args: [owner_username]
        });
        if (userRes.rows.length > 0 && userRes.rows[0].require_approval === 1) {
          status = 'pending';
        }
      }

      // C. INSERT
      await db.execute({
        sql: `INSERT INTO entries 
              (owner_username, sender_name, message, sender_website, parent_id, is_private, is_owner, status) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          owner_username, 
          sender_name, 
          message, 
          sender_website || '', 
          parent_id || null,
          is_private ? 1 : 0,
          isOwner,
          status
        ]
      });

      return res.status(201).json({ success: true, status: status });

    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed' });
    }
  }

  // --------------------------------------------
  // 3. PUT: Likes or Moderation Approval
  // --------------------------------------------
  if (method === 'PUT') {
    const { action, id } = getJsonBody(req);

    // A. LIKE (Public, no auth needed)
    if (action === 'like') {
      await db.execute({
        sql: 'UPDATE entries SET likes = COALESCE(likes, 0) + 1 WHERE id = ?',
        args: [id]
      });
      return res.json({ success: true });
    }

    // B. APPROVE (Auth needed)
    if (action === 'approve') {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      try {
        const decoded = jwt.verify(token, SECRET);
        // Verify ownership before approving
        await db.execute({
          sql: "UPDATE entries SET status = 'approved' WHERE id = ? AND owner_username = ?",
          args: [id, decoded.username]
        });
        return res.json({ success: true });
      } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
  }

  // --------------------------------------------
  // 4. DELETE
  // --------------------------------------------
  if (method === 'DELETE') {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SECRET);
      const { id } = getJsonBody(req);
      
      await db.execute({
        sql: 'DELETE FROM entries WHERE id = ? AND owner_username = ?',
        args: [id, decoded.username]
      });
      return res.json({ success: true });
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
}
