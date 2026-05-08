import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
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
  const username = localStorage.getItem("username");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [resetLinks, setResetLinks] = useState({});
  const [busyUsers, setBusyUsers] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const isLocalAdmin = username === ADMIN_USERNAME;

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    if (!isLocalAdmin) {
      setLoading(false);
      setError("Admin access is limited to sudip.");
      return;
    }

    fetchUsers();
  }, [token, isLocalAdmin]);

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => {
      return [user.username, user.email, user.telegram_chat_id]
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

  function signOut() {
    localStorage.clear();
    navigate("/");
  }

  if (!token) return null;

  if (!isLocalAdmin) {
    return (
      <div className="admin-shell">
        <main className="admin-main admin-main-narrow">
          <section className="panel-card admin-access-card">
            <ShieldCheck size={28} />
            <h1>Admin access required</h1>
            <p className="text-muted">
              Sign in as sudip to view users and generate password reset links.
            </p>
            <div className="actions-row">
              <button className="primary" onClick={() => navigate("/")}>
                Go to sign in
              </button>
              <button className="secondary" onClick={signOut}>
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

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

                  return (
                    <tr key={user.username}>
                      <td>
                        <div className="admin-user-name">{user.username}</div>
                        {user.username === ADMIN_USERNAME && (
                          <span className="badge owner">Admin</span>
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
      </main>
    </div>
  );
}
