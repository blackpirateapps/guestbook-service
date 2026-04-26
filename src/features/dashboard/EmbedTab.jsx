import CodeBlock from "../../components/CodeBlock.jsx";
import {
  makeEmbedSnippet,
  makeHeadlessSubmitSnippet,
  makeHeadlessReplySnippet,
  makeHeadlessLikeSnippet,
  makeHeadlessWidgetSnippet,
  makeHeadlessApiDocs,
  HEADLESS_CSS_EXAMPLE,
} from "./snippets.js";

export default function EmbedTab({
  origin,
  username,
  embedCssUrl,
  setEmbedCssUrl,
  saveSettings,
}) {
  const embedSnippet        = makeEmbedSnippet(origin, username);
  const submitSnippet       = makeHeadlessSubmitSnippet(origin, username);
  const replySnippet        = makeHeadlessReplySnippet(origin, username);
  const likeSnippet         = makeHeadlessLikeSnippet(origin);
  const widgetSnippet       = makeHeadlessWidgetSnippet(origin, username);
  const apiDocs             = makeHeadlessApiDocs(origin, username);
  const embedSrc            = origin && username ? `${origin}/u/${username}?embed=1` : "";

  return (
    <>
      {/* iFrame embed */}
      <div className="panel-card">
        <h3>Embed on your site</h3>
        <p className="text-muted">Paste this snippet into any HTML page to embed your guestbook.</p>

        <CodeBlock code={embedSnippet || "Loading..."} rows={12} />

        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label htmlFor="embed-css-url">Embed CSS URL (optional)</label>
          <input
            id="embed-css-url"
            type="url"
            placeholder="https://example.com/embed.css"
            value={embedCssUrl}
            onChange={(e) => setEmbedCssUrl(e.target.value)}
          />
          <p className="text-muted text-sm mt-1">
            This stylesheet loads inside the iframe so you can style the embed independently.
          </p>
        </div>

        <div className="actions-row">
          {embedSrc && (
            <a href={embedSrc} target="_blank" rel="noreferrer">
              <button className="secondary" type="button">↗ Preview embed</button>
            </a>
          )}
          <button onClick={saveSettings}>Save Embed Settings</button>
        </div>
      </div>

      {/* Headless API */}
      <div className="panel-card">
        <h3>Headless API</h3>
        <p className="text-muted">Build your own UI with the API. Supports cross-origin requests.</p>

        <h4 style={{ marginTop: "1.25rem" }}>Custom form</h4>
        <CodeBlock code={submitSnippet || "Loading..."} rows={10} />

        <h4 style={{ marginTop: "1.5rem" }}>Reply to entry</h4>
        <CodeBlock code={replySnippet || "Loading..."} rows={10} />

        <h4 style={{ marginTop: "1.5rem" }}>Like an entry</h4>
        <CodeBlock code={likeSnippet || "Loading..."} rows={8} />

        <h4 style={{ marginTop: "1.5rem" }}>Widget renderer</h4>
        <CodeBlock code={widgetSnippet || "Loading..."} rows={7} />

        <h4 style={{ marginTop: "1.5rem" }}>Example CSS</h4>
        <CodeBlock code={HEADLESS_CSS_EXAMPLE} rows={10} />

        <h4 style={{ marginTop: "1.5rem" }}>API reference</h4>
        <CodeBlock code={apiDocs || "Loading..."} rows={18} />
      </div>
    </>
  );
}
