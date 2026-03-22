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
}