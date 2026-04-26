import CodeBlock from "../../components/CodeBlock.jsx";
import {
  generateCommentWidgetSnippet,
  generateCommentHtmlSnippet,
} from "./snippets.js";

const DEFAULT_SETTINGS = {
  fields: {
    name:  { show: true,  required: true  },
    email: { show: true,  required: true  },
    url:   { show: false, required: false },
  },
  allow_anonymous:   false,
  allow_likes:       true,
  require_approval:  false,
};

export default function CommentsTab({
  origin,
  commentSections,
  commentsBusy,
  editingSection,   setEditingSection,
  sectionName,      setSectionName,
  sectionSettings,  setSectionSettings,
  selectedSectionId, setSelectedSectionId,
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

        <div className="actions-row" style={{ marginTop: "2rem" }}>
          <button onClick={saveSection} disabled={commentsBusy}>
            {commentsBusy ? "Saving..." : "Save Section"}
          </button>
          <button className="secondary" onClick={() => setEditingSection(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  const selectedSection = commentSections.find((s) => s.id === selectedSectionId);

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

      {/* Integration */}
      {commentSections.length > 0 && (
        <div className="panel-card">
          <h3>Integration</h3>
          <div className="form-group">
            <label htmlFor="select-section">Select Section</label>
            <select
              id="select-section"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
            >
              <option value="">Choose a section...</option>
              {commentSections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {selectedSection && (
            <>
              <h4 style={{ marginTop: "1.25rem" }}>Embed Snippet</h4>
              <CodeBlock
                code={generateCommentWidgetSnippet(origin, selectedSection)}
                rows={8}
              />

              <h4 style={{ marginTop: "1.5rem" }}>Headless API (Custom Form)</h4>
              <CodeBlock
                code={generateCommentHtmlSnippet(origin, selectedSection)}
                rows={15}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
