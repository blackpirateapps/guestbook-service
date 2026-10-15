import { useEffect, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Info,
  Loader2,
  Megaphone,
  RefreshCw,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useToast } from "../../components/Toast.jsx";

const SEVERITIES = [
  { id: "info", label: "Informational", Icon: Info, color: "var(--color-accent)" },
  { id: "success", label: "Success / Feature", Icon: CheckCircle2, color: "var(--color-success)" },
  { id: "warning", label: "Warning / Maintenance", Icon: AlertTriangle, color: "var(--color-warning)" },
  { id: "urgent", label: "Urgent Alert", Icon: AlertOctagon, color: "var(--color-danger)" },
];

function formatDate(dateStr) {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminNotificationsTab({ token, users = [] }) {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState(null);

  // Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("info");
  const [targetType, setTargetType] = useState("all");
  const [targetValue, setTargetValue] = useState("");
  const [isBanner, setIsBanner] = useState(false);
  const [sendTelegram, setSendTelegram] = useState(false);
  const [actionLabel, setActionLabel] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [expiresPreset, setExpiresPreset] = useState("never");
  const [customExpiresAt, setCustomExpiresAt] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  async function fetchNotifications({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    setRefreshing(quiet);

    try {
      const res = await fetch("/api/notifications?admin=1", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load notifications.");
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (err) {
      if (!quiet) toast.error("Load failed", err?.message || "Could not load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function calculateExpiresAt() {
    if (expiresPreset === "never") return null;
    if (expiresPreset === "custom") return customExpiresAt ? new Date(customExpiresAt).toISOString() : null;

    const now = new Date();
    if (expiresPreset === "24h") now.setHours(now.getHours() + 24);
    else if (expiresPreset === "3d") now.setDate(now.getDate() + 3);
    else if (expiresPreset === "7d") now.setDate(now.getDate() + 7);
    else if (expiresPreset === "30d") now.setDate(now.getDate() + 30);
    return now.toISOString();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title required", "Enter a title for the notification.");
      return;
    }
    if (!message.trim()) {
      toast.error("Message required", "Enter the message body.");
      return;
    }
    if (targetType !== "all" && !targetValue.trim()) {
      toast.error("Target value required", `Please select or enter the target ${targetType}.`);
      return;
    }

    const calculatedExpiry = calculateExpiresAt();

    setSubmitting(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          severity,
          target_type: targetType,
          target_value: targetType === "all" ? null : targetValue.trim(),
          is_banner: isBanner,
          send_telegram: sendTelegram,
          action_label: actionLabel.trim() || null,
          action_url: actionUrl.trim() || null,
          expires_at: calculatedExpiry,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create notification.");

      toast.success(
        "Notification dispatched",
        sendTelegram
          ? "Sent to in-app dashboard & queued for Telegram delivery."
          : "Notification published to in-app dashboard."
      );

      // Reset form
      setTitle("");
      setMessage("");
      setSeverity("info");
      setTargetType("all");
      setTargetValue("");
      setIsBanner(false);
      setSendTelegram(false);
      setActionLabel("");
      setActionUrl("");
      setExpiresPreset("never");
      setCustomExpiresAt("");

      await fetchNotifications({ quiet: true });
    } catch (err) {
      toast.error("Creation failed", err?.message || "Could not dispatch notification.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Revoke and delete this notification? This action cannot be undone.")) {
      return;
    }

    setBusyDeleteId(id);
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete notification.");

      setNotifications((current) => current.filter((item) => item.id !== id));
      toast.info("Notification removed", "The notification has been revoked.");
    } catch (err) {
      toast.error("Delete failed", err?.message || "Could not delete notification.");
    } finally {
      setBusyDeleteId(null);
    }
  }

  // Active target description
  const targetLabel = (() => {
    if (targetType === "all") return `All users (${users.length} total)`;
    if (targetType === "user") return targetValue ? `User @${targetValue}` : "Specific user";
    if (targetType === "role") return targetValue ? `All ${targetValue}s` : "By role";
    if (targetType === "status") return targetValue ? `All ${targetValue} users` : "By status";
    return "";
  })();

  const selectedSeverity = SEVERITIES.find((s) => s.id === severity) || SEVERITIES[0];
  const SeverityIcon = selectedSeverity.Icon;

  return (
    <div className="admin-notifications-tab">
      {/* ── Composer & Live Preview Grid ─────────────────────────── */}
      <div className="admin-notif-grid">
        {/* Composer Card */}
        <section className="panel-card admin-notif-composer">
          <div className="admin-section-header">
            <div>
              <div className="admin-title-row">
                <Send size={18} />
                <h2>Compose Notification</h2>
              </div>
              <p className="dashboard-subheader">
                Broadcast announcements or send targeted administrative alerts.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ marginBottom: 0 }}>
            {/* Title */}
            <div className="form-group">
              <label htmlFor="notif-title">Title *</label>
              <input
                id="notif-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="e.g. Scheduled Maintenance or New Feature Available"
                required
              />
            </div>

            {/* Message Body */}
            <div className="form-group">
              <label htmlFor="notif-message">Message *</label>
              <textarea
                id="notif-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={5000}
                rows={4}
                placeholder="Write the notification body here..."
                required
              />
              <p className="text-xs text-muted" style={{ marginTop: "4px" }}>
                {message.length}/5000 characters
              </p>
            </div>

            {/* Severity Level */}
            <div className="form-group">
              <label>Severity Level</label>
              <div className="admin-severity-selector" role="radiogroup" aria-label="Severity level">
                {SEVERITIES.map((s) => {
                  const IconComp = s.Icon;
                  const isSelected = severity === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`severity-btn severity-${s.id}${isSelected ? " active" : ""}`}
                      onClick={() => setSeverity(s.id)}
                      role="radio"
                      aria-checked={isSelected}
                    >
                      <IconComp size={14} />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Audience */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="notif-target-type">Target Audience</label>
                <select
                  id="notif-target-type"
                  value={targetType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setTargetType(newType);
                    if (newType === "all") setTargetValue("");
                    else if (newType === "role") setTargetValue("user");
                    else if (newType === "status") setTargetValue("active");
                    else if (newType === "user" && users.length > 0) setTargetValue(users[0].username);
                  }}
                >
                  <option value="all">Broadcast to All Users</option>
                  <option value="user">Specific User</option>
                  <option value="role">Filter by Role</option>
                  <option value="status">Filter by Account Status</option>
                </select>
              </div>

              {targetType === "user" && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="notif-target-user">Select Recipient</label>
                  <select
                    id="notif-target-user"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  >
                    <option value="">-- Choose user --</option>
                    {users.map((u) => (
                      <option key={u.username} value={u.username}>
                        {u.username} ({u.role} - {u.account_status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "role" && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="notif-target-role">Select Role</label>
                  <select
                    id="notif-target-role"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              {targetType === "status" && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="notif-target-status">Select Status</label>
                  <select
                    id="notif-target-status"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              )}
            </div>

            {/* Call-to-action button (Optional) */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="notif-action-label">Action Button Label (Optional)</label>
                <input
                  id="notif-action-label"
                  type="text"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  maxLength={50}
                  placeholder="e.g. View Documentation"
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="notif-action-url">Action Button URL (Optional)</label>
                <input
                  id="notif-action-url"
                  type="text"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  maxLength={500}
                  placeholder="e.g. /dashboard?tab=account or https://..."
                />
              </div>
            </div>

            {/* Delivery Channels & Display Options */}
            <div className="admin-notif-options-box">
              <label className="checkbox-label" style={{ fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={isBanner}
                  onChange={(e) => setIsBanner(e.target.checked)}
                />
                <span>
                  <strong>Top Alert Banner:</strong> Pin as a prominent, dismissible banner across the user dashboard.
                </span>
              </label>

              <label className="checkbox-label" style={{ fontWeight: 500, marginTop: "8px" }}>
                <input
                  type="checkbox"
                  checked={sendTelegram}
                  onChange={(e) => setSendTelegram(e.target.checked)}
                />
                <span>
                  <strong>Telegram Push:</strong> Dispatch to matched users with linked Telegram accounts and alerts enabled.
                </span>
              </label>
            </div>

            {/* Expiration Preset */}
            <div className="form-group" style={{ marginTop: "var(--space-3)" }}>
              <label>Auto-Expiration</label>
              <div className="admin-expiry-presets">
                {[
                  { id: "never", label: "Never (Permanent)" },
                  { id: "24h", label: "24 Hours" },
                  { id: "3d", label: "3 Days" },
                  { id: "7d", label: "7 Days" },
                  { id: "custom", label: "Custom Date" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`pill-btn${expiresPreset === preset.id ? " active" : ""}`}
                    onClick={() => setExpiresPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {expiresPreset === "custom" && (
                <div style={{ marginTop: "8px" }}>
                  <input
                    type="datetime-local"
                    value={customExpiresAt}
                    onChange={(e) => setCustomExpiresAt(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="actions-row" style={{ marginTop: "var(--space-4)" }}>
              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={15} className="spin-icon" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Dispatch Notification
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Live Preview Card */}
        <section className="panel-card admin-notif-preview-panel">
          <div className="admin-section-header">
            <div className="admin-title-row">
              <Eye size={18} />
              <h2>Live Preview</h2>
            </div>
            <span className="badge owner">User Experience</span>
          </div>

          <p className="text-muted text-sm" style={{ marginBottom: "var(--space-4)" }}>
            How your notification will appear in the user's dashboard:
          </p>

          {/* Banner preview if enabled */}
          {isBanner && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <div className="text-xs text-muted" style={{ marginBottom: "4px", fontWeight: 600 }}>
                TOP ALERT BANNER
              </div>
              <div className={`top-alert-banner alert-${severity}`}>
                <div className="top-alert-content">
                  <SeverityIcon size={16} className="top-alert-icon" />
                  <div className="top-alert-text">
                    <span className="top-alert-title">{title || "Notification Title"}</span>
                    <span className="top-alert-sep">—</span>
                    <span className="top-alert-message">
                      {message || "The message text will appear here."}
                    </span>
                  </div>
                </div>
                {actionLabel && (
                  <div className="top-alert-actions">
                    <span className="top-alert-action-btn">{actionLabel}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Drawer Item preview */}
          <div>
            <div className="text-xs text-muted" style={{ marginBottom: "4px", fontWeight: 600 }}>
              NOTIFICATION DRAWER CARD
            </div>
            <article className="notification-item unread" style={{ pointerEvents: "none" }}>
              <div className="notification-item-header">
                <div className="notification-item-meta">
                  <span className={`notification-severity-badge badge-${severity}`}>
                    <SeverityIcon size={12} />
                    {selectedSeverity.label}
                  </span>
                  {isBanner && <span className="notification-banner-tag">Banner</span>}
                  <span className="notification-item-time">Just now</span>
                </div>
              </div>

              <h4 className="notification-item-title">
                <span className="notification-unread-dot" />
                {title || "Notification Title"}
              </h4>

              <div className="notification-item-message">
                {message || "Message body will be displayed here."}
              </div>

              {actionLabel && (
                <div className="notification-item-action-row">
                  <span className="notification-action-link">
                    <span>{actionLabel}</span>
                    <ExternalLink size={13} />
                  </span>
                </div>
              )}
            </article>
          </div>

          {/* Delivery Metadata summary */}
          <div className="admin-preview-meta" style={{ marginTop: "var(--space-4)" }}>
            <div>
              <strong>Target Audience:</strong> {targetLabel}
            </div>
            <div>
              <strong>Delivery Channels:</strong> In-App Dashboard
              {sendTelegram ? " + Telegram Push" : ""}
            </div>
            <div>
              <strong>Auto-Expiry:</strong>{" "}
              {expiresPreset === "never"
                ? "Never (Permanent)"
                : expiresPreset === "custom"
                ? customExpiresAt || "Not set"
                : expiresPreset}
            </div>
          </div>
        </section>
      </div>

      {/* ── Sent Notifications History Table ─────────────────────── */}
      <section className="panel-card admin-notif-history" style={{ marginTop: "var(--space-5)" }}>
        <div className="admin-section-header">
          <div>
            <div className="admin-title-row">
              <Clock size={18} />
              <h2>Sent Notifications History</h2>
            </div>
            <p className="dashboard-subheader">
              Track delivery, read receipts, and manage active system broadcasts.
            </p>
          </div>

          <button
            className="secondary"
            onClick={() => fetchNotifications({ quiet: true })}
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? "spin-icon" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="admin-loading" style={{ padding: "var(--space-6) 0" }}>
            <Loader2 size={18} className="spin-icon" />
            Loading sent notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="admin-empty">No notifications have been sent yet.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>Notification</th>
                  <th>Severity</th>
                  <th>Target</th>
                  <th>Channels</th>
                  <th>Engagement</th>
                  <th>Expires</th>
                  <th>Sent Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notif) => {
                  const sObj = SEVERITIES.find((s) => s.id === notif.severity) || SEVERITIES[0];
                  const SIcon = sObj.Icon;
                  const isBusyDelete = busyDeleteId === notif.id;

                  const isExpired =
                    notif.expires_at && new Date(notif.expires_at).getTime() < Date.now();

                  return (
                    <tr key={notif.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                          {notif.title}
                        </div>
                        <div
                          className="admin-meta text-xs"
                          style={{
                            maxWidth: "260px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={notif.message}
                        >
                          {notif.message}
                        </div>
                        {notif.action_label && (
                          <div className="admin-meta text-xs" style={{ marginTop: "2px" }}>
                            CTA: <em>{notif.action_label}</em>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`notification-severity-badge badge-${notif.severity || "info"}`}>
                          <SIcon size={11} />
                          {sObj.label.split(" ")[0]}
                        </span>
                        {notif.is_banner === 1 && (
                          <div style={{ marginTop: "4px" }}>
                            <span className="badge pending">Banner</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {notif.target_type === "all" ? (
                          <span className="badge owner">All Users</span>
                        ) : notif.target_type === "user" ? (
                          <span>@{notif.target_value}</span>
                        ) : (
                          <span>
                            {notif.target_type}: {notif.target_value}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="text-xs">In-App</div>
                        {notif.send_telegram === 1 && (
                          <div className="text-xs" style={{ color: "var(--color-accent)", fontWeight: 500 }}>
                            + Telegram
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{notif.read_count || 0} reads</div>
                        {notif.is_banner === 1 && (
                          <div className="admin-meta text-xs">
                            {notif.dismissed_count || 0} dismissed
                          </div>
                        )}
                      </td>
                      <td>
                        {isExpired ? (
                          <span className="badge danger">Expired</span>
                        ) : notif.expires_at ? (
                          <div className="text-xs">{formatDate(notif.expires_at)}</div>
                        ) : (
                          <span className="admin-meta">Never</span>
                        )}
                      </td>
                      <td>
                        <div className="text-xs">{formatDate(notif.created_at)}</div>
                        <div className="admin-meta text-xs">by {notif.created_by}</div>
                      </td>
                      <td>
                        <button
                          className="danger"
                          onClick={() => handleDelete(notif.id)}
                          disabled={isBusyDelete}
                          title="Revoke and delete notification"
                        >
                          {isBusyDelete ? (
                            <Loader2 size={13} className="spin-icon" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
