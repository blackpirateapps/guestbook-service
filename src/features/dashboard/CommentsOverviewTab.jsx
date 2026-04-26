import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";

function useDarkMode() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function chartColors(dark) {
  return {
    bar:     dark ? "#4da3ff" : "#0075de",
    barPend: dark ? "#f59242" : "#dd5b00",
    grid:    dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    text:    dark ? "#a09b96" : "#615d59",
    tooltip: dark ? "#2a2826" : "#ffffff",
  };
}

function CommentCard({ comment, onApprove, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const preview = (comment.comment_text || "").slice(0, 100);

  return (
    <div
      className="entry-card"
      style={{ marginBottom: "var(--space-2)", marginLeft: comment.parent_id ? "2rem" : 0 }}
    >
      <div
        className="entry-card-header"
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="entry-title-row">
          <div className="entry-name">
            {comment.sender_name || "Anonymous"}
            <span className="badge-group">
              {comment.status === "pending" && (
                <span className="badge pending">Pending</span>
              )}
              {comment.is_owner === 1 && (
                <span className="badge owner">Owner</span>
              )}
            </span>
          </div>
          {comment.sectionName && (
            <span
              className="badge"
              style={{
                background: "var(--color-bg-alt)",
                color: "var(--color-text-muted)",
                borderColor: "var(--border-color)",
                fontSize: "0.7rem",
              }}
            >
              {comment.sectionName}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <span className="entry-date">{new Date(comment.created_at).toLocaleString()}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      <div className="entry-content" style={{ fontSize: "0.9375rem" }}>
        {expanded ? comment.comment_text : preview}
        {!expanded && comment.comment_text?.length > 100 && "…"}
      </div>

      <div className="entry-actions">
        {comment.status === "pending" && onApprove && (
          <button onClick={(e) => { e.stopPropagation(); onApprove(comment.id); }}>
            ✓ Approve
          </button>
        )}
        {onDelete && (
          <button
            className="danger"
            onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
          >
            Delete
          </button>
        )}
      </div>

      {expanded && comment.page_url && (
        <div style={{ padding: "0 1rem 0.75rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          From:{" "}
          <a href={comment.page_url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
            {comment.page_url}
          </a>
        </div>
      )}
    </div>
  );
}

export default function CommentsOverviewTab({
  commentSections,
  overviewComments,
  overviewCommentsLoading,
  approveComment,
  deleteComment,
}) {
  const dark   = useDarkMode();
  const colors = chartColors(dark);

  const totalComments  = commentSections.reduce((s, sec) => s + (sec.comment_count || 0), 0);
  const pendingCount   = overviewComments.filter((c) => c.status === "pending").length;

  const chartData = commentSections.map((s) => ({
    name:     s.name.length > 14 ? s.name.slice(0, 12) + "…" : s.name,
    comments: s.comment_count || 0,
  }));

  return (
    <>
      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Sections</div>
          <div className="stat-value">{commentSections.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Comments</div>
          <div className="stat-value">{totalComments}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Approval</div>
          <div className="stat-value" style={{ color: pendingCount > 0 ? "var(--color-warning)" : undefined }}>
            {pendingCount}
          </div>
        </div>
      </div>

      {/* Chart */}
      {commentSections.length > 0 && (
        <div className="panel-card" style={{ marginBottom: "var(--space-4)" }}>
          <h3 style={{ marginBottom: "1.25rem" }}>Comments by Section</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: colors.text }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: colors.text }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: colors.tooltip,
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "0.8125rem",
                  fontFamily: "var(--font-sans)",
                }}
              />
              <Bar
                dataKey="comments"
                fill={colors.bar}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Comments */}
      <div className="panel-card">
        <div className="entries-header" style={{ marginBottom: "1rem" }}>
          <h3>Recent Comments</h3>
          <span className="entries-count">{overviewComments.length}</span>
        </div>

        {overviewCommentsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "8px" }} />
            ))}
          </div>
        ) : overviewComments.length === 0 ? (
          <p className="text-muted">
            No comments yet. Add a comment section to your site to get started.
          </p>
        ) : (
          <div>
            {overviewComments.slice(0, 30).map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onApprove={approveComment}
                onDelete={deleteComment}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
