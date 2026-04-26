export default function TesterTab({
  origin,
  testerBaseUrl, setTesterBaseUrl,
  testerName,    setTesterName,
  testerWebsite, setTesterWebsite,
  testerMessage, setTesterMessage,
  testerIsPrivate, setTesterIsPrivate,
  testerReplyParentId, setTesterReplyParentId,
  testerLikeId, setTesterLikeId,
  testerResult,
  testerBusy,
  testCreateEntry,
  testCreateReply,
  testLikeEntry,
}) {
  return (
    <div className="panel-card">
      <h3>API Tester</h3>
      <p className="text-muted">Test entry, reply, and like calls against your endpoint.</p>

      <div className="form-group">
        <label htmlFor="tester-base-url">Base URL</label>
        <input
          id="tester-base-url"
          type="url"
          placeholder="https://your-app.vercel.app"
          value={testerBaseUrl}
          onChange={(e) => setTesterBaseUrl(e.target.value)}
        />
      </div>

      <div className="tester-grid" style={{ marginTop: "1rem" }}>
        {/* Test Entry */}
        <div className="tester-card">
          <h4>Test Entry (POST)</h4>
          <form onSubmit={testCreateEntry} style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label htmlFor="test-name">Name *</label>
              <input
                id="test-name"
                type="text"
                value={testerName}
                onChange={(e) => setTesterName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="test-website">Website</label>
              <input
                id="test-website"
                type="url"
                value={testerWebsite}
                onChange={(e) => setTesterWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="test-message">Message *</label>
              <textarea
                id="test-message"
                rows={3}
                value={testerMessage}
                onChange={(e) => setTesterMessage(e.target.value)}
                required
              />
            </div>
            <label className="checkbox-label" style={{ marginBottom: "0.75rem" }}>
              <input
                type="checkbox"
                checked={testerIsPrivate}
                onChange={(e) => setTesterIsPrivate(e.target.checked)}
              />
              Private message
            </label>
            <button type="submit" disabled={testerBusy}>
              {testerBusy ? "Running..." : "Run entry test"}
            </button>
          </form>
        </div>

        {/* Test Reply */}
        <div className="tester-card">
          <h4>Test Reply (POST)</h4>
          <form onSubmit={testCreateReply} style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label htmlFor="test-reply-id">Parent Entry ID *</label>
              <input
                id="test-reply-id"
                type="text"
                inputMode="numeric"
                value={testerReplyParentId}
                onChange={(e) => setTesterReplyParentId(e.target.value)}
                placeholder="123"
                required
              />
            </div>
            <p className="text-muted text-sm" style={{ marginBottom: "0.75rem" }}>
              Uses name / website / message from the entry test fields.
            </p>
            <button type="submit" disabled={testerBusy}>
              {testerBusy ? "Running..." : "Run reply test"}
            </button>
          </form>
        </div>
      </div>

      {/* Test Like */}
      <div className="tester-card" style={{ marginTop: "1rem" }}>
        <h4>Test Like (PUT)</h4>
        <form onSubmit={testLikeEntry} style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label htmlFor="test-like-id">Entry ID *</label>
              <input
                id="test-like-id"
                type="text"
                inputMode="numeric"
                value={testerLikeId}
                onChange={(e) => setTesterLikeId(e.target.value)}
                placeholder="123"
                required
              />
            </div>
            <button type="submit" disabled={testerBusy} style={{ marginBottom: 0 }}>
              {testerBusy ? "Running..." : "Run like test"}
            </button>
          </div>
        </form>
      </div>

      <h4 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>Output</h4>
      <textarea
        className="code-textarea"
        rows={14}
        readOnly
        value={testerResult || "Run a test to see output."}
      />
    </div>
  );
}
