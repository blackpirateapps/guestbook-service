export default function DataTab({
  importFileRef,
  dataTransferBusy,
  exportAllData,
  importAllDataFromFile,
  importName,    setImportName,
  importWebsite, setImportWebsite,
  importDate,    setImportDate,
  importMessage, setImportMessage,
  addImportedEntry,
}) {
  return (
    <>
      {/* Backup */}
      <div className="panel-card">
        <h3>Data Backup</h3>
        <p className="text-muted">
          Export all your guestbook data as JSON, or import a previous export.
        </p>
        <div className="actions-row" style={{ marginTop: 0 }}>
          <button className="secondary" onClick={exportAllData} disabled={dataTransferBusy}>
            Export all data
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => importFileRef.current?.click()}
            disabled={dataTransferBusy}
          >
            Import JSON
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={importAllDataFromFile}
          />
        </div>
        <p className="text-muted text-sm mt-3">
          Import replaces your current entries and appearance settings.
        </p>
      </div>

      {/* Manual Import */}
      <div className="panel-card">
        <h3>Add Past Entry</h3>
        <p className="text-muted">Manually import entries from an older guestbook.</p>
        <form onSubmit={addImportedEntry} style={{ marginBottom: 0 }}>
          <div className="dashboard-grid">
            <div className="form-group">
              <label htmlFor="import-name">Name *</label>
              <input
                id="import-name"
                type="text"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="import-website">Website (optional)</label>
              <input
                id="import-website"
                type="url"
                value={importWebsite}
                onChange={(e) => setImportWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="import-date">Date *</label>
            <input
              id="import-date"
              type="datetime-local"
              value={importDate}
              onChange={(e) => setImportDate(e.target.value)}
              required
              style={{ maxWidth: "300px" }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="import-message">Message *</label>
            <textarea
              id="import-message"
              rows={4}
              value={importMessage}
              onChange={(e) => setImportMessage(e.target.value)}
              placeholder="Write the original message..."
              required
            />
          </div>
          <button type="submit" className="secondary">Add entry</button>
        </form>
      </div>
    </>
  );
}
