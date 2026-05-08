import { db, initFormsTables } from './db.js';
import { requireActiveUser } from './access.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
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

  // Initialize tables on first request
  try {
    await initFormsTables();
  } catch (e) {
    // Tables might already exist, ignore
  }

  const { method } = req;

  // All submission management requires authentication
  const auth = await requireActiveUser(req, res);
  if (!auth) return;

  const username = auth.account.username;

  // --------------------------------------------
  // 1. GET: List submissions for a form
  // --------------------------------------------
  if (method === 'GET') {
    const { form, export: exportData } = req.query;

    if (!form) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // Verify form ownership
    const formResult = await db.execute({
      sql: 'SELECT * FROM forms WHERE id = ? AND owner_username = ?',
      args: [form, username]
    });

    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const formData = formResult.rows[0];
    formData.fields = JSON.parse(formData.fields);

    try {
      const result = await db.execute({
        sql: `SELECT * FROM form_submissions 
              WHERE form_id = ? 
              ORDER BY created_at DESC`,
        args: [form]
      });

      const submissions = result.rows.map(sub => ({
        ...sub,
        data: JSON.parse(sub.data)
      }));

      // Export mode - return full data structure
      if (exportData === '1') {
        return res.json({
          version: 1,
          exported_at: new Date().toISOString(),
          form: {
            id: formData.id,
            name: formData.name,
            fields: formData.fields,
            require_approval: formData.require_approval
          },
          submissions
        });
      }

      return res.json(submissions);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // --------------------------------------------
  // 2. PUT: Approve or reject submission
  // --------------------------------------------
  if (method === 'PUT') {
    const body = getJsonBody(req);
    const { id, action } = body;

    if (!id) {
      return res.status(400).json({ error: 'Submission ID is required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }

    // Verify submission belongs to a form owned by the user
    const subResult = await db.execute({
      sql: `SELECT fs.* FROM form_submissions fs
            JOIN forms f ON fs.form_id = f.id
            WHERE fs.id = ? AND f.owner_username = ?`,
      args: [id, username]
    });

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    try {
      if (action === 'approve') {
        await db.execute({
          sql: "UPDATE form_submissions SET status = 'approved' WHERE id = ?",
          args: [id]
        });
      } else {
        // Reject = delete
        await db.execute({
          sql: 'DELETE FROM form_submissions WHERE id = ?',
          args: [id]
        });
      }

      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to update submission' });
    }
  }

  // --------------------------------------------
  // 3. DELETE: Delete submission
  // --------------------------------------------
  if (method === 'DELETE') {
    const body = getJsonBody(req);
    const { id } = body;

    if (!id) {
      return res.status(400).json({ error: 'Submission ID is required' });
    }

    // Verify submission belongs to a form owned by the user
    const subResult = await db.execute({
      sql: `SELECT fs.* FROM form_submissions fs
            JOIN forms f ON fs.form_id = f.id
            WHERE fs.id = ? AND f.owner_username = ?`,
      args: [id, username]
    });

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    try {
      await db.execute({
        sql: 'DELETE FROM form_submissions WHERE id = ?',
        args: [id]
      });

      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to delete submission' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
