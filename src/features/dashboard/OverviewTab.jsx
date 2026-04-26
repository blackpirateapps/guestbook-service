import { useState } from "react";

/**
 * Identicon — colored circle with initials, purely CSS-rendered.
 */
function Identicon({ name = "?" }) {
  const letters = name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 2) || "?";
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="entry-avatar"
      style={{ background: `hsl(${hue},55%,55%)` }}
      aria-hidden="true"
    >
      {letters}
    </div>
  );
}

export default function OverviewTab({
  entries,
  rootEntryCount,
  replyCount,
  pendingCount,
  privateCount,
  likesTotal,
  replyingTo,
  setReplyingTo,
  replyMsg,
  setReplyMsg,
  approveEntry,
  deleteEntry,
  sendReply,
}) {
  return (
    <>
      {/* Stats */}
      <div className="dashboard-stats">
        {[
          { label: "Threads",     value: rootEntryCount },
          { label: "Replies",     value: replyCount },
          { label: "Pending",     value: pendingCount },
          { label: "Private",     value: privateCount },
          { label: "Total Likes", value: likesTotal },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Entries Panel */}
      <div className="panel-card">
        <div className="entries-header">
          <h3>Recent Entries</h3>
          <span className="entries-count">{entries.length}</span>
        </div>

        {entries.length === 0 ? (
          <p className="text-muted" style={{ marginBottom: 0 }}>
            No messages yet. Share your guestbook link to get started.
          </p>
        ) : (
          <div className="entries-list">
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyMsg={replyMsg}
                setReplyMsg={setReplyMsg}
                approveEntry={approveEntry}
                deleteEntry={deleteEntry}
                sendReply={sendReply}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function EntryCard({
  entry,
  replyingTo,
  setReplyingTo,
  replyMsg,
  setReplyMsg,
  approveEntry,
  deleteEntry,
  sendReply,
}) {
  const isReplying = replyingTo === entry.id;

  return (
    <div
      className="entry-card"
      style={{ marginLeft: entry.parent_id ? "2rem" : 0 }}
    >
      <header className="entry-card-header">
        <div className="entry-title-row">
          <Identicon name={entry.sender_name} />
          <div>
            <div className="entry-name">
              {entry.sender_name}
              {entry.sender_website && (
                <a
                  className="entry-website"
                  href={entry.sender_website}
                  target="_blank"
                  rel="noreferrer"
                  title="Open sender website"
                >
                  ↗
                </a>
              )}
              <span className="badge-group">
                {entry.status === "pending" && <span className="badge pending">Pending</span>}
                {entry.is_private === 1 && <span className="badge private">Private</span>}
                {entry.is_owner === 1 && <span className="badge owner">Owner</span>}
              </span>
            </div>
            <div className="entry-date">{new Date(entry.created_at).toLocaleString()}</div>
          </div>
        </div>
        <div className="entry-metrics">♥ {entry.likes || 0}</div>
      </header>

      <div className="entry-content">{entry.message}</div>

      <div className="entry-actions">
        {entry.status === "pending" && (
          <button onClick={() => approveEntry(entry.id)}>
            ✓ Approve
          </button>
        )}
        <button className="secondary" onClick={() => setReplyingTo(entry.id)}>
          ↩ Reply
        </button>
        <button className="danger" onClick={() => deleteEntry(entry.id)}>
          Delete
        </button>
      </div>

      {isReplying && (
        <div className="reply-box">
          <textarea
            rows={2}
            value={replyMsg}
            onChange={(e) => setReplyMsg(e.target.value)}
            placeholder="Write a reply as the owner..."
          />
          <div className="actions-row">
            <button onClick={() => sendReply(entry.id)}>Send</button>
            <button className="secondary" onClick={() => setReplyingTo(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
