import { db, initNotificationsTables, sendTelegramNotification } from '../../lib/db.js';
import { requireActiveUser, requireAdmin } from '../../lib/access.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
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

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await initNotificationsTables();
  } catch (e) {
    console.error('Failed to init notifications table:', e);
    return res.status(500).json({ error: 'Database initialization failed' });
  }

  const query = req.query || {};

  // ---------------------------------------------------------------
  // GET /api/notifications
  // - ?admin=1: Admin views all sent notifications & read analytics
  // - standard: Active user views applicable notifications
  // ---------------------------------------------------------------
  if (req.method === 'GET') {
    if (query.admin === '1') {
      const adminAuth = await requireAdmin(req, res);
      if (!adminAuth) return;

      try {
        const result = await db.execute(`
          SELECT 
            n.id, n.created_by, n.target_type, n.target_value, n.title, n.message,
            n.severity, n.action_label, n.action_url, n.is_banner, n.send_telegram,
            n.expires_at, n.created_at,
            COUNT(DISTINCT nr.username) as read_count,
            COUNT(DISTINCT CASE WHEN nr.is_dismissed = 1 THEN nr.username END) as dismissed_count
          FROM notifications n
          LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.is_read = 1
          GROUP BY n.id
          ORDER BY n.created_at DESC
        `);

        return res.json({ notifications: result.rows });
      } catch (err) {
        console.error('Admin get notifications error:', err);
        return res.status(500).json({ error: 'Could not load notifications' });
      }
    }

    const auth = await requireActiveUser(req, res);
    if (!auth) return;

    const username = auth.account.username;
    const role = auth.account.role;
    const status = auth.account.account_status;

    try {
      const result = await db.execute({
        sql: `
          SELECT 
            n.id, n.created_by, n.target_type, n.target_value, n.title, n.message,
            n.severity, n.action_label, n.action_url, n.is_banner, n.expires_at, n.created_at,
            COALESCE(nr.is_read, 0) as is_read,
            nr.read_at,
            COALESCE(nr.is_dismissed, 0) as is_dismissed,
            nr.dismissed_at
          FROM notifications n
          LEFT JOIN notification_reads nr 
            ON n.id = nr.notification_id AND nr.username = ?
          WHERE (
            n.target_type = 'all'
            OR (n.target_type = 'user' AND n.target_value = ?)
            OR (n.target_type = 'role' AND n.target_value = ?)
            OR (n.target_type = 'status' AND n.target_value = ?)
          )
          AND (n.expires_at IS NULL OR n.expires_at = '' OR n.expires_at > datetime('now'))
          ORDER BY n.created_at DESC
        `,
        args: [username, username, role, status]
      });

      const notifications = result.rows.map((row) => ({
        ...row,
        is_read: Number(row.is_read) === 1,
        is_dismissed: Number(row.is_dismissed) === 1,
        is_banner: Number(row.is_banner) === 1
      }));

      const unreadCount = notifications.filter((n) => !n.is_read).length;

      return res.json({
        notifications,
        unread_count: unreadCount
      });
    } catch (err) {
      console.error('User get notifications error:', err);
      return res.status(500).json({ error: 'Could not fetch notifications' });
    }
  }

  // ---------------------------------------------------------------
  // POST /api/notifications
  // - action=mark_read: user marks one or all as read
  // - action=dismiss: user dismisses a banner alert
  // - default: admin creates a new notification (and dispatches telegram)
  // ---------------------------------------------------------------
  if (req.method === 'POST') {
    const action = query.action;
    const body = getJsonBody(req);

    if (action === 'mark_read') {
      const auth = await requireActiveUser(req, res);
      if (!auth) return;

      const username = auth.account.username;
      const role = auth.account.role;
      const status = auth.account.account_status;

      if (body.all) {
        try {
          await db.execute({
            sql: `
              INSERT INTO notification_reads (notification_id, username, is_read, read_at)
              SELECT n.id, ?, 1, datetime('now')
              FROM notifications n
              WHERE (
                n.target_type = 'all'
                OR (n.target_type = 'user' AND n.target_value = ?)
                OR (n.target_type = 'role' AND n.target_value = ?)
                OR (n.target_type = 'status' AND n.target_value = ?)
              )
              AND (n.expires_at IS NULL OR n.expires_at = '' OR n.expires_at > datetime('now'))
              ON CONFLICT(notification_id, username) DO UPDATE SET is_read = 1, read_at = datetime('now')
            `,
            args: [username, username, role, status]
          });
          return res.json({ success: true });
        } catch (err) {
          console.error('Mark all read error:', err);
          return res.status(500).json({ error: 'Failed to mark all as read' });
        }
      }

      const notifId = Number(body.notification_id || query.id);
      if (!notifId) return res.status(400).json({ error: 'Notification ID required' });

      try {
        await db.execute({
          sql: `
            INSERT INTO notification_reads (notification_id, username, is_read, read_at)
            VALUES (?, ?, 1, datetime('now'))
            ON CONFLICT(notification_id, username) DO UPDATE SET is_read = 1, read_at = datetime('now')
          `,
          args: [notifId, username]
        });
        return res.json({ success: true });
      } catch (err) {
        console.error('Mark read error:', err);
        return res.status(500).json({ error: 'Failed to mark as read' });
      }
    }

    if (action === 'dismiss') {
      const auth = await requireActiveUser(req, res);
      if (!auth) return;

      const username = auth.account.username;
      const notifId = Number(body.notification_id || query.id);
      if (!notifId) return res.status(400).json({ error: 'Notification ID required' });

      try {
        await db.execute({
          sql: `
            INSERT INTO notification_reads (notification_id, username, is_dismissed, dismissed_at)
            VALUES (?, ?, 1, datetime('now'))
            ON CONFLICT(notification_id, username) DO UPDATE SET is_dismissed = 1, dismissed_at = datetime('now')
          `,
          args: [notifId, username]
        });
        return res.json({ success: true });
      } catch (err) {
        console.error('Dismiss error:', err);
        return res.status(500).json({ error: 'Failed to dismiss notification' });
      }
    }

    // Default POST: Admin creates notification
    const adminAuth = await requireAdmin(req, res);
    if (!adminAuth) return;

    const title = cleanText(body.title, 200);
    const message = cleanText(body.message, 5000);
    const severity = ['info', 'success', 'warning', 'urgent'].includes(body.severity)
      ? body.severity
      : 'info';
    const targetType = ['all', 'user', 'role', 'status'].includes(body.target_type)
      ? body.target_type
      : 'all';
    const targetValue = targetType === 'all' ? null : cleanText(body.target_value, 100);
    const actionLabel = cleanText(body.action_label, 50) || null;
    const actionUrl = cleanText(body.action_url, 500) || null;
    const isBanner = body.is_banner ? 1 : 0;
    const sendTelegram = body.send_telegram ? 1 : 0;
    const expiresAt = body.expires_at ? cleanText(body.expires_at, 50) : null;

    if (!title) return res.status(400).json({ error: 'Notification title is required' });
    if (!message) return res.status(400).json({ error: 'Notification message is required' });
    if (targetType !== 'all' && !targetValue) {
      return res.status(400).json({ error: `Target value is required when target type is ${targetType}` });
    }

    try {
      const insertResult = await db.execute({
        sql: `
          INSERT INTO notifications (
            created_by, target_type, target_value, title, message,
            severity, action_label, action_url, is_banner, send_telegram, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          adminAuth.account.username,
          targetType,
          targetValue,
          title,
          message,
          severity,
          actionLabel,
          actionUrl,
          isBanner,
          sendTelegram,
          expiresAt
        ]
      });

      const notificationId = Number(insertResult.lastInsertRowid);

      // Handle Telegram dispatch asynchronously if requested
      if (sendTelegram === 1) {
        (async () => {
          try {
            let userSql = 'SELECT username FROM users WHERE telegram_chat_id IS NOT NULL AND telegram_chat_id != "" AND telegram_notifications = 1';
            const userArgs = [];

            if (targetType === 'user') {
              userSql += ' AND username = ?';
              userArgs.push(targetValue);
            } else if (targetType === 'role') {
              userSql += ' AND role = ?';
              userArgs.push(targetValue);
            } else if (targetType === 'status') {
              userSql += ' AND account_status = ?';
              userArgs.push(targetValue);
            }

            const recipientsResult = await db.execute({ sql: userSql, args: userArgs });
            const recipients = recipientsResult.rows;

            for (const recipient of recipients) {
              await sendTelegramNotification(
                recipient.username,
                {
                  type: 'admin_notification',
                  title,
                  message,
                  severity,
                  action_label: actionLabel,
                  action_url: actionUrl
                },
                { requireEnabled: true }
              );
            }
          } catch (tErr) {
            console.error('Background telegram notification dispatch error:', tErr);
          }
        })();
      }

      return res.status(201).json({
        success: true,
        id: notificationId
      });
    } catch (err) {
      console.error('Create notification error:', err);
      return res.status(500).json({ error: 'Could not create notification' });
    }
  }

  // ---------------------------------------------------------------
  // DELETE /api/notifications
  // - Admin revokes/deletes a notification
  // ---------------------------------------------------------------
  if (req.method === 'DELETE') {
    const adminAuth = await requireAdmin(req, res);
    if (!adminAuth) return;

    const body = getJsonBody(req);
    const id = Number(body.id || query.id);
    if (!id) return res.status(400).json({ error: 'Notification ID is required' });

    try {
      await db.execute({
        sql: 'DELETE FROM notifications WHERE id = ?',
        args: [id]
      });
      await db.execute({
        sql: 'DELETE FROM notification_reads WHERE notification_id = ?',
        args: [id]
      });
      return res.json({ success: true });
    } catch (err) {
      console.error('Delete notification error:', err);
      return res.status(500).json({ error: 'Could not delete notification' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
