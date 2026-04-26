export default function SubmissionsTab({
  forms,
  selectedFormId,    setSelectedFormId,
  submissions,
  submissionsBusy,
  expandedSubmission, setExpandedSubmission,
  fetchSubmissions,
  deleteSubmission,
  exportFormSubmissions,
}) {
  return (
    <div className="panel-card">
      <h3>Form Submissions</h3>
      <p className="text-muted">
        View and manage private submissions from your contact forms. Only you can access this data.
      </p>

      <div className="form-group">
        <label htmlFor="select-submissions-form">Select Form</label>
        <select
          id="select-submissions-form"
          value={selectedFormId}
          onChange={(e) => {
            setSelectedFormId(e.target.value);
            setExpandedSubmission(null);
          }}
        >
          <option value="">Choose a form...</option>
          {forms.map((form) => (
            <option key={form.id} value={form.id}>
              {form.name} ({form.submission_count || 0})
            </option>
          ))}
        </select>
      </div>

      {selectedFormId && (
        <div className="actions-row" style={{ marginTop: 0, marginBottom: "1rem" }}>
          <button
            className="secondary"
            onClick={() => fetchSubmissions(selectedFormId)}
            disabled={submissionsBusy}
          >
            Refresh
          </button>
          <button
            className="secondary"
            onClick={exportFormSubmissions}
            disabled={submissions.length === 0}
          >
            Export JSON
          </button>
        </div>
      )}

      {!selectedFormId ? (
        <p className="text-muted">Select a form above to view its submissions.</p>
      ) : submissionsBusy ? (
        <SubmissionsSkeleton />
      ) : submissions.length === 0 ? (
        <p className="text-muted">No submissions yet for this form.</p>
      ) : (
        <div className="submissions-list">
          {submissions.map((sub) => {
            const form = forms.find((f) => f.id === selectedFormId);
            const isExpanded = expandedSubmission === sub.id;
            return (
              <div key={sub.id} className="submission-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 0, padding: 0 }}>
                <div
                  className="submission-header"
                  onClick={() => setExpandedSubmission(isExpanded ? null : sub.id)}
                  style={{ padding: "12px 16px" }}
                >
                  <div className="submission-preview">
                    <span className="submission-id">#{sub.id}</span>
                    <span className="submission-summary">
                      {Object.values(sub.data).slice(0, 2).join(" — ").substring(0, 60)}
                      {Object.values(sub.data).slice(0, 2).join(" — ").length > 60 && "…"}
                    </span>
                  </div>
                  <span className="submission-date">
                    {new Date(sub.created_at).toLocaleString()}
                  </span>
                </div>

                {isExpanded && (
                  <div className="submission-details">
                    <table className="submission-table">
                      <tbody>
                        {form?.fields.map((field) => (
                          <tr key={field.name}>
                            <td className="submission-label">{field.label}</td>
                            <td className="submission-value">
                              {field.type === "checkbox"
                                ? sub.data[field.name] ? "Yes" : "No"
                                : sub.data[field.name] || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="submission-actions">
                      <button className="danger" onClick={() => deleteSubmission(sub.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubmissionsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" style={{ height: "52px", borderRadius: "8px" }} />
      ))}
    </div>
  );
}
