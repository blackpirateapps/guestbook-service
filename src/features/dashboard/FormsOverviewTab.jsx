import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LineChart, Line
} from "recharts";
import { Copy, CheckCheck, ChevronDown, ChevronUp } from "lucide-react";

function useDarkMode() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function chartColors(dark) {
  return {
    bar:    dark ? "#4da3ff" : "#0075de",
    grid:   dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    text:   dark ? "#a09b96" : "#615d59",
    tooltip: dark ? "#2a2826" : "#ffffff",
  };
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try { await navigator.clipboard.writeText(text); }
    catch { /* fallback */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      className={`code-block-copy${copied ? " copied" : ""}`}
      style={{ position: "static", padding: "3px 8px", fontSize: "0.75rem" }}
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
    </button>
  );
}

function SubmissionCard({ submission, formFields }) {
  const [expanded, setExpanded] = useState(false);

  const nameValue = submission.data?.name || submission.data?.Name || Object.values(submission.data || {})[0] || "—";
  const preview   = Object.entries(submission.data || {}).slice(0, 2)
    .map(([, v]) => v).filter(Boolean).join(" · ").slice(0, 80);

  const emailFields   = (formFields || []).filter((f) => f.type === "email");
  const websiteFields = (formFields || []).filter((f) => f.type === "url");

  return (
    <div className="entry-card" style={{ marginBottom: "var(--space-2)" }}>
      <div
        className="entry-card-header"
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="entry-title-row">
          <div className="entry-name">{nameValue}</div>
          {submission.formName && (
            <span className="badge" style={{
              background: "var(--color-bg-alt)",
              color: "var(--color-text-muted)",
              borderColor: "var(--border-color)",
              fontSize: "0.7rem",
            }}>
              {submission.formName}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <span className="entry-date">{new Date(submission.created_at).toLocaleString()}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {!expanded && (
        <div className="entry-content" style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          {preview || "—"}
        </div>
      )}

      {expanded && (
        <div className="submission-details">
          <table className="submission-table">
            <tbody>
              {(formFields || []).map((field) => {
                const val = submission.data?.[field.name];
                const isEmail   = field.type === "email";
                const isWebsite = field.type === "url";
                return (
                  <tr key={field.name}>
                    <td className="submission-label">{field.label}</td>
                    <td className="submission-value">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        {field.type === "checkbox"
                          ? val ? "Yes" : "No"
                          : val || "—"}
                        {(isEmail || isWebsite) && val && (
                          <CopyBtn text={val} />
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function FormsOverviewTab({
  forms,
  overviewSubmissions,
  overviewSubmissionsLoading,
}) {
  const dark    = useDarkMode();
  const colors  = chartColors(dark);
  const totalSubmissions = forms.reduce((s, f) => s + (f.submission_count || 0), 0);
  const topForm = [...forms].sort((a, b) => (b.submission_count || 0) - (a.submission_count || 0))[0];

  const chartData = forms.map((f) => ({
    name:        f.name.length > 14 ? f.name.slice(0, 12) + "…" : f.name,
    submissions: f.submission_count || 0,
  }));

  return (
    <>
      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Total Forms</div>
          <div className="stat-value">{forms.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Submissions</div>
          <div className="stat-value">{totalSubmissions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Most Active</div>
          <div className="stat-value" style={{ fontSize: "1.1rem" }}>
            {topForm?.name || "—"}
          </div>
        </div>
      </div>

      {/* Chart */}
      {forms.length > 0 && (
        <div className="panel-card" style={{ marginBottom: "var(--space-4)" }}>
          <h3 style={{ marginBottom: "1.25rem" }}>Submissions by Form</h3>
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
                dataKey="submissions"
                fill={colors.bar}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Submissions list */}
      <div className="panel-card">
        <div className="entries-header" style={{ marginBottom: "1rem" }}>
          <h3>Recent Submissions</h3>
          <span className="entries-count">{overviewSubmissions.length}</span>
        </div>

        {overviewSubmissionsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "58px", borderRadius: "8px" }} />
            ))}
          </div>
        ) : overviewSubmissions.length === 0 ? (
          <p className="text-muted">No submissions yet. Share your forms to start collecting data.</p>
        ) : (
          <div>
            {overviewSubmissions.map((sub) => (
              <SubmissionCard
                key={`${sub.formId}-${sub.id}`}
                submission={sub}
                formFields={sub.formFields}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
