import crypto from 'crypto';
import { db, initRateLimitTable } from './db.js';

const HONEYPOT_FIELDS = ['bot_field', '_honeypot', 'website_url_check'];

/**
 * Check if any standard honeypot fields contain values.
 *
 * @param {Object} body - Request body
 * @returns {{ isSpam: boolean, reason?: string, field?: string }}
 */
export function checkHoneypot(body = {}) {
  if (!body || typeof body !== 'object') return { isSpam: false };

  for (const field of HONEYPOT_FIELDS) {
    const val = body[field];
    if (val !== undefined && val !== null && String(val).trim().length > 0) {
      return { isSpam: true, reason: 'honeypot', field };
    }
  }

  return { isSpam: false };
}

/**
 * Check if the submission occurred too quickly after rendering (speed trap).
 * Real humans take at least 1.5 seconds to fill out and submit a form.
 *
 * @param {string|number} submissionTime - Timestamp from client
 * @param {number} [minMs=1500] - Minimum acceptable elapsed time in ms
 * @returns {{ isSpam: boolean, reason?: string, elapsed?: number }}
 */
export function checkSpeedTrap(submissionTime, minMs = 1500) {
  if (!submissionTime) return { isSpam: false };

  const parsed = Number(submissionTime);
  if (Number.isNaN(parsed) || parsed <= 0) return { isSpam: false };

  const elapsed = Date.now() - parsed;
  // If submitted faster than minMs (and client clock wasn't skewed into the far future)
  if (elapsed >= 0 && elapsed < minMs) {
    return { isSpam: true, reason: 'speed_trap', elapsed };
  }

  return { isSpam: false };
}

/**
 * Count the number of HTTP/HTTPS and www URLs in a string.
 *
 * @param {string} text
 * @returns {number}
 */
export function countUrls(text = '') {
  if (!text) return 0;
  const str = String(text);
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const matches = str.match(urlRegex);
  return matches ? matches.length : 0;
}

/**
 * Check if text contains any blocked keywords or domains.
 *
 * @param {string} text
 * @param {string} blocklist - Comma or newline separated terms
 * @returns {{ matched: boolean, keyword?: string }}
 */
export function checkBlocklist(text = '', blocklist = '') {
  if (!text || !blocklist) return { matched: false };

  const terms = String(blocklist)
    .split(/[\n,]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 1);

  if (terms.length === 0) return { matched: false };

  const lowerText = String(text).toLowerCase();

  for (const term of terms) {
    if (lowerText.includes(term)) {
      return { matched: true, keyword: term };
    }
  }

  return { matched: false };
}

/**
 * Check for duplicate text submissions within a sliding window (default 10 mins).
 *
 * @param {Object} options
 * @param {string} options.scope - e.g. 'entries', 'forms', 'comments'
 * @param {string} options.owner - Owner username or form/section id
 * @param {string} options.content - Text content to hash
 * @param {number} [options.windowMs=600000] - Window duration in ms (10 mins)
 * @returns {Promise<{ isDuplicate: boolean }>}
 */
export async function checkDuplicateSubmission({
  scope,
  owner,
  content,
  windowMs = 600000,
}) {
  if (!content) return { isDuplicate: false };

  try {
    await initRateLimitTable();
  } catch {}

  const normalized = String(content).trim().toLowerCase();
  if (normalized.length < 5) return { isDuplicate: false };

  const hash = crypto
    .createHash('sha256')
    .update(`${scope}:${owner}:${normalized}`)
    .digest('hex')
    .slice(0, 32);

  const rateKey = `dup:${hash}`;
  const now = Date.now();

  try {
    const res = await db.execute({
      sql: 'SELECT last_attempt FROM rate_limits WHERE key = ?',
      args: [rateKey],
    });

    if (res.rows.length > 0) {
      const lastAttempt = Number(res.rows[0].last_attempt) || 0;
      if (now - lastAttempt < windowMs) {
        return { isDuplicate: true };
      }
      await db.execute({
        sql: 'UPDATE rate_limits SET last_attempt = ?, window_reset = ? WHERE key = ?',
        args: [now, now + windowMs, rateKey],
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO rate_limits (key, last_attempt, hourly_count, window_reset) VALUES (?, ?, 1, ?)',
        args: [rateKey, now, now + windowMs],
      });
    }

    return { isDuplicate: false };
  } catch (err) {
    console.error('Duplicate check error:', err);
    return { isDuplicate: false };
  }
}

/**
 * Validate content length, link density, and blocked keywords.
 * Returns { error } if invalid format, or { routeToPending, reason } if suspicious.
 *
 * @param {Object} options
 * @param {string} options.text - Main message / comment / submission body
 * @param {string} [options.senderName] - Optional name
 * @param {string} [options.website] - Optional website
 * @param {string} [options.blocklist=''] - Blocklist keywords
 * @param {number} [options.maxLinks=2] - Maximum URLs before routing to pending
 * @param {number} [options.maxTextLength=2500] - Character cap on message
 * @param {number} [options.maxNameLength=100] - Character cap on name
 * @returns {{ valid: boolean, error?: string, routeToPending?: boolean, reason?: string }}
 */
export function analyzeContent({
  text = '',
  senderName = '',
  website = '',
  blocklist = '',
  maxLinks = 2,
  maxTextLength = 2500,
  maxNameLength = 100,
}) {
  const cleanName = String(senderName || '').trim();
  const cleanText = String(text || '').trim();
  const cleanWebsite = String(website || '').trim();

  // Length checks
  if (cleanName.length > maxNameLength) {
    return {
      valid: false,
      error: `Name exceeds maximum allowed length of ${maxNameLength} characters.`,
    };
  }

  if (cleanText.length > maxTextLength) {
    return {
      valid: false,
      error: `Message exceeds maximum allowed length of ${maxTextLength} characters.`,
    };
  }

  if (cleanWebsite) {
    if (cleanWebsite.length > 250) {
      return {
        valid: false,
        error: 'Website URL exceeds maximum allowed length of 250 characters.',
      };
    }
    try {
      const parsed = new URL(cleanWebsite);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          valid: false,
          error: 'Website must start with http:// or https://',
        };
      }
    } catch {
      return {
        valid: false,
        error: 'Website must be a valid URL',
      };
    }
  }

  // Check link density in text
  const totalUrls = countUrls(cleanText) + (cleanWebsite ? 1 : 0);
  const linkLimit = Math.max(0, Number(maxLinks) ?? 2);
  if (totalUrls > linkLimit) {
    return {
      valid: true,
      routeToPending: true,
      reason: `excessive_links (${totalUrls} > ${linkLimit})`,
    };
  }

  // Check blocklist terms
  const blocklistCheck = checkBlocklist(`${cleanName} ${cleanText} ${cleanWebsite}`, blocklist);
  if (blocklistCheck.matched) {
    return {
      valid: true,
      routeToPending: true,
      reason: `blocked_keyword (${blocklistCheck.keyword})`,
    };
  }

  return { valid: true, routeToPending: false };
}
