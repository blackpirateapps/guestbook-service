import { db, initCommentsTables, initRateLimitTable, sendTelegramNotification } from '../../lib/db.js';
import { assertAccountCanReceive, getAuthenticatedAccount, requireActiveUser } from '../../lib/access.js';
import { checkHoneypot, checkSpeedTrap, checkDuplicateSubmission, analyzeContent } from '../../lib/spam.js';
import { checkRateLimit, getClientIp } from '../../lib/rateLimit.js';

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

    let isOwner = false;

    let sectionCheck;
    try {
      sectionCheck = await db.execute({
        sql: 'SELECT owner_username FROM comment_sections WHERE id = ?',
        args: [sectionId]
      });
      if (sectionCheck.rows.length === 0) return res.status(404).json({ error: 'Section not found' });

      const receiveAccess = await assertAccountCanReceive(sectionCheck.rows[0].owner_username);
      if (!receiveAccess.ok) {
        return res.status(receiveAccess.status).json({ error: receiveAccess.error });
      }

      if (auth === '1') {
        const userAuth = await getAuthenticatedAccount(req);
        if (userAuth?.account?.username === sectionCheck.rows[0].owner_username) {
          isOwner = true;
        }
      }
    } catch (e) {
      return res.status(500).json({ error: 'Database error' });
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

    // A. SPAM PROTECTION (Honeypot & Speed Trap)
    const honeypot = checkHoneypot(body);
    if (honeypot.isSpam) {
      return res.status(400).json({ error: 'Spam detected' });
    }

    const speedTrap = checkSpeedTrap(body._submission_time);
    if (speedTrap.isSpam) {
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
    const receiveAccess = await assertAccountCanReceive(owner_username);
    if (!receiveAccess.ok) {
      return res.status(receiveAccess.status).json({ error: receiveAccess.error });
    }

    // Check if owner is posting (bypass moderation and rate limiting)
    let isOwnerPosting = false;
    const userAuth = await getAuthenticatedAccount(req);
    if (userAuth?.error && userAuth.code === 'account_suspended') {
      return res.status(403).json({ error: userAuth.error, code: userAuth.code });
    }
    if (userAuth?.account?.username === owner_username) {
      isOwnerPosting = true;
    }

    const ip = getClientIp(req);
    let status = (isOwnerPosting || !settings.require_approval) ? 'approved' : 'pending';

    if (!isOwnerPosting) {
      // Get owner user-level settings fallback
      const userRes = await db.execute({
        sql: 'SELECT spam_blocklist, max_links, rate_limit_cooldown, rate_limit_hourly FROM users WHERE username = ?',
        args: [owner_username]
      });
      const userRow = userRes.rows[0] || {};
      const cooldownSeconds = settings.spam?.cooldown_seconds ?? userRow.rate_limit_cooldown ?? 5;
      const hourlyLimit = settings.spam?.hourly_limit ?? userRow.rate_limit_hourly ?? 10;
      const blocklist = settings.spam?.blocklist || userRow.spam_blocklist || '';
      const maxLinks = settings.spam?.max_links ?? userRow.max_links ?? 2;

      // Rate Limiting
      const rateCheck = await checkRateLimit({
        key: `comments:${ip}:${section_id}`,
        cooldownSeconds,
        hourlyLimit,
        actionLabel: 'comments'
      });
      if (!rateCheck.allowed) {
        return res.status(429).json({ error: rateCheck.error });
      }

      // Duplicate detection
      const dupCheck = await checkDuplicateSubmission({
        scope: 'comments',
        owner: section_id,
        content: `${sender_name || ''}:${comment_text}`
      });
      if (dupCheck.isDuplicate) {
        return res.status(429).json({
          error: 'Duplicate comment detected. Please avoid submitting the same comment repeatedly.'
        });
      }

      // Content analysis
      const analysis = analyzeContent({
        text: comment_text,
        senderName: sender_name,
        website: sender_url,
        blocklist,
        maxLinks
      });
      if (!analysis.valid) {
        return res.status(400).json({ error: analysis.error });
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

      if (settings.require_approval || analysis.routeToPending) {
        status = 'pending';
      }
    }

    try {
      await db.execute({
        sql: `INSERT INTO comments 
              (section_id, parent_id, sender_name, sender_email, sender_url, comment_text, is_anonymous, is_owner, status, ip_address, page_url) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          section_id,
          parent_id || null,
          isOwnerPosting ? owner_username : (is_anonymous ? 'Anonymous' : (sender_name || 'Anonymous')),
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
          sender_name: is_anonymous ? 'Anonymous' : (sender_name || 'Anonymous'),
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
        const commentRes = await db.execute({
          sql: `SELECT s.owner_username
                FROM comments c
                JOIN comment_sections s ON c.section_id = s.id
                WHERE c.id = ?`,
          args: [id]
        });
        if (commentRes.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
        const receiveAccess = await assertAccountCanReceive(commentRes.rows[0].owner_username);
        if (!receiveAccess.ok) {
          return res.status(receiveAccess.status).json({ error: receiveAccess.error });
        }

        const ip = getClientIp(req);
        const likeRate = await checkRateLimit({
          key: `comment_likes:${ip}:${id}`,
          cooldownSeconds: 3,
          hourlyLimit: 60,
          actionLabel: 'likes'
        });
        if (!likeRate.allowed) {
          return res.status(429).json({ error: likeRate.error });
        }

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
      const auth = await requireActiveUser(req, res);
      if (!auth) return;

      try {
        // Verify ownership via section
        await db.execute({
          sql: `UPDATE comments SET status = 'approved' 
                WHERE id = ? AND section_id IN (SELECT id FROM comment_sections WHERE owner_username = ?)`,
          args: [id, auth.account.username]
        });
        return res.json({ success: true });
      } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
  }

  // 4. DELETE: Delete comment
  if (method === 'DELETE') {
    const auth = await requireActiveUser(req, res);
    if (!auth) return;

    const { id } = getJsonBody(req);
    
    try {
      await db.execute({
        sql: `DELETE FROM comments 
              WHERE id = ? AND section_id IN (SELECT id FROM comment_sections WHERE owner_username = ?)`,
        args: [id, auth.account.username]
      });
      return res.json({ success: true });
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
