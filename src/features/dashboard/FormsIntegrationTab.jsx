import CodeBlock from "../../components/CodeBlock.jsx";
import { generateFormHtmlSnippet } from "./snippets.js";

export default function FormsIntegrationTab({
  origin,
  forms,
  selectedFormId,
  setSelectedFormId,
}) {
  const getFormEndpoint = (id) => `${origin}/api/submit?form=${id}`;
  const selectedForm    = forms.find((f) => f.id === selectedFormId);

  return (
    <div className="panel-card">
      <h3>Form Integration</h3>
      <p className="text-muted">
        Select a form to get its API endpoint and ready-to-use HTML snippet.
      </p>

      <div className="form-group">
        <label htmlFor="integ-select-form">Select Form</label>
        <select
          id="integ-select-form"
          value={selectedFormId}
          onChange={(e) => setSelectedFormId(e.target.value)}
        >
          <option value="">Choose a form…</option>
          {forms.map((form) => (
            <option key={form.id} value={form.id}>
              {form.name}
            </option>
          ))}
        </select>
      </div>

      {selectedForm && (
        <>
          <div className="form-group" style={{ marginTop: "1.25rem" }}>
            <label>API Endpoint</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                readOnly
                value={getFormEndpoint(selectedFormId)}
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}
              />
            </div>
            <p className="text-muted text-sm mt-1">
              POST JSON data to this endpoint from any website or tool.
            </p>
          </div>

          <h4 style={{ marginTop: "1.5rem" }}>HTML Form Snippet</h4>
          <CodeBlock
            code={generateFormHtmlSnippet(origin, selectedForm)}
            rows={22}
          />
        </>
      )}

      {forms.length === 0 && (
        <p className="text-muted mt-3">
          No forms yet. Go to the Form Builder tab to create your first form.
        </p>
      )}
    </div>
  );
}
