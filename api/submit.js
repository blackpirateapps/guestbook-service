import { db, initFormsTables, sendTelegramNotification } from './db.js';
import { assertAccountCanReceive } from './access.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function getJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         'unknown';
}

function validateSubmission(formFields, data) {
  const errors = [];

  for (const field of formFields) {
    const value = data[field.name];

    // Check required fields
    if (field.required) {
      if (value === undefined || value === null || value === '') {
        errors.push(`${field.label} is required`);
        continue;
      }
    }

    // Skip validation if field is empty and not required
    if (value === undefined || value === null || value === '') continue;

    // Type-specific validation
    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${field.label} must be a valid email address`);
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          errors.push(`${field.label} must be a valid URL`);
        }
        break;

      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`${field.label} must be a number`);
        }
        break;

      case 'phone':
        // Basic phone validation - allows digits, spaces, dashes, parentheses, plus
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(value)) {
          errors.push(`${field.label} must be a valid phone number`);
        }
        break;

      case 'select':
      case 'radio':
        if (field.options && !field.options.includes(value)) {
          errors.push(`${field.label} must be one of the available options`);
        }
        break;

      case 'checkbox':
        // Checkbox should be boolean or truthy/falsy
        break;

      case 'text':
      case 'textarea':
        // Text fields accept any string
        break;
    }
  }

  return errors;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Initialize tables on first request
  try {
    await initFormsTables();
  } catch (e) {
    // Tables might already exist, ignore
  }

  const { form } = req.query;

  if (!form) {
    return res.status(400).json({ error: 'Form ID is required. Use ?form=YOUR_FORM_ID' });
  }

  // Get the form definition
  let formData;
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM forms WHERE id = ?',
      args: [form]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    formData = result.rows[0];
    formData.fields = JSON.parse(formData.fields);

    const receiveAccess = await assertAccountCanReceive(formData.owner_username);
    if (!receiveAccess.ok) {
      return res.status(receiveAccess.status).json({ error: receiveAccess.error });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Database error' });
  }

  const body = getJsonBody(req);

  // Honeypot spam protection - if _honeypot field is filled, silently succeed
  if (body._honeypot) {
    return res.json({ success: true, message: 'Form submitted successfully' });
  }

  // Remove internal fields from submission data
  const { _honeypot, ...submissionData } = body;

  // Validate submission against form schema
  const validationErrors = validateSubmission(formData.fields, submissionData);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationErrors
    });
  }

  // Filter submission to only include defined fields
  const cleanData = {};
  for (const field of formData.fields) {
    if (submissionData[field.name] !== undefined) {
      cleanData[field.name] = submissionData[field.name];
    }
  }

  // Determine status based on form's moderation setting
  const status = formData.require_approval === 1 ? 'pending' : 'approved';
  const ipAddress = getClientIp(req);

  // Store the submission
  try {
    const result = await db.execute({
      sql: `INSERT INTO form_submissions (form_id, data, status, ip_address)
            VALUES (?, ?, ?, ?)`,
      args: [form, JSON.stringify(cleanData), status, ipAddress]
    });

    await sendTelegramNotification(formData.owner_username, {
      type: 'form',
      formName: formData.name,
      data: cleanData
    });

    return res.status(201).json({
      success: true,
      message: status === 'pending' 
        ? 'Form submitted successfully. Awaiting approval.'
        : 'Form submitted successfully',
      status
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to save submission' });
  }
}
