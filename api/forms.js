import { db, initFormsTables } from './db.js';
import { requireActiveUser } from './access.js';

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

function generateFormId() {
  // Generate a short unique ID (8 chars)
  return Math.random().toString(36).substring(2, 10);
}

const VALID_FIELD_TYPES = ['text', 'email', 'textarea', 'checkbox', 'number', 'phone', 'url', 'select', 'radio'];

function validateFields(fields) {
  if (!Array.isArray(fields)) return { valid: false, error: 'Fields must be an array' };
  if (fields.length === 0) return { valid: false, error: 'At least one field is required' };
  if (fields.length > 20) return { valid: false, error: 'Maximum 20 fields allowed' };

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (!field.name || typeof field.name !== 'string') {
      return { valid: false, error: `Field ${i + 1}: name is required` };
    }
    if (!field.label || typeof field.label !== 'string') {
      return { valid: false, error: `Field ${i + 1}: label is required` };
    }
    if (!field.type || !VALID_FIELD_TYPES.includes(field.type)) {
      return { valid: false, error: `Field ${i + 1}: invalid type. Must be one of: ${VALID_FIELD_TYPES.join(', ')}` };
    }
    // Validate options for select/radio
    if ((field.type === 'select' || field.type === 'radio') && (!Array.isArray(field.options) || field.options.length === 0)) {
      return { valid: false, error: `Field ${i + 1}: select/radio fields require options array` };
    }
  }

  return { valid: true };
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

  // All form management requires authentication
  const auth = await requireActiveUser(req, res);
  if (!auth) return;

  const username = auth.account.username;

  // --------------------------------------------
  // 1. GET: List user's forms
  // --------------------------------------------
  if (method === 'GET') {
    const { id } = req.query;

    // Get single form by ID
    if (id) {
      try {
        const result = await db.execute({
          sql: 'SELECT * FROM forms WHERE id = ? AND owner_username = ?',
          args: [id, username]
        });
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Form not found' });
        }
        const form = result.rows[0];
        form.fields = JSON.parse(form.fields);
        return res.json(form);
      } catch (e) {
        return res.status(500).json({ error: 'Database error' });
      }
    }

    // Get all forms with submission counts
    try {
      const result = await db.execute({
        sql: `SELECT f.*, 
              (SELECT COUNT(*) FROM form_submissions WHERE form_id = f.id) as submission_count
              FROM forms f 
              WHERE f.owner_username = ? 
              ORDER BY f.created_at DESC`,
        args: [username]
      });
      const forms = result.rows.map(form => ({
        ...form,
        fields: JSON.parse(form.fields)
      }));
      return res.json(forms);
    } catch (e) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // --------------------------------------------
  // 2. POST: Create new form
  // --------------------------------------------
  if (method === 'POST') {
    const body = getJsonBody(req);
    const { name, fields, require_approval } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Form name is required' });
    }

    const validation = validateFields(fields);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const formId = generateFormId();

    try {
      await db.execute({
        sql: `INSERT INTO forms (id, owner_username, name, fields, require_approval)
              VALUES (?, ?, ?, ?, ?)`,
        args: [formId, username, name.trim(), JSON.stringify(fields), require_approval ? 1 : 0]
      });

      return res.status(201).json({
        success: true,
        id: formId,
        name: name.trim(),
        fields,
        require_approval: require_approval ? 1 : 0
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to create form' });
    }
  }

  // --------------------------------------------
  // 3. PUT: Update form
  // --------------------------------------------
  if (method === 'PUT') {
    const body = getJsonBody(req);
    const { id, name, fields, require_approval } = body;

    if (!id) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // Verify ownership
    const existing = await db.execute({
      sql: 'SELECT * FROM forms WHERE id = ? AND owner_username = ?',
      args: [id, username]
    });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Build update query dynamically
    const updates = [];
    const args = [];

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Form name cannot be empty' });
      }
      updates.push('name = ?');
      args.push(name.trim());
    }

    if (fields !== undefined) {
      const validation = validateFields(fields);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      updates.push('fields = ?');
      args.push(JSON.stringify(fields));
    }

    if (require_approval !== undefined) {
      updates.push('require_approval = ?');
      args.push(require_approval ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    args.push(id, username);

    try {
      await db.execute({
        sql: `UPDATE forms SET ${updates.join(', ')} WHERE id = ? AND owner_username = ?`,
        args
      });

      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to update form' });
    }
  }

  // --------------------------------------------
  // 4. DELETE: Delete form
  // --------------------------------------------
  if (method === 'DELETE') {
    const body = getJsonBody(req);
    const { id } = body;

    if (!id) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    try {
      // Delete submissions first (in case ON DELETE CASCADE doesn't work)
      await db.execute({
        sql: 'DELETE FROM form_submissions WHERE form_id = ?',
        args: [id]
      });

      // Delete the form
      const result = await db.execute({
        sql: 'DELETE FROM forms WHERE id = ? AND owner_username = ?',
        args: [id, username]
      });

      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to delete form' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
