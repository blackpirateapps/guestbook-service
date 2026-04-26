import CodeBlock from "../../components/CodeBlock.jsx";
import {
  makeLikesApiDocs,
  makeLikesUsageFetch,
  makeLikesUsageCurl,
  makeLikesResponseDocs,
} from "./snippets.js";

export default function LikesTab({
  origin,
  username,
  likesSummary,
  likesBusy,
  likesAction,     setLikesAction,
  likesPostUrl,    setLikesPostUrl,
  likesResult,
  runLikesRequest,
}) {
  const apiDocs      = makeLikesApiDocs(origin, username);
  const usageFetch   = makeLikesUsageFetch(origin, username);
  const usageCurl    = makeLikesUsageCurl(origin, username);
  const responseDocs = makeLikesResponseDocs(username);

  return (
    <>
      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Total Likes</div>
          <div className="stat-value">{likesBusy ? "—" : likesSummary.total_likes}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Liked Posts</div>
          <div className="stat-value">{likesBusy ? "—" : likesSummary.post_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Top Post Likes</div>
          <div className="stat-value">
            {likesBusy ? "—" : likesSummary.top_posts[0]?.likes || 0}
          </div>
        </div>
      </div>

      {/* Top posts */}
      <div className="panel-card">
        <div className="entries-header">
          <h3>Top Posts</h3>
        </div>
        {likesSummary.top_posts.length === 0 ? (
          <p className="text-muted">No likes recorded yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {likesSummary.top_posts.map((post) => (
              <div key={post.post_url} className="entry-card" style={{ marginBottom: 0 }}>
                <div className="entry-card-header">
                  <div className="entry-name" style={{ fontSize: "0.9375rem", wordBreak: "break-all" }}>
                    {post.post_url}
                  </div>
                  <div className="entry-metrics">♥ {post.likes || 0}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Likes API docs */}
      <div className="panel-card">
        <h3>Likes API</h3>
        <p className="text-muted">Single endpoint to add likes or fetch counts by post URL.</p>
        <CodeBlock code={apiDocs} rows={12} />
      </div>

      {/* Usage */}
      <div className="panel-card">
        <h3>How to Use</h3>
        <p className="text-muted">Use your post URL as the unique identifier. Summary and get actions are public.</p>

        <h4 style={{ marginTop: "1.25rem" }}>Fetch (Browser)</h4>
        <CodeBlock code={usageFetch} rows={14} />

        <h4 style={{ marginTop: "1.5rem" }}>cURL</h4>
        <CodeBlock code={usageCurl} rows={12} />

        <h4 style={{ marginTop: "1.5rem" }}>Response Format</h4>
        <CodeBlock code={responseDocs} rows={10} />

        <p className="text-muted text-sm mt-3">
          Rate limit: 5 seconds between likes and 50 likes per hour per IP per post.
        </p>
      </div>

      {/* Tester */}
      <div className="panel-card">
        <h3>API Tester</h3>
        <form onSubmit={runLikesRequest} style={{ marginBottom: "1rem" }}>
          <div className="form-group">
            <label htmlFor="likes-action">Action</label>
            <select
              id="likes-action"
              value={likesAction}
              onChange={(e) => setLikesAction(e.target.value)}
            >
              <option value="get">Get Likes</option>
              <option value="like">Add Like</option>
              <option value="summary">Summary</option>
            </select>
          </div>
          {(likesAction === "get" || likesAction === "like") && (
            <div className="form-group">
              <label htmlFor="likes-post-url">Post URL</label>
              <input
                id="likes-post-url"
                type="url"
                value={likesPostUrl}
                onChange={(e) => setLikesPostUrl(e.target.value)}
                placeholder="https://example.com/blog/my-post"
                required
              />
            </div>
          )}
          <button type="submit" disabled={likesBusy}>
            {likesBusy ? "Running..." : "Run"}
          </button>
        </form>
        <textarea
          className="code-textarea"
          rows={12}
          readOnly
          value={likesResult || "Run a test to see output."}
        />
      </div>
    </>
  );
}
