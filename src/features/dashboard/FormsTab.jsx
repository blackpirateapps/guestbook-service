const FIELD_TYPES = [
  { value: "text",     label: "Text" },
  { value: "email",    label: "Email" },
  { value: "textarea", label: "Textarea" },
  { value: "number",   label: "Number" },
  { value: "phone",    label: "Phone" },
  { value: "url",      label: "URL" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select",   label: "Dropdown" },
  { value: "radio",    label: "Radio Buttons" },
];

export function makeField(field = {}) {
  return {
    _id:
      field._id ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    name: field.name || "",
    label: field.label || "",
    type: field.type || "text",
    required: field.required === true,
    options: Array.isArray(field.options) ? field.options : undefined,
  };
}

export default function FormsTab({
  forms,
  formsBusy,
  editingForm,
  formName,      setFormName,
  formFields,    setFormFields,
  startNewForm,
  startEditForm,
  cancelFormEdit,
  addField,
  updateField,
  removeField,
  moveField,
  saveForm,
  deleteForm,
}) {

  if (editingForm) {
    return (
      <div className="panel-card">
        <h3>{editingForm === "new" ? "Create New Form" : "Edit Form"}</h3>
        <p className="text-muted">Define your form fields. Each field will be validated on submission.</p>

        <div className="form-group">
          <label htmlFor="form-name">Form Name *</label>
          <input
            id="form-name"
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Contact Form"
          />
        </div>

        {/* Field List */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <label style={{ margin: 0 }}>Fields</label>
            <button className="secondary" onClick={addField} style={{ padding: "5px 12px", fontSize: "0.8125rem" }}>
              + Add Field
            </button>
          </div>

          {formFields.map((field, index) => (
            <div key={field._id} className="field-editor">
              <div className="field-editor-row">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Field Label"
                  style={{ flex: 2 }}
                />
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateField(index, { name: e.target.value })}
                  placeholder="api_key"
                  style={{ flex: 1 }}
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(index, { type: e.target.value })}
                  style={{ flex: 1 }}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <label className="checkbox-label" style={{ flex: 0, whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                  />
                  Req.
                </label>
                <div className="field-editor-actions">
                  <button className="secondary" onClick={() => moveField(index, -1)} disabled={index === 0} title="Move up">↑</button>
                  <button className="secondary" onClick={() => moveField(index, 1)} disabled={index === formFields.length - 1} title="Move down">↓</button>
                  <button className="danger" onClick={() => removeField(index)} title="Remove">✕</button>
                </div>
              </div>
              {(field.type === "select" || field.type === "radio") && (
                <div style={{ marginTop: "0.5rem" }}>
                  <input
                    type="text"
                    value={(field.options || []).join(", ")}
                    onChange={(e) =>
                      updateField(index, {
                        options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Options (comma separated): Option 1, Option 2, Option 3"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Preview */}
        <h4 style={{ marginTop: "1rem", marginBottom: "0.75rem" }}>Preview</h4>
        <div className="form-preview">
          {formFields.map((field, i) => (
            <div key={i} className="form-group" style={{ marginBottom: "0.75rem" }}>
              <label>
                {field.label}
                {field.required && <span style={{ color: "var(--color-danger)" }}> *</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea rows={3} disabled placeholder={`Enter ${field.label.toLowerCase()}...`} />
              ) : field.type === "checkbox" ? (
                <label className="checkbox-label"><input type="checkbox" disabled /> {field.label}</label>
              ) : field.type === "select" ? (
                <select disabled>
                  <option>Select {field.label.toLowerCase()}...</option>
                  {(field.options || []).map((opt, j) => <option key={j}>{opt}</option>)}
                </select>
              ) : field.type === "radio" ? (
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {(field.options || []).map((opt, j) => (
                    <label key={j} className="checkbox-label">
                      <input type="radio" name={`preview_${field.name}`} disabled /> {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <input type={field.type === "phone" ? "tel" : field.type} disabled placeholder={`Enter ${field.label.toLowerCase()}...`} />
              )}
            </div>
          ))}
          <button disabled style={{ opacity: 0.6 }}>Submit</button>
        </div>

        <div className="actions-row" style={{ marginTop: "1.5rem" }}>
          <button onClick={saveForm} disabled={formsBusy}>
            {formsBusy ? "Saving..." : editingForm === "new" ? "Create Form" : "Save Changes"}
          </button>
          <button className="secondary" onClick={cancelFormEdit}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Forms List */}
      <div className="panel-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: 0 }}>Contact Forms</h3>
            <p className="text-muted text-sm mt-1">Create custom forms for external websites</p>
          </div>
          <button onClick={startNewForm}>+ New Form</button>
        </div>

        {forms.length === 0 ? (
          <p className="text-muted">No forms yet. Click "New Form" to create your first contact form.</p>
        ) : (
          <div className="forms-list">
            {forms.map((form) => (
              <div key={form.id} className="form-item">
                <div className="form-item-info">
                  <div className="form-item-name">{form.name}</div>
                  <div className="form-item-meta">
                    {form.fields.length} fields · {form.submission_count || 0} submissions
                  </div>
                </div>
                <div className="form-item-actions">
                  <button className="secondary" onClick={() => startEditForm(form)}>Edit</button>
                  <button className="danger" onClick={() => deleteForm(form.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
