import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  ExternalLink,
  Loader2,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useToast } from "../components/Toast.jsx";

const ADMIN_USERNAME = "sudip";

function formatDate(value) {
  if (!value) return "None";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function maskTelegramId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Not set";
  if (raw.length <= 4) return raw;
  return `${raw.slice(0, 2)}...${raw.slice(-2)}`;
}

export default function Admin() {
  const navigate = useNavigate();
  const toast = useToast();
  const token = localStorage.getItem("token");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [resetLinks, setResetLinks] = useState({});
  const [busyUsers, setBusyUsers] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageBusy, setMessageBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    fetchUsers();
  }, [token]);

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => {
      return [user.username, user.email, user.telegram_chat_id, user.role, user.account_status]
        .some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [query, users]);

  async function fetchUsers({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    setRefreshing(quiet);
    setError("");

    try {
      const res = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Could not load users.");
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
      await fetchMessages({ quiet: true });
    } catch (err) {
      setError(err?.message || "Could not load users.");
      if (quiet) toast.error("Refresh failed", err?.message || "Could not load users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function setUserBusy(usernameToUpdate, busy) {
    setBusyUsers((current) => ({
      ...current,
      [usernameToUpdate]: busy,
    }));
  }

  async function fetchMessages({ quiet = false } = {}) {
    if (!quiet) setMessageBusy(true);

    try {
      const res = await fetch("/api/admin-messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Could not load admin messages.");
      }

      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      if (!quiet) toast.error("Messages failed", err?.message || "Could not load admin messages.");
    } finally {
      setMessageBusy(false);
    }
  }

  async function updateUserAccess(user, patch) {
    const nextRole = patch.role ?? user.role;
    const nextStatus = patch.account_status ?? user.account_status;

    setUserBusy(user.username, true);
    try {
      const res = await fetch("/api/admin?action=update_user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: user.username,
          role: nextRole,
          account_status: nextStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Could not update user.");
      }

      setUsers((current) => current.map((item) => (
        item.username === user.username
          ? { ...item, ...(data.user || {}), role: nextRole, account_status: nextStatus }
          : item
      )));
      toast.success("User updated", `${user.username} is now ${nextRole} / ${nextStatus}.`);
    } catch (err) {
      toast.error("Update failed", err?.message || "Could not update user.");
    } finally {
      setUserBusy(user.username, false);
    }
  }

  async function generateResetLink(targetUsername, { silent = false } = {}) {
    setUserBusy(targetUsername, true);

    try {
      const res = await fetch("/api/admin?action=generate_password_reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: targetUsername,
          origin: window.location.origin,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Could not generate reset link.");
      }

      setResetLinks((current) => ({
        ...current,
        [targetUsername]: {
          reset_link: data.reset_link,
          expires_at: data.expires_at,
        },
      }));
      setUsers((current) => current.map((user) => (
        user.username === targetUsername
          ? { ...user, password_reset_expires: data.expires_at, has_active_reset: true }
          : user
      )));

      if (!silent) {
        toast.success("Reset link generated", `A fresh link is ready for ${targetUsername}.`);
      }

      return data;
    } catch (err) {
      if (!silent) toast.error("Reset failed", err?.message || "Could not generate reset link.");
      throw err;
    } finally {
      setUserBusy(targetUsername, false);
    }
  }

  async function generateForAll() {
    if (visibleUsers.length === 0) return;
    const confirmed = window.confirm(
      `Generate new password reset links for ${visibleUsers.length} visible users? Existing reset links for those users will be replaced.`
    );
    if (!confirmed) return;

    setBulkBusy(true);
    let generated = 0;
    let failed = 0;

    for (const user of visibleUsers) {
      try {
        await generateResetLink(user.username, { silent: true });
        generated += 1;
      } catch {
        failed += 1;
      }
    }

    setBulkBusy(false);
    if (generated > 0) {
      toast.success("Links generated", `${generated} reset link${generated === 1 ? "" : "s"} ready.`);
    }
    if (failed > 0) {
      toast.error("Some links failed", `${failed} user${failed === 1 ? "" : "s"} could not be updated.`);
    }
  }

  async function copyResetLink(targetUsername) {
    const link = resetLinks[targetUsername]?.reset_link;
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Copied", `Reset link copied for ${targetUsername}.`);
    } catch {
      toast.error("Copy failed", "Your browser blocked clipboard access.");
    }
  }

  async function updateMessageStatus(id, status) {
    setMessageBusy(true);
    try {
      const res = await fetch("/api/admin-messages", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Could not update message.");
      }

      setMessages((current) => current.map((message) => (
        message.id === id ? { ...message, status } : message
      )));
    } catch (err) {
      toast.error("Message update failed", err?.message || "Could not update message.");
    } finally {
      setMessageBusy(false);
    }
  }

  async function deleteMessage(id) {
    if (!window.confirm("Delete this admin message?")) return;

    setMessageBusy(true);
    try {
      const res = await fetch("/api/admin-messages", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Could not delete message.");
      }

      setMessages((current) => current.filter((message) => message.id !== id));
      toast.info("Deleted", "Admin message removed.");
    } catch (err) {
      toast.error("Delete failed", err?.message || "Could not delete message.");
    } finally {
      setMessageBusy(false);
    }
  }

  function signOut() {
    localStorage.clear();
    navigate("/");
  }

  if (!token) return null;

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a href="/" className="sidebar-brand">
          Website<span style={{ color: "var(--color-accent)" }}>Tools</span>
        </a>
        <div className="admin-topbar-actions">
          <a className="admin-text-link" href="/dashboard">
            Dashboard
          </a>
          <button className="ghost" onClick={signOut}>
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-header">
          <div>
            <div className="admin-title-row">
              <ShieldCheck size={24} />
              <h1>Admin Users</h1>
            </div>
            <p className="dashboard-subheader">
              Review accounts and generate one-time password reset links.
            </p>
          </div>
          <div className="admin-header-actions">
            <button className="secondary" onClick={() => fetchUsers({ quiet: true })} disabled={refreshing || bulkBusy}>
              <RefreshCw size={15} className={refreshing ? "spin-icon" : ""} />
              Refresh
            </button>
            <button className="primary" onClick={generateForAll} disabled={bulkBusy || loading || visibleUsers.length === 0}>
              {bulkBusy ? <Loader2 size={15} className="spin-icon" /> : <ShieldCheck size={15} />}
              Generate For All
            </button>
          </div>
        </div>

        <section className="panel-card admin-toolbar">
          <div className="admin-search">
            <Search size={16} />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users, email, or Telegram ID"
              aria-label="Search users"
            />
          </div>
          <div className="admin-count">
            {visibleUsers.length} of {users.length} users
          </div>
        </section>

        {loading ? (
          <section className="panel-card admin-loading">
            <Loader2 size={18} className="spin-icon" />
            Loading users...
          </section>
        ) : error ? (
          <section className="panel-card admin-error">
            <strong>{error}</strong>
            <button className="secondary" onClick={() => fetchUsers()}>
              Try again
            </button>
          </section>
        ) : (
          <section className="admin-table-wrap" aria-label="Users">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Contact</th>
                  <th>Reset Status</th>
                  <th>Reset Link</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => {
                  const generated = resetLinks[user.username];
                  const isBusy = Boolean(busyUsers[user.username]);
                  const isPrimaryAdmin = user.username === ADMIN_USERNAME;

                  return (
                    <tr key={user.username}>
                      <td>
                        <div className="admin-user-name">{user.username}</div>
                        {user.role === "admin" && (
                          <span className="badge owner">Admin</span>
                        )}
                        {isPrimaryAdmin && <div className="admin-meta">Primary admin</div>}
                      </td>
                      <td>
                        <select
                          className="admin-select"
                          value={user.role || "user"}
                          disabled={isBusy || isPrimaryAdmin}
                          onChange={(event) => updateUserAccess(user, { role: event.target.value })}
                          aria-label={`Role for ${user.username}`}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <select
                          className="admin-select"
                          value={user.account_status || "active"}
                          disabled={isBusy || isPrimaryAdmin}
                          onChange={(event) => updateUserAccess(user, { account_status: event.target.value })}
                          aria-label={`Status for ${user.username}`}
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                        {user.account_status === "suspended" && (
                          <div className="admin-meta admin-status-danger">Submissions blocked</div>
                        )}
                      </td>
                      <td>
                        <div>{user.email || "No email"}</div>
                        <div className="admin-meta">
                          Telegram: {maskTelegramId(user.telegram_chat_id)}
                          {user.telegram_notifications ? " - alerts on" : ""}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${user.has_active_reset ? "pending" : ""}`}>
                          {user.has_active_reset ? "Active" : "None"}
                        </span>
                        <div className="admin-meta">{formatDate(user.password_reset_expires)}</div>
                      </td>
                      <td>
                        {generated ? (
                          <div className="admin-reset-link">
                            <input readOnly value={generated.reset_link} aria-label={`Reset link for ${user.username}`} />
                            <button
                              className="secondary"
                              onClick={() => copyResetLink(user.username)}
                              title="Copy reset link"
                              aria-label={`Copy reset link for ${user.username}`}
                            >
                              <Copy size={14} />
                            </button>
                            <a
                              className="admin-icon-link"
                              href={generated.reset_link}
                              target="_blank"
                              rel="noreferrer"
                              title="Open reset link"
                              aria-label={`Open reset link for ${user.username}`}
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        ) : (
                          <span className="admin-meta">Generate to reveal a one-time link.</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="primary"
                          onClick={() => generateResetLink(user.username)}
                          disabled={isBusy || bulkBusy}
                        >
                          {isBusy ? <Loader2 size={14} className="spin-icon" /> : <RefreshCw size={14} />}
                          Generate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visibleUsers.length === 0 && (
              <div className="admin-empty">No users match that search.</div>
            )}
          </section>
        )}

        {!loading && !error && (
          <section className="panel-card admin-messages-panel">
            <div className="admin-section-header">
              <div>
                <div className="admin-title-row">
                  <MessageSquare size={20} />
                  <h2>Admin Messages</h2>
                </div>
                <p className="dashboard-subheader">
                  Messages sent from user dashboards.
                </p>
              </div>
              <button className="secondary" onClick={() => fetchMessages()} disabled={messageBusy}>
                <RefreshCw size={15} className={messageBusy ? "spin-icon" : ""} />
                Refresh
              </button>
            </div>

            {messages.length === 0 ? (
              <p className="text-muted">No messages yet.</p>
            ) : (
              <div className="admin-message-list">
                {messages.map((message) => (
                  <article key={message.id} className="admin-message-item">
                    <div className="admin-message-head">
                      <div>
                        <h3>{message.subject}</h3>
                        <div className="admin-meta">
                          From {message.sender_username} - {formatDate(message.created_at)}
                        </div>
                      </div>
                      <span className={`badge ${message.status === "closed" ? "private" : message.status === "open" ? "pending" : "owner"}`}>
                        {message.status}
                      </span>
                    </div>
                    <p className="admin-message-body">{message.message}</p>
                    <div className="actions-row">
                      {message.status !== "read" && (
                        <button className="secondary" onClick={() => updateMessageStatus(message.id, "read")} disabled={messageBusy}>
                          Mark Read
                        </button>
                      )}
                      {message.status !== "closed" && (
                        <button className="secondary" onClick={() => updateMessageStatus(message.id, "closed")} disabled={messageBusy}>
                          Close
                        </button>
                      )}
                      <button className="danger" onClick={() => deleteMessage(message.id)} disabled={messageBusy}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
