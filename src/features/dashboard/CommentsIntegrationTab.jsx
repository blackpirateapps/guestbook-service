import CodeBlock from "../../components/CodeBlock.jsx";
import {
  generateCommentWidgetSnippet,
  generateCommentHtmlSnippet,
} from "./snippets.js";

export default function CommentsIntegrationTab({
  origin,
  commentSections,
  selectedSectionId,
  setSelectedSectionId,
}) {
  const selectedSection = commentSections.find((s) => s.id === selectedSectionId);

  return (
    <div className="panel-card">
      <h3>Comment Section Integration</h3>
      <p className="text-muted">
        Select a section to get the embed snippet and headless API code.
      </p>

      <div className="form-group">
        <label htmlFor="comment-integ-section">Select Section</label>
        <select
          id="comment-integ-section"
          value={selectedSectionId}
          onChange={(e) => setSelectedSectionId(e.target.value)}
        >
          <option value="">Choose a section…</option>
          {commentSections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSection && (
        <>
          <h4 style={{ marginTop: "1.5rem" }}>Widget Embed Snippet</h4>
          <CodeBlock
            code={generateCommentWidgetSnippet(origin, selectedSection)}
            rows={8}
          />

          <h4 style={{ marginTop: "1.5rem" }}>Headless API (Custom Form)</h4>
          <CodeBlock
            code={generateCommentHtmlSnippet(origin, selectedSection)}
            rows={16}
          />
        </>
      )}

      {commentSections.length === 0 && (
        <p className="text-muted mt-3">
          No comment sections yet. Go to the Sections tab to create one.
        </p>
      )}
    </div>
  );
}
