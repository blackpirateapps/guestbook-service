export default function SettingsTab({
  requireApproval,
  setRequireApproval,
  spamBlocklist,
  setSpamBlocklist,
  maxLinks,
  setMaxLinks,
  rateLimitCooldown,
  setRateLimitCooldown,
  rateLimitHourly,
  setRateLimitHourly,
  customCss,
  setCustomCss,
  customHtml,
  setCustomHtml,
  saveSettings,
}) {
  return (
    <>
      {/* Moderation & Spam Protection */}
      <div className="panel-card">
        <h3>Moderation & Spam Defense</h3>
        <p className="text-muted">
          Configure zero-friction spam heuristics, link quotas, and rate limiting thresholds.
        </p>

        <label className="checkbox-label" style={{ marginBottom: "1.25rem" }}>
          <input
            type="checkbox"
            checked={requireApproval}
            onChange={(e) => setRequireApproval(e.target.checked)}
          />
          Require manual approval for all new messages
        </label>

        <div className="dashboard-grid" style={{ marginBottom: "1.25rem" }}>
          <div className="form-group">
            <label htmlFor="max-links">
              Max Links Threshold (Auto-quarantine)
            </label>
            <input
              id="max-links"
              type="number"
              min="0"
              max="20"
              value={maxLinks ?? 2}
              onChange={(e) => setMaxLinks(Math.max(0, parseInt(e.target.value) || 0))}
            />
            <span className="text-muted" style={{ fontSize: "0.8125rem", marginTop: "4px", display: "block" }}>
              Messages with more URLs than this will automatically be sent to Pending moderation.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="rate-limit-cooldown">
              Rate Limit Cooldown: {rateLimitCooldown ?? 5}s
            </label>
            <input
              id="rate-limit-cooldown"
              type="range"
              min="2"
              max="30"
              step="1"
              value={rateLimitCooldown ?? 5}
              onChange={(e) => setRateLimitCooldown(parseInt(e.target.value) || 5)}
            />
            <span className="text-muted" style={{ fontSize: "0.8125rem", marginTop: "4px", display: "block" }}>
              Minimum seconds a visitor must wait between consecutive submissions.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="rate-limit-hourly">
              Hourly Limit per IP
            </label>
            <input
              id="rate-limit-hourly"
              type="number"
              min="1"
              max="100"
              value={rateLimitHourly ?? 10}
              onChange={(e) => setRateLimitHourly(Math.max(1, parseInt(e.target.value) || 10))}
            />
            <span className="text-muted" style={{ fontSize: "0.8125rem", marginTop: "4px", display: "block" }}>
              Maximum submissions allowed from a single IP address per hour.
            </span>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: "1.25rem" }}>
          <label htmlFor="spam-blocklist">
            Custom Keyword & Domain Blocklist
          </label>
          <textarea
            id="spam-blocklist"
            rows={4}
            value={spamBlocklist ?? ""}
            onChange={(e) => setSpamBlocklist(e.target.value)}
            placeholder="crypto, casino, viagra, t.me/, badlink.xyz (comma or newline separated)"
            className="code-textarea"
          />
          <span className="text-muted" style={{ fontSize: "0.8125rem", marginTop: "4px", display: "block" }}>
            Entries containing these terms will automatically be routed to Pending moderation.
          </span>
        </div>

        <div className="actions-row">
          <button onClick={saveSettings}>Save Moderation & Spam Settings</button>
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
