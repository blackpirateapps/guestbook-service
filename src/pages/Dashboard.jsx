import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconHeart,
  IconReply,
  IconTrash,
} from "../components/Icons";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "embed", label: "Embed" },
  { id: "settings", label: "Settings" },
  { id: "data", label: "Data" },
  { id: "tester", label: "API Tester" },
];

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState("");
  const [customHtml, setCustomHtml] = useState("");
  const [embedCssUrl, setEmbedCssUrl] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [origin, setOrigin] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [importName, setImportName] = useState("");
  const [importWebsite, setImportWebsite] = useState("");
  const [importDate, setImportDate] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [testerBaseUrl, setTesterBaseUrl] = useState("");
  const [testerName, setTesterName] = useState("");
  const [testerWebsite, setTesterWebsite] = useState("");
  const [testerMessage, setTesterMessage] = useState("");
  const [testerIsPrivate, setTesterIsPrivate] = useState(false);
  const [testerReplyParentId, setTesterReplyParentId] = useState("");
  const [testerLikeId, setTesterLikeId] = useState("");
  const [testerResult, setTesterResult] = useState("");
  const [testerBusy, setTesterBusy] = useState(false);
  const [dataTransferBusy, setDataTransferBusy] = useState(false);

  const importFileRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  useEffect(() => {
    setOrigin(window.location.origin);
    setTesterBaseUrl(window.location.origin);
    if (!token) {
      navigate("/");
      return;
    }
    fetchData();
  }, [token]);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  async function fetchData() {
    const entryRes = await fetch("/api/entries", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (entryRes.ok) setEntries(await entryRes.json());

    const profileRes = await fetch(`/api/profile?username=${username}`);
    if (profileRes.ok) {
      const data = await profileRes.json();
      setCustomCss(data.custom_css || "");
      setCustomHtml(data.custom_html || "");
      setEmbedCssUrl(data.embed_css_url || "");
      setRequireApproval(data.require_approval === 1);
    }
  }

  async function saveSettings() {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        custom_css: customCss,
        custom_html: customHtml,
        embed_css_url: embedCssUrl,
        require_approval: requireApproval,
      }),
    });
    if (res.ok) {
      alert("Settings saved!");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to save settings.");
    }
  }

  async function deleteEntry(id) {
    if (!confirm("Delete this entry?")) return;
    await fetch("/api/entries", {
      method: "DELETE",
      body: JSON.stringify({ id }),
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  }

  async function approveEntry(id) {
    await fetch("/api/entries", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "approve", id }),
    });
    fetchData();
  }

  async function sendReply(parentId) {
    if (!replyMsg.trim()) return;
    await fetch("/api/entries", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        owner_username: username,
        sender_name: username,
        message: replyMsg,
        parent_id: parentId,
      }),
    });
    setReplyMsg("");
    setReplyingTo(null);
    fetchData();
  }

  async function addImportedEntry(e) {
    e.preventDefault();
    if (!importName.trim() || !importMessage.trim() || !importDate) return;

    const dateObj = new Date(importDate);
    if (Number.isNaN(dateObj.getTime())) {
      alert("Please provide a valid date.");
      return;
    }

    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: "import",
        owner_username: username,
        sender_name: importName,
        sender_website: importWebsite,
        message: importMessage,
        created_at: dateObj.toISOString(),
      }),
    });

    if (res.ok) {
      setImportName("");
      setImportWebsite("");
      setImportDate("");
      setImportMessage("");
      fetchData();
      alert("Entry added.");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to add entry.");
    }
  }

  const embedSrc = origin && username ? `${origin}/u/${username}?embed=1` : "";
  const widgetSrc = origin ? `${origin}/guestbook-widget.js` : "";

  const rootEntryCount = entries.filter((e) => !e.parent_id).length;
  const replyCount = entries.filter((e) => !!e.parent_id).length;
  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const privateCount = entries.filter((e) => e.is_private === 1).length;
  const likesTotal = entries.reduce((sum, e) => sum + (e.likes || 0), 0);

  const embedSnippet = embedSrc
    ? `<iframe
  id="guestbook-embed"
  src="${embedSrc}"
  style="width:100%;border:0;height:650px"
  loading="lazy"
></iframe>
<script>
(function () {
  var iframe = document.getElementById('guestbook-embed');
  function onMessage(e) {
    if (!iframe || e.source !== iframe.contentWindow) return;
    if (!e.data || e.data.type !== 'guestbook:resize') return;
    if (typeof e.data.height === 'number') iframe.style.height = (e.data.height + 20) + 'px';
  }
  window.addEventListener('message', onMessage, false);
})();
</script>
<div style="margin-top:8px;font-size:12px;opacity:.75;font-family:ui-serif,Georgia,Cambria,'Times New Roman',Times,serif">
  Powered by <a href="https://guestbook.blackpiratex.com" target="_blank" rel="noreferrer">Guestbook Service</a>
</div>`
    : "";

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard.");
    } catch {
      alert(
        "Could not copy automatically. Select the text and copy it manually.",
      );
    }
  }

  const headlessSubmitSnippet =
    origin && username
      ? `<form id="guestbook-form">
  <input name="name" placeholder="Your name" required />
  <input name="website" placeholder="https://example.com (optional)" />
  <textarea name="message" placeholder="Leave a note..." required></textarea>
  <button type="submit">Sign Guestbook</button>
</form>

<script>
  const baseUrl = "${origin}";
  const owner = "${username}";
  document.getElementById("guestbook-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      owner_username: owner,
      sender_name: fd.get("name"),
      sender_website: fd.get("website"),
      message: fd.get("message"),
      is_private: false,
      bot_field: ""
    };
    const res = await fetch(baseUrl + "/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to submit");
    alert("Submitted!");
  });
</script>`
      : "";

  const headlessReplySnippet =
    origin && username
      ? `<script>
  const baseUrl = "${origin}";
  const owner = "${username}";

  async function postReply(parentId, name, message, website = "") {
    const payload = {
      owner_username: owner,
      sender_name: name,
      sender_website: website,
      message,
      parent_id: parentId,
      is_private: false,
      bot_field: ""
    };

    const res = await fetch(baseUrl + "/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to post reply");
    return await res.json();
  }
</script>`
      : "";

  const headlessLikeSnippet = origin
    ? `<script>
  const baseUrl = "${origin}";

  async function likeEntry(entryId) {
    const res = await fetch(baseUrl + "/api/entries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like", id: entryId })
    });
    if (!res.ok) throw new Error("Failed to like entry");
    return await res.json();
  }
</script>`
    : "";

  const headlessApiDocs =
    origin && username
      ? `GET ${origin}/api/entries?user=${username}
- Public: returns approved, non-private entries (threads + replies).

POST ${origin}/api/entries
- Public: create a new thread OR reply.
- Use parent_id: null for a top-level entry.
- Use parent_id: <entry id> to create a reply.
- Body fields:
  owner_username (string, required)
  sender_name (string, required)
  message (string, required)
  sender_website (string, optional)
  parent_id (number|null, optional)
  is_private (boolean, optional)
  bot_field (string, optional honeypot)

PUT ${origin}/api/entries
- Public likes:
  { "action": "like", "id": <entry id> }

PUT ${origin}/api/entries (Owner only)
- Approve pending entries (requires Authorization: Bearer <JWT>):
  { "action": "approve", "id": <entry id> }

DELETE ${origin}/api/entries (Owner only)
- Delete an entry (requires Authorization: Bearer <JWT>):
  { "id": <entry id> }`
      : "";

  const headlessWidgetSnippet =
    widgetSrc && username
      ? `<div id="guestbook-entries"></div>
<script src="${widgetSrc}"></script>
<script>
  GuestbookWidget.mount({
    baseUrl: "${origin}",
    username: "${username}",
    container: "#guestbook-entries"
  });
</script>`
      : "";

  const headlessCssExample = `/* Example styling for the default GuestbookWidget markup */
#guestbook-entries {
  max-width: 720px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}

.gbw-entry {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  padding: 16px;
  margin: 0 0 16px 0;
}

.gbw-entry-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.gbw-author {
  color: #007aff;
  text-decoration: none;
}

.gbw-author:hover {
  text-decoration: underline;
}

.gbw-date {
  color: rgba(0, 0, 0, 0.6);
  font-weight: 500;
}

.gbw-entry-body {
  white-space: pre-wrap;
  line-height: 1.55;
}`;

  function resolveTesterEndpoint() {
    const base = (testerBaseUrl || origin || window.location.origin)
      .trim()
      .replace(/\/+$/, "");
    return `${base}/api/entries`;
  }

  async function runTesterRequest({ method, payload, actionLabel }) {
    const endpoint = resolveTesterEndpoint();
    setTesterBusy(true);
    setTesterResult(`Running ${actionLabel}...`);

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      let parsedBody = rawText;
      try {
        parsedBody = rawText ? JSON.parse(rawText) : {};
      } catch {
        // Keep plain text body if response is not JSON
      }

      const output = {
        request: { method, url: endpoint, body: payload },
        response: { status: res.status, ok: res.ok, body: parsedBody },
      };

      setTesterResult(JSON.stringify(output, null, 2));
      if (res.ok) fetchData();
    } catch (error) {
      setTesterResult(
        JSON.stringify(
          {
            request: { method, url: endpoint, body: payload },
            error: error?.message || "Request failed",
          },
          null,
          2,
        ),
      );
    } finally {
      setTesterBusy(false);
    }
  }

  async function testCreateEntry(e) {
    e.preventDefault();
    if (!testerName.trim() || !testerMessage.trim()) return;

    await runTesterRequest({
      method: "POST",
      actionLabel: "entry test",
      payload: {
        owner_username: username,
        sender_name: testerName.trim(),
        sender_website: testerWebsite.trim(),
        message: testerMessage.trim(),
        parent_id: null,
        is_private: testerIsPrivate,
        bot_field: "",
      },
    });
  }

  async function testCreateReply(e) {
    e.preventDefault();
    const parsedParentId = Number(testerReplyParentId);
    if (
      !testerName.trim() ||
      !testerMessage.trim() ||
      !Number.isInteger(parsedParentId) ||
      parsedParentId <= 0
    ) {
      return;
    }

    await runTesterRequest({
      method: "POST",
      actionLabel: "reply test",
      payload: {
        owner_username: username,
        sender_name: testerName.trim(),
        sender_website: testerWebsite.trim(),
        message: testerMessage.trim(),
        parent_id: parsedParentId,
        is_private: false,
        bot_field: "",
      },
    });
  }

  async function testLikeEntry(e) {
    e.preventDefault();
    const parsedLikeId = Number(testerLikeId);
    if (!Number.isInteger(parsedLikeId) || parsedLikeId <= 0) return;

    await runTesterRequest({
      method: "PUT",
      actionLabel: "like test",
      payload: { action: "like", id: parsedLikeId },
    });
  }

  async function exportAllData() {
    setDataTransferBusy(true);
    try {
      const res = await fetch("/api/entries?export=1", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to export data");
      }

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${username}-guestbook-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error?.message || "Failed to export data.");
    } finally {
      setDataTransferBusy(false);
    }
  }

  async function importAllDataFromFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setDataTransferBusy(true);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);

      if (parsed?.owner_username && parsed.owner_username !== username) {
        throw new Error("This export belongs to a different username.");
      }

      if (!Array.isArray(parsed?.entries) || !parsed?.profile) {
        throw new Error("Invalid export file format.");
      }

      const confirmed = confirm(
        "Import will replace all your current guestbook entries and profile customization. Continue?",
      );
      if (!confirmed) return;

      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "import_all",
          owner_username: username,
          data: parsed,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Import failed");
      }

      alert("Data imported successfully.");
      fetchData();
    } catch (error) {
      alert(error?.message || "Failed to import data.");
    } finally {
      e.target.value = "";
      setDataTransferBusy(false);
    }
  }

  // Tab content components
  const OverviewTab = () => (
    <>
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Threads</div>
          <div className="stat-value">{rootEntryCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Replies</div>
          <div className="stat-value">{replyCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Private</div>
          <div className="stat-value">{privateCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Likes</div>
          <div className="stat-value">{likesTotal}</div>
        </div>
      </div>

      <div className="panel-card">
        <div className="entries-header">
          <h3 style={{ margin: 0 }}>Recent Entries</h3>
          <span className="entries-count">{entries.length}</span>
        </div>

        {entries.length === 0 ? (
          <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
            No messages yet.
          </p>
        ) : (
          <div className="entries-list" style={{ marginTop: "1rem" }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="entry-card"
                style={{ marginBottom: "1rem" }}
              >
                <header className="entry-card-header">
                  <div className="entry-title-row">
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
                          <IconExternalLink />
                        </a>
                      )}
                      <span className="badge-group">
                        {entry.status === "pending" && (
                          <span className="badge pending">Pending</span>
                        )}
                        {entry.is_private === 1 && (
                          <span className="badge private">Private</span>
                        )}
                        {entry.is_owner === 1 && (
                          <span className="badge owner">Owner</span>
                        )}
                      </span>
                    </div>
                    <div className="entry-date">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="entry-metrics">
                    <IconHeart />
                    <span>{entry.likes || 0}</span>
                  </div>
                </header>

                <div className="entry-content">{entry.message}</div>

                <div className="entry-actions">
                  {entry.status === "pending" && (
                    <button onClick={() => approveEntry(entry.id)}>
                      <IconCheck />
                      <span>Approve</span>
                    </button>
                  )}
                  <button
                    className="secondary"
                    onClick={() => setReplyingTo(entry.id)}
                  >
                    <IconReply />
                    <span>Reply</span>
                  </button>
                  <button
                    className="danger"
                    onClick={() => deleteEntry(entry.id)}
                  >
                    <IconTrash />
                    <span>Delete</span>
                  </button>
                </div>

                {replyingTo === entry.id && (
                  <div style={{ marginTop: "1rem" }}>
                    <textarea
                      rows="2"
                      value={replyMsg}
                      onChange={(e) => setReplyMsg(e.target.value)}
                      placeholder="Write a reply as the owner..."
                      style={{ marginBottom: "0.5rem", minHeight: "80px" }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => sendReply(entry.id)}>Send</button>
                      <button
                        className="secondary"
                        onClick={() => setReplyingTo(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const EmbedTab = () => (
    <>
      <div className="panel-card">
        <h3>Embed on your site</h3>
        <p>Paste this snippet into any HTML page to embed your guestbook.</p>
        <textarea
          className="code-textarea"
          rows={12}
          readOnly
          value={embedSnippet || "Loading embed code..."}
          style={{ marginBottom: "1rem" }}
        />
        <div className="form-group">
          <label>Embed CSS URL (optional)</label>
          <input
            type="url"
            placeholder="https://example.com/embed.css"
            value={embedCssUrl}
            onChange={(e) => setEmbedCssUrl(e.target.value)}
          />
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              marginTop: "0.5rem",
              marginBottom: 0,
            }}
          >
            This stylesheet loads inside the iframe so you can style the embed
            independently.
          </p>
        </div>
        <div className="actions-row" style={{ marginTop: "1rem" }}>
          <button
            className="secondary"
            onClick={() => copyText(embedSnippet)}
            disabled={!embedSnippet}
          >
            <IconCopy />
            <span>Copy embed code</span>
          </button>
          {embedSrc && (
            <a href={embedSrc} target="_blank" rel="noreferrer">
              <button className="secondary" type="button">
                <IconExternalLink />
                <span>Preview embed</span>
              </button>
            </a>
          )}
          <button onClick={saveSettings}>Save Embed Settings</button>
        </div>
      </div>

      <div className="panel-card">
        <h3>Headless API</h3>
        <p>Build your own UI with the API. Supports cross-origin requests.</p>

        <h4 style={{ marginTop: "1rem" }}>Custom form</h4>
        <textarea
          className="code-textarea"
          rows={10}
          readOnly
          value={headlessSubmitSnippet || "Loading..."}
        />
        <div className="actions-row">
          <button
            className="secondary"
            onClick={() => copyText(headlessSubmitSnippet)}
          >
            <IconCopy /> Copy
          </button>
        </div>

        <h4 style={{ marginTop: "1.5rem" }}>Reply to entry</h4>
        <textarea
          className="code-textarea"
          rows={10}
          readOnly
          value={headlessReplySnippet || "Loading..."}
        />
        <div className="actions-row">
          <button
            className="secondary"
            onClick={() => copyText(headlessReplySnippet)}
          >
            <IconCopy /> Copy
          </button>
        </div>

        <h4 style={{ marginTop: "1.5rem" }}>Like an entry</h4>
        <textarea
          className="code-textarea"
          rows={8}
          readOnly
          value={headlessLikeSnippet || "Loading..."}
        />
        <div className="actions-row">
          <button
            className="secondary"
            onClick={() => copyText(headlessLikeSnippet)}
          >
            <IconCopy /> Copy
          </button>
        </div>

        <h4 style={{ marginTop: "1.5rem" }}>Widget renderer</h4>
        <textarea
          className="code-textarea"
          rows={7}
          readOnly
          value={headlessWidgetSnippet || "Loading..."}
        />
        <div className="actions-row">
          <button
            className="secondary"
            onClick={() => copyText(headlessWidgetSnippet)}
          >
            <IconCopy /> Copy
          </button>
        </div>

        <h4 style={{ marginTop: "1.5rem" }}>Example CSS</h4>
        <textarea
          className="code-textarea"
          rows={10}
          readOnly
          value={headlessCssExample}
        />
        <div className="actions-row">
          <button
            className="secondary"
            onClick={() => copyText(headlessCssExample)}
          >
            <IconCopy /> Copy
          </button>
        </div>

        <h4 style={{ marginTop: "1.5rem" }}>API reference</h4>
        <textarea
          className="code-textarea"
          rows={18}
          readOnly
          value={headlessApiDocs || "Loading..."}
        />
        <div className="actions-row">
          <button
            className="secondary"
            onClick={() => copyText(headlessApiDocs)}
          >
            <IconCopy /> Copy
          </button>
        </div>
      </div>
    </>
  );

  const SettingsTab = () => (
    <>
      <div className="panel-card">
        <h3>Moderation</h3>
        <p>Control how new messages appear on your guestbook.</p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={requireApproval}
            onChange={(e) => setRequireApproval(e.target.checked)}
          />
          Require approval for new messages
        </label>
        <div className="actions-row" style={{ marginTop: "1rem" }}>
          <button onClick={saveSettings}>Save Moderation</button>
        </div>
      </div>

      <div className="panel-card">
        <h3>Customize Appearance</h3>
        <p>Inject custom CSS and HTML into your public guestbook page.</p>
        <div className="dashboard-grid">
          <div className="form-group">
            <label>Custom CSS</label>
            <textarea
              rows="6"
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              placeholder="/* Add styles here */"
              className="code-textarea"
            />
          </div>
          <div className="form-group">
            <label>Custom HTML header</label>
            <textarea
              rows="6"
              value={customHtml}
              onChange={(e) => setCustomHtml(e.target.value)}
              placeholder="<!-- Add HTML here -->"
              className="code-textarea"
            />
          </div>
        </div>
        <div className="actions-row">
          <button onClick={saveSettings}>Save Appearance</button>
        </div>
      </div>
    </>
  );

  const DataTab = () => (
    <>
      <div className="panel-card">
        <h3>Data Backup</h3>
        <p>
          Export all your guestbook data as JSON, or import a previous export.
        </p>
        <div className="actions-row" style={{ marginTop: 0 }}>
          <button
            className="secondary"
            onClick={exportAllData}
            disabled={dataTransferBusy}
          >
            Export all data
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => importFileRef.current?.click()}
            disabled={dataTransferBusy}
          >
            Import JSON
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={importAllDataFromFile}
          />
        </div>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            marginTop: "1rem",
            marginBottom: 0,
          }}
        >
          Import replaces your current entries and appearance settings.
        </p>
      </div>

      <div className="panel-card">
        <h3>Add Past Entry</h3>
        <p>Manually import entries from an older guestbook.</p>
        <form onSubmit={addImportedEntry} style={{ marginBottom: 0 }}>
          <div className="dashboard-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="form-group">
              <label>Website (optional)</label>
              <input
                type="url"
                value={importWebsite}
                onChange={(e) => setImportWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Date *</label>
            <input
              type="datetime-local"
              value={importDate}
              onChange={(e) => setImportDate(e.target.value)}
              required
              style={{ maxWidth: "300px" }}
            />
          </div>
          <div className="form-group">
            <label>Message *</label>
            <textarea
              rows={4}
              value={importMessage}
              onChange={(e) => setImportMessage(e.target.value)}
              placeholder="Write the original message..."
              required
            />
          </div>
          <button type="submit" className="secondary">
            Add entry
          </button>
        </form>
      </div>
    </>
  );

  const TesterTab = () => (
    <>
      <div className="panel-card">
        <h3>API Tester</h3>
        <p>Test entry, reply, and like calls against your endpoint.</p>

        <div className="form-group">
          <label>Base URL</label>
          <input
            type="url"
            placeholder="https://your-app.vercel.app"
            value={testerBaseUrl}
            onChange={(e) => setTesterBaseUrl(e.target.value)}
          />
        </div>

        <div className="tester-grid">
          <div className="tester-card">
            <h4>Test Entry (POST)</h4>
            <form onSubmit={testCreateEntry} style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={testerName}
                  onChange={(e) => setTesterName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={testerWebsite}
                  onChange={(e) => setTesterWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea
                  rows={3}
                  value={testerMessage}
                  onChange={(e) => setTesterMessage(e.target.value)}
                  required
                />
              </div>
              <label
                className="checkbox-label"
                style={{ marginBottom: "0.75rem" }}
              >
                <input
                  type="checkbox"
                  checked={testerIsPrivate}
                  onChange={(e) => setTesterIsPrivate(e.target.checked)}
                />
                Private message
              </label>
              <button type="submit" disabled={testerBusy}>
                Run entry test
              </button>
            </form>
          </div>

          <div className="tester-card">
            <h4>Test Reply (POST)</h4>
            <form onSubmit={testCreateReply} style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label>Parent Entry ID *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={testerReplyParentId}
                  onChange={(e) => setTesterReplyParentId(e.target.value)}
                  placeholder="123"
                  required
                />
              </div>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.875rem",
                  marginBottom: "0.75rem",
                }}
              >
                Uses name/website/message from entry test.
              </p>
              <button type="submit" disabled={testerBusy}>
                Run reply test
              </button>
            </form>
          </div>
        </div>

        <div className="tester-card" style={{ marginTop: "1rem" }}>
          <h4>Test Like (PUT)</h4>
          <form onSubmit={testLikeEntry} style={{ marginBottom: 0 }}>
            <div
              style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}
            >
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label>Entry ID *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={testerLikeId}
                  onChange={(e) => setTesterLikeId(e.target.value)}
                  placeholder="123"
                  required
                />
              </div>
              <button type="submit" disabled={testerBusy}>
                Run like test
              </button>
            </div>
          </form>
        </div>

        <h4 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>Output</h4>
        <textarea
          className="code-textarea"
          rows={14}
          readOnly
          value={testerResult || "Run a test to see output."}
        />
      </div>
    </>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "embed":
        return <EmbedTab />;
      case "settings":
        return <SettingsTab />;
      case "data":
        return <DataTab />;
      case "tester":
        return <TesterTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <div className="dashboard-subheader">
            <span>Public link:</span>
            <a
              className="dashboard-link"
              href={`/u/${username}`}
              target="_blank"
              rel="noreferrer"
            >
              /u/{username} <IconExternalLink />
            </a>
          </div>
        </div>
        <button
          className="secondary"
          onClick={() => {
            localStorage.clear();
            navigate("/");
          }}
        >
          Logout
        </button>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-button${activeTab === tab.id ? " active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">{renderTabContent()}</div>
    </div>
  );
}
