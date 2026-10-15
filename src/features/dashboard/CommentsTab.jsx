
const DEFAULT_SETTINGS = {
  fields: {
    name:  { show: true,  required: true  },
    email: { show: true,  required: true  },
    url:   { show: false, required: false },
  },
  allow_anonymous:   false,
  allow_likes:       true,
  require_approval:  false,
  spam: {
    max_links: 2,
    cooldown_seconds: 5,
    hourly_limit: 10,
    blocklist: ""
  }
};

export default function CommentsTab({
  commentSections,
  commentsBusy,
  editingSection,   setEditingSection,
  sectionName,      setSectionName,
  sectionSettings,  setSectionSettings,
  startNewSection,
  startEditSection,
  saveSection,
  deleteSection,
}) {
  function updateFieldConfig(fieldKey, updates) {
    setSectionSettings((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldKey]: { ...prev.fields[fieldKey], ...updates },
      },
    }));
  }

  const FIELD_CONFIGS = [
    { key: "name",  label: "Name Field" },
    { key: "email", label: "Email Field" },
    { key: "url",   label: "URL Field" },
  ];

  if (editingSection) {
    return (
      <div className="panel-card">
        <h3>{editingSection === "new" ? "New Comment Section" : "Edit Section"}</h3>

        <div className="form-group">
          <label htmlFor="section-name">Section Name</label>
          <input
            id="section-name"
            type="text"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            placeholder="Blog Post Comments"
          />
        </div>

        <h4 style={{ marginTop: "1.5rem" }}>Field Configuration</h4>
        <div className="dashboard-grid">
          {FIELD_CONFIGS.map(({ key, label }) => (
            <div key={key} className="card" style={{ padding: "1rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9375rem" }}>{label}</div>
              <label className="checkbox-label" style={{ marginBottom: "6px" }}>
                <input
                  type="checkbox"
                  checked={sectionSettings.fields[key].show}
                  onChange={(e) => updateFieldConfig(key, { show: e.target.checked })}
                />
                Show
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={sectionSettings.fields[key].required}
                  onChange={(e) => updateFieldConfig(key, { required: e.target.checked })}
                  disabled={!sectionSettings.fields[key].show}
                />
                Required
              </label>
            </div>
          ))}
        </div>

        <h4 style={{ marginTop: "1.5rem" }}>Behavior</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { key: "allow_anonymous",  label: "Allow Anonymous Comments" },
            { key: "allow_likes",      label: "Enable Likes" },
            { key: "require_approval", label: "Require Approval" },
          ].map(({ key, label }) => (
            <label key={key} className="checkbox-label">
              <input
                type="checkbox"
                checked={sectionSettings[key]}
                onChange={(e) => setSectionSettings((p) => ({ ...p, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>

        <h4 style={{ marginTop: "1.5rem" }}>Spam Defense & Moderation</h4>
        <div className="dashboard-grid">
          <div className="form-group">
            <label htmlFor="sec-max-links">Max Links (Auto-quarantine)</label>
            <input
              id="sec-max-links"
              type="number"
              min="0"
              max="20"
              value={sectionSettings.spam?.max_links ?? 2}
              onChange={(e) =>
                setSectionSettings((p) => ({
                  ...p,
                  spam: { ...(p.spam || {}), max_links: Math.max(0, parseInt(e.target.value) || 0) },
                }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="sec-cooldown">Cooldown (Seconds)</label>
            <input
              id="sec-cooldown"
              type="number"
              min="1"
              max="60"
              value={sectionSettings.spam?.cooldown_seconds ?? 5}
              onChange={(e) =>
                setSectionSettings((p) => ({
                  ...p,
                  spam: { ...(p.spam || {}), cooldown_seconds: Math.max(1, parseInt(e.target.value) || 5) },
                }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="sec-hourly">Hourly Limit per IP</label>
            <input
              id="sec-hourly"
              type="number"
              min="1"
              max="100"
              value={sectionSettings.spam?.hourly_limit ?? 10}
              onChange={(e) =>
                setSectionSettings((p) => ({
                  ...p,
                  spam: { ...(p.spam || {}), hourly_limit: Math.max(1, parseInt(e.target.value) || 10) },
                }))
              }
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: "0.75rem" }}>
          <label htmlFor="sec-blocklist">Section Blocklist Keywords</label>
          <input
            id="sec-blocklist"
            type="text"
            placeholder="crypto, casino, viagra (comma separated)"
            value={sectionSettings.spam?.blocklist ?? ""}
            onChange={(e) =>
              setSectionSettings((p) => ({
                ...p,
                spam: { ...(p.spam || {}), blocklist: e.target.value },
              }))
            }
          />
        </div>

        <div className="actions-row" style={{ marginTop: "2rem" }}>
          <button onClick={saveSection} disabled={commentsBusy}>
            {commentsBusy ? "Saving..." : "Save Section"}
          </button>
          <button className="secondary" onClick={() => setEditingSection(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Section List */}
      <div className="panel-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>Comment Sections</h3>
          <button onClick={startNewSection}>+ New Section</button>
        </div>

        {commentSections.length === 0 ? (
          <p className="text-muted">No comment sections yet.</p>
        ) : (
          <div className="forms-list">
            {commentSections.map((s) => (
              <div key={s.id} className="form-item">
                <div className="form-item-info">
                  <div className="form-item-name">{s.name}</div>
                  <div className="form-item-meta">{s.comment_count || 0} comments</div>
                </div>
                <div className="form-item-actions">
                  <button className="secondary" onClick={() => startEditSection(s)}>Edit</button>
                  <button className="danger"    onClick={() => deleteSection(s.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
