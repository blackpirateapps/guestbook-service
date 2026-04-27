import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

function useDarkMode() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function chartColors(dark) {
  return {
    bar:     dark ? "#4da3ff" : "#0075de",
    barLike: dark ? "#f59242" : "#dd5b00",
    grid:    dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    text:    dark ? "#a09b96" : "#615d59",
    tooltip: dark ? "#2a2826" : "#ffffff",
  };
}

function groupByDay(entries, days = 14) {
  const buckets = {};
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toLocaleDateString("default", { month: "short", day: "numeric" });
    buckets[key] = { date: key, entries: 0, likes: 0 };
  }
  entries.forEach((e) => {
    const d = new Date(e.created_at);
    if (now - d.getTime() > days * 86400000) return;
    const key = d.toLocaleDateString("default", { month: "short", day: "numeric" });
    if (buckets[key]) {
      buckets[key].entries += 1;
      buckets[key].likes   += e.likes || 0;
    }
  });
  return Object.values(buckets);
}

/**
 * Identicon — colored circle avatar from initials
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
  telegramChatId,
  telegramNotifications,
  onOpenAccountSettings,
}) {
  const dark    = useDarkMode();
  const colors  = chartColors(dark);
  const chartData = groupByDay(entries);
  const hasTelegramChatId = Boolean(telegramChatId?.trim());
  const telegramReady = hasTelegramChatId && telegramNotifications;

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

      {!telegramReady && (
        <TelegramNotificationNudge
          hasChatId={hasTelegramChatId}
          onOpenAccountSettings={onOpenAccountSettings}
        />
      )}

      {/* Activity chart */}
      <div className="panel-card" style={{ marginBottom: "var(--space-4)" }}>
        <h3 style={{ marginBottom: "1.25rem" }}>Activity — last 14 days</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: colors.text }}
              axisLine={false}
              tickLine={false}
              interval={2}
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
            <Bar dataKey="entries" name="Entries" fill={colors.bar}    radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Bar dataKey="likes"   name="Likes"   fill={colors.barLike} radius={[3, 3, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Entries panel */}
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

function TelegramNotificationNudge({ hasChatId, onOpenAccountSettings }) {
  return (
    <div className="panel-card telegram-nudge">
      <div className="telegram-nudge-copy">
        <div className="telegram-nudge-label">Notifications</div>
        <h3>{hasChatId ? "Telegram alerts are paused" : "Get Telegram alerts as things happen"}</h3>
        <p>
          {hasChatId
            ? "Enable Telegram notifications so new guestbook entries, comments, and form submissions reach you right away."
            : "Set your Telegram Chat ID to receive notifications when someone signs your guestbook, comments, or submits a form."}
        </p>
      </div>
      {onOpenAccountSettings && (
        <button type="button" className="primary" onClick={onOpenAccountSettings}>
          {hasChatId ? "Enable Alerts" : "Set Chat ID"}
        </button>
      )}
    </div>
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
          <button onClick={() => approveEntry(entry.id)}>✓ Approve</button>
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
            placeholder="Write a reply as the owner…"
          />
          <div className="actions-row">
            <button onClick={() => sendReply(entry.id)}>Send</button>
            <button className="secondary" onClick={() => setReplyingTo(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
