import { db, initLikesTables, initRateLimitTable } from './db.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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

function normalizePostUrl(rawUrl) {
  if (!rawUrl) return null;
  const trimmed = String(rawUrl).trim();
  if (!trimmed) return null;
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  let normalized = parsed.origin + parsed.pathname;
  if (!normalized.endsWith('/')) normalized += '/';
  if (parsed.search) normalized += parsed.search;
  return normalized;
}

async function applyRateLimit({ ip, ownerUsername, postUrl }) {
  const now = Date.now();
  const rateKey = `likes:${ip}:${ownerUsername}:${postUrl}`;

  const rateRes = await db.execute({
    sql: 'SELECT * FROM rate_limits WHERE key = ?',
    args: [rateKey]
  });

  if (rateRes.rows.length > 0) {
    let { last_attempt, hourly_count, window_reset } = rateRes.rows[0];

    if (now - last_attempt < 5000) {
      return { allowed: false, error: 'Please wait 5 seconds between likes' };
    }

    if (now > window_reset) {
      hourly_count = 1;
      window_reset = now + 3600000;
    } else {
      if (hourly_count >= 50) {
        const minutesLeft = Math.ceil((window_reset - now) / 60000);
        return { allowed: false, error: `Too many likes. Try again in ${minutesLeft} minutes.` };
      }
      hourly_count += 1;
    }

    await db.execute({
      sql: 'UPDATE rate_limits SET last_attempt = ?, hourly_count = ?, window_reset = ? WHERE key = ?',
      args: [now, hourly_count, window_reset, rateKey]
    });
  } else {
    await db.execute({
      sql: 'INSERT INTO rate_limits (key, last_attempt, hourly_count, window_reset) VALUES (?, ?, ?, ?)',
      args: [rateKey, now, 1, now + 3600000]
    });
  }

  return { allowed: true };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await initLikesTables();
    await initRateLimitTable();
  } catch (e) {}

  const body = getJsonBody(req);
  const action = (body.action || '').trim();
  const ownerUsername = (body.owner_username || '').trim();
  const postUrl = normalizePostUrl(body.post_url);

  if (!action) return res.status(400).json({ error: 'Action required' });
  if (!ownerUsername) return res.status(400).json({ error: 'owner_username required' });

  if (action === 'summary') {
    try {
      const totalsRes = await db.execute({
        sql: 'SELECT COUNT(*) as post_count, COALESCE(SUM(likes), 0) as total_likes FROM post_likes WHERE owner_username = ?',
        args: [ownerUsername]
      });
      const totals = totalsRes.rows[0] || { post_count: 0, total_likes: 0 };

      const topRes = await db.execute({
        sql: 'SELECT post_url, likes FROM post_likes WHERE owner_username = ? ORDER BY likes DESC, post_url ASC LIMIT 5',
        args: [ownerUsername]
      });

      return res.json({
        success: true,
        owner_username: ownerUsername,
        total_likes: Number(totals.total_likes) || 0,
        post_count: Number(totals.post_count) || 0,
        top_posts: topRes.rows || []
      });
    } catch (e) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (!postUrl) return res.status(400).json({ error: 'Valid post_url required' });

  if (action === 'get') {
    try {
      const result = await db.execute({
        sql: 'SELECT likes FROM post_likes WHERE owner_username = ? AND post_url = ?',
        args: [ownerUsername, postUrl]
      });
      const likes = result.rows.length > 0 ? Number(result.rows[0].likes) : 0;
      return res.json({ success: true, post_url: postUrl, likes });
    } catch (e) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (action === 'like') {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const rate = await applyRateLimit({ ip, ownerUsername, postUrl });
    if (!rate.allowed) return res.status(429).json({ error: rate.error || 'Rate limit exceeded' });

    try {
      await db.execute({
        sql: `INSERT INTO post_likes (owner_username, post_url, likes)
              VALUES (?, ?, 1)
              ON CONFLICT(owner_username, post_url)
              DO UPDATE SET likes = likes + 1, updated_at = datetime('now')`,
        args: [ownerUsername, postUrl]
      });

      const result = await db.execute({
        sql: 'SELECT likes FROM post_likes WHERE owner_username = ? AND post_url = ?',
        args: [ownerUsername, postUrl]
      });
      const likes = result.rows.length > 0 ? Number(result.rows[0].likes) : 0;
      return res.json({ success: true, post_url: postUrl, likes });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to like post' });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}
