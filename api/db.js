import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize forms and form_submissions tables
export async function initFormsTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      owner_username TEXT NOT NULL,
      name TEXT NOT NULL,
      fields TEXT NOT NULL,
      require_approval INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_username) REFERENCES users(username)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS form_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id TEXT NOT NULL,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'approved',
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    )
  `);
}

// Initialize rate_limits table
export async function initRateLimitTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      last_attempt INTEGER DEFAULT 0,
      hourly_count INTEGER DEFAULT 0,
      window_reset INTEGER DEFAULT 0
    )
  `);
}

// Initialize post_likes table
export async function initLikesTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS post_likes (
      owner_username TEXT NOT NULL,
      post_url TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(owner_username, post_url)
    )
  `);
}

// Initialize admin message table
export async function initAdminMessageTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_username TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sender_username) REFERENCES users(username)
    )
  `);
}

// Initialize comment_sections and comments tables
export async function initCommentsTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS comment_sections (
      id TEXT PRIMARY KEY,
      owner_username TEXT NOT NULL,
      name TEXT NOT NULL,
      settings TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_username) REFERENCES users(username)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id TEXT NOT NULL,
      parent_id INTEGER NULL,
      sender_name TEXT,
      sender_email TEXT,
      sender_url TEXT,
      comment_text TEXT NOT NULL,
      is_anonymous INTEGER DEFAULT 0,
      is_owner INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      likes INTEGER DEFAULT 0,
      ip_address TEXT,
      page_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (section_id) REFERENCES comment_sections(id) ON DELETE CASCADE
    )
  `);

  try {
    await db.execute("ALTER TABLE comments ADD COLUMN is_anonymous INTEGER DEFAULT 0");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE comments ADD COLUMN is_owner INTEGER DEFAULT 0");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE comments ADD COLUMN page_url TEXT");
  } catch (e) {}
}

async function ensureTelegramColumns() {
  try { await db.execute('ALTER TABLE users ADD COLUMN telegram_chat_id TEXT'); } catch {}
  try { await db.execute('ALTER TABLE users ADD COLUMN telegram_notifications INTEGER DEFAULT 0'); } catch {}
}

function escapeTelegramHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTelegramValue(value) {
  if (value === undefined || value === null || value === '') return 'Not provided';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function trimTelegramMessage(message) {
  const maxLength = 3900;
  if (message.length <= maxLength) return message;
  return `${message.slice(0, maxLength)}\n\n...truncated`;
}

function buildTelegramMessage(payload) {
  if (payload.type === 'guestbook') {
    return `📖 <b>New Guestbook Entry</b>\n\n<b>Name:</b> ${escapeTelegramHtml(payload.sender_name || 'Anonymous')}\n<b>Message:</b> ${escapeTelegramHtml(payload.message)}`;
  }

  if (payload.type === 'comment') {
    return `💬 <b>New Comment</b>\n\n<b>Page:</b> ${escapeTelegramHtml(payload.url || 'Unknown')}\n<b>Name:</b> ${escapeTelegramHtml(payload.sender_name || 'Anonymous')}\n<b>Message:</b> ${escapeTelegramHtml(payload.message)}`;
  }

  if (payload.type === 'form') {
    const lines = [
      `📬 <b>New Form Submission</b>`,
      '',
      `<b>Form:</b> ${escapeTelegramHtml(payload.formName || 'Untitled form')}`,
      `<b>Data:</b>`
    ];

    for (const [key, val] of Object.entries(payload.data || {})) {
      lines.push(`• <b>${escapeTelegramHtml(key)}:</b> ${escapeTelegramHtml(formatTelegramValue(val))}`);
    }

    return lines.join('\n');
  }

  if (payload.type === 'test') {
    return `🔔 <b>Telegram Test</b>\n\n${escapeTelegramHtml(payload.message || 'Your Website Tools Telegram notifications are working.')}`;
  }

  if (payload.type === 'password_reset') {
    return [
      `🔐 <b>Password Reset Request</b>`,
      '',
      `Use this link to reset your Website Tools password:`,
      escapeTelegramHtml(payload.reset_link),
      '',
      `This link expires in ${escapeTelegramHtml(payload.expires_minutes || 30)} minutes. If you did not request this, you can ignore it.`
    ].join('\n');
  }

  return `🔔 <b>New Notification</b>\n\n${escapeTelegramHtml(JSON.stringify(payload))}`;
}

// Telegram notification helper
export async function sendTelegramNotification(ownerUsername, payload, options = {}) {
  const { requireEnabled = true } = options;
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("Telegram notification skipped: TELEGRAM_BOT_TOKEN is not configured.");
    return { sent: false, reason: "missing_bot_token" };
  }

  try {
    await ensureTelegramColumns();

    // Check if the user has telegram_notifications enabled, and get the chat_id
    const res = await db.execute({
      sql: 'SELECT telegram_chat_id, telegram_notifications FROM users WHERE username = ?',
      args: [ownerUsername]
    });

    if (res.rows.length === 0) {
      console.warn("Telegram notification skipped: owner not found.", { ownerUsername });
      return { sent: false, reason: "owner_not_found" };
    }

    const user = res.rows[0];
    const chatId = String(user.telegram_chat_id || '').trim();

    if (!chatId || (requireEnabled && Number(user.telegram_notifications) !== 1)) {
      console.warn("Telegram notification skipped: notifications disabled or chat ID missing.", {
        ownerUsername,
        hasChatId: Boolean(chatId),
        telegramNotifications: Number(user.telegram_notifications)
      });
      return { sent: false, reason: "disabled_or_missing_chat_id" };
    }

    const textStr = trimTelegramMessage(buildTelegramMessage(payload));

    // Call the Telegram bot API
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: textStr,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    if (!telegramRes.ok) {
      const details = await telegramRes.text().catch(() => '');
      console.error("Telegram notification failed:", telegramRes.status, details);
      return { sent: false, reason: "telegram_api_error", status: telegramRes.status };
    }

    return { sent: true };
  } catch (err) {
    // Swallow error to not interrupt the main process flow
    console.error("Telegram notification error:", err);
    return { sent: false, reason: "exception" };
  }
}
