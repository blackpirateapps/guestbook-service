export default function SettingsTab({
  requireApproval,
  setRequireApproval,
  customCss,
  setCustomCss,
  customHtml,
  setCustomHtml,
  saveSettings,
}) {
  return (
    <>
      {/* Moderation */}
      <div className="panel-card">
        <h3>Moderation</h3>
        <p className="text-muted">Control how new messages appear on your guestbook.</p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={requireApproval}
            onChange={(e) => setRequireApproval(e.target.checked)}
          />
          Require approval for new messages
        </label>
        <div className="actions-row" style={{ marginTop: "1rem" }}>
          <button onClick={saveSettings}>Save Moderation</button>
        </div>
      </div>

      {/* Appearance */}
      <div className="panel-card">
        <h3>Customize Appearance</h3>
        <p className="text-muted">
          Inject custom CSS and HTML into your public guestbook page.
        </p>
        <div className="dashboard-grid">
          <div className="form-group">
            <label htmlFor="custom-css">Custom CSS</label>
            <textarea
              id="custom-css"
              rows={7}
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              placeholder="/* Add styles here */"
              className="code-textarea"
            />
          </div>
          <div className="form-group">
            <label htmlFor="custom-html">Custom HTML header</label>
            <textarea
              id="custom-html"
              rows={7}
              value={customHtml}
              onChange={(e) => setCustomHtml(e.target.value)}
              placeholder="<!-- Add HTML here -->"
              className="code-textarea"
            />
          </div>
        </div>
        <div className="actions-row">
          <button onClick={saveSettings}>Save Appearance</button>
        </div>
      </div>
    </>
  );
}
