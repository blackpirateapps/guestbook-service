import { db, initRateLimitTable } from './db.js';

export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Enforce rate limits backed by the rate_limits table.
 *
 * @param {Object} options
 * @param {string} options.key - Unique rate-limiting key (e.g. `entries:${ip}:${owner}`)
 * @param {number} [options.cooldownSeconds=5] - Minimum seconds between consecutive actions
 * @param {number} [options.hourlyLimit=10] - Maximum actions allowed in a 1-hour window
 * @param {string} [options.actionLabel='requests'] - Human-readable label for error messages
 * @returns {Promise<{ allowed: boolean, error?: string, retryAfterSeconds?: number }>}
 */
export async function checkRateLimit({
  key,
  cooldownSeconds = 5,
  hourlyLimit = 10,
  actionLabel = 'requests',
}) {
  try {
    await initRateLimitTable();
  } catch {}

  const now = Date.now();
  const cooldownMs = Math.max(1, Number(cooldownSeconds) || 5) * 1000;
  const maxHourly = Math.max(1, Number(hourlyLimit) || 10);

  try {
    const rateRes = await db.execute({
      sql: 'SELECT last_attempt, hourly_count, window_reset FROM rate_limits WHERE key = ?',
      args: [key],
    });

    if (rateRes.rows.length > 0) {
      let { last_attempt, hourly_count, window_reset } = rateRes.rows[0];
      last_attempt = Number(last_attempt) || 0;
      hourly_count = Number(hourly_count) || 0;
      window_reset = Number(window_reset) || 0;

      // Cooldown check
      const elapsed = now - last_attempt;
      if (elapsed < cooldownMs) {
        const waitSec = Math.ceil((cooldownMs - elapsed) / 1000);
        return {
          allowed: false,
          error: `Please wait ${waitSec} second${waitSec === 1 ? '' : 's'} between ${actionLabel}.`,
          retryAfterSeconds: waitSec,
        };
      }

      // Hourly window check
      if (now > window_reset) {
        hourly_count = 1;
        window_reset = now + 3600000;
      } else {
        if (hourly_count >= maxHourly) {
          const minutesLeft = Math.max(1, Math.ceil((window_reset - now) / 60000));
          return {
            allowed: false,
            error: `Too many ${actionLabel}. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
            retryAfterSeconds: Math.ceil((window_reset - now) / 1000),
          };
        }
        hourly_count += 1;
      }

      await db.execute({
        sql: 'UPDATE rate_limits SET last_attempt = ?, hourly_count = ?, window_reset = ? WHERE key = ?',
        args: [now, hourly_count, window_reset, key],
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO rate_limits (key, last_attempt, hourly_count, window_reset) VALUES (?, ?, ?, ?)',
        args: [key, now, 1, now + 3600000],
      });
    }

    return { allowed: true };
  } catch (err) {
    console.error('Rate limit execution error:', err);
    // Fail open in case of unexpected DB error on rate_limits table
    return { allowed: true };
  }
}
