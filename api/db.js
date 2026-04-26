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

// Telegram notification helper
export async function sendTelegramNotification(ownerUsername, payload) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) return; // Silent return if not configured

  try {
    // Check if the user has telegram_notifications enabled, and get the chat_id
    const res = await db.execute({
      sql: 'SELECT telegram_chat_id, telegram_notifications FROM users WHERE username = ?',
      args: [ownerUsername]
    });

    if (res.rows.length === 0) return;
    const user = res.rows[0];

    if (user.telegram_notifications !== 1 || !user.telegram_chat_id) {
      return;
    }

    let textStr = "";
    if (payload.type === 'guestbook') {
      textStr = `📖 *New Guestbook Entry*\n\n*Name*: ${payload.sender_name}\n*Message*: ${payload.message}`;
    } else if (payload.type === 'comment') {
      textStr = `💬 *New Comment*\n\n*Page*: ${payload.url}\n*Name*: ${payload.sender_name}\n*Message*: ${payload.message}`;
    } else if (payload.type === 'form') {
      textStr = `📬 *New Form Submission*\n\n*Form*: ${payload.formName}\n*Data*:\n`;
      for (const [key, val] of Object.entries(payload.data)) {
        textStr += `• *${key}*: ${val}\n`;
      }
    } else {
      textStr = `🔔 *New Notification*\n\n${JSON.stringify(payload)}`;
    }

    // Call the Telegram bot API
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: user.telegram_chat_id,
        text: textStr,
        parse_mode: "Markdown"
      })
    });
  } catch (err) {
    // Swallow error to not interrupt the main process flow
    console.error("Telegram notification error:", err);
  }
}
