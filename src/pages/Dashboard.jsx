import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../components/Toast.jsx";

import Sidebar              from "../features/dashboard/Sidebar.jsx";
import OverviewTab          from "../features/dashboard/OverviewTab.jsx";
import EmbedTab             from "../features/dashboard/EmbedTab.jsx";
import SettingsTab          from "../features/dashboard/SettingsTab.jsx";
import DataTab              from "../features/dashboard/DataTab.jsx";
import TesterTab            from "../features/dashboard/TesterTab.jsx";
import FormsOverviewTab     from "../features/dashboard/FormsOverviewTab.jsx";
import FormsTab, { makeField } from "../features/dashboard/FormsTab.jsx";
import FormsIntegrationTab  from "../features/dashboard/FormsIntegrationTab.jsx";
import SubmissionsTab       from "../features/dashboard/SubmissionsTab.jsx";
import CommentsOverviewTab  from "../features/dashboard/CommentsOverviewTab.jsx";
import CommentsTab          from "../features/dashboard/CommentsTab.jsx";
import CommentsIntegrationTab from "../features/dashboard/CommentsIntegrationTab.jsx";
import ModerationTab        from "../features/dashboard/ModerationTab.jsx";
import LikesTab             from "../features/dashboard/LikesTab.jsx";
import AccountTab           from "../features/dashboard/AccountTab.jsx";

const TAB_TITLES = {
  overview:              "Overview",
  embed:                 "Embed",
  settings:              "Settings",
  data:                  "Data",
  tester:                "API Tester",
  "forms-overview":      "Forms Overview",
  forms:                 "Form Builder",
  "forms-integration":   "Integration",
  submissions:           "Submissions",
  "comments-overview":   "Comments Overview",
  "comment-sections":    "Sections",
  "comments-integration":"Integration",
  "comment-moderation":  "Moderation",
  likes:                 "Likes",
  account:               "Account",
};

export default function Dashboard() {
  const toast    = useToast();
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const handleTabChange = (tabId) => setSearchParams({ tab: tabId });

  // ── Guestbook ────────────────────────────────────────────────
  const [entries,          setEntries]          = useState([]);
  const [customCss,        setCustomCss]        = useState("");
  const [customHtml,       setCustomHtml]       = useState("");
  const [embedCssUrl,      setEmbedCssUrl]      = useState("");
  const [requireApproval,  setRequireApproval]  = useState(false);
  const [origin,           setOrigin]           = useState("");
  const [replyingTo,       setReplyingTo]       = useState(null);
  const [replyMsg,         setReplyMsg]         = useState("");
  const [dataTransferBusy, setDataTransferBusy] = useState(false);

  // Account
  const [email, setEmail] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramNotifications, setTelegramNotifications] = useState(false);

  // Import form state
  const [importName,    setImportName]    = useState("");
  const [importWebsite, setImportWebsite] = useState("");
  const [importDate,    setImportDate]    = useState("");
  const [importMessage, setImportMessage] = useState("");
  const importFileRef = useRef(null);

  // API Tester
  const [testerBaseUrl,        setTesterBaseUrl]        = useState("");
  const [testerName,           setTesterName]           = useState("");
  const [testerWebsite,        setTesterWebsite]        = useState("");
  const [testerMessage,        setTesterMessage]        = useState("");
  const [testerIsPrivate,      setTesterIsPrivate]      = useState(false);
  const [testerReplyParentId,  setTesterReplyParentId]  = useState("");
  const [testerLikeId,         setTesterLikeId]         = useState("");
  const [testerResult,         setTesterResult]         = useState("");
  const [testerBusy,           setTesterBusy]           = useState(false);

  // ── Forms ────────────────────────────────────────────────────
  const [forms,               setForms]               = useState([]);
  const [formsBusy,           setFormsBusy]           = useState(false);
  const [editingForm,         setEditingForm]         = useState(null);
  const [formName,            setFormName]            = useState("");
  const [formFields,          setFormFields]          = useState([]);
  const [selectedFormId,      setSelectedFormId]      = useState("");
  const [submissions,         setSubmissions]         = useState([]);
  const [submissionsBusy,     setSubmissionsBusy]     = useState(false);
  const [expandedSubmission,  setExpandedSubmission]  = useState(null);

  // Forms overview — all submissions flattened
  const [overviewSubmissions,        setOverviewSubmissions]        = useState([]);
  const [overviewSubmissionsLoading, setOverviewSubmissionsLoading] = useState(false);

  // ── Comments ─────────────────────────────────────────────────
  const [commentSections,    setCommentSections]    = useState([]);
  const [commentsBusy,       setCommentsBusy]       = useState(false);
  const [editingSection,     setEditingSection]     = useState(null);
  const [sectionName,        setSectionName]        = useState("");
  const [sectionSettings,    setSectionSettings]    = useState({
    fields: {
      name:  { show: true,  required: true  },
      email: { show: true,  required: true  },
      url:   { show: false, required: false },
    },
    allow_anonymous:  false,
    allow_likes:      true,
    require_approval: false,
  });
  const [selectedSectionId,  setSelectedSectionId]  = useState("");
  const [allComments,        setAllComments]         = useState([]);
  const [allCommentsBusy,    setAllCommentsBusy]     = useState(false);
  const [replyingToComment,  setReplyingToComment]   = useState(null);
  const [commentReplyMsg,    setCommentReplyMsg]     = useState("");

  // Comments overview — all comments from all sections
  const [overviewComments,        setOverviewComments]        = useState([]);
  const [overviewCommentsLoading, setOverviewCommentsLoading] = useState(false);

  // ── Likes ────────────────────────────────────────────────────
  const [likesSummary, setLikesSummary] = useState({ total_likes: 0, post_count: 0, top_posts: [] });
  const [likesBusy,    setLikesBusy]   = useState(false);
  const [likesPostUrl, setLikesPostUrl] = useState("");
  const [likesAction,  setLikesAction]  = useState("get");
  const [likesResult,  setLikesResult]  = useState("");

  // ── Bootstrap ─────────────────────────────────────────────────
  useEffect(() => {
    setOrigin(window.location.origin);
    setTesterBaseUrl(window.location.origin);
    if (!token) { navigate("/"); return; }
    fetchData();
  }, [token]);

  // Trigger per-tab fetches when activeTab changes
  useEffect(() => {
    if (activeTab === "submissions" && selectedFormId) fetchSubmissions(selectedFormId);
    if (activeTab === "comment-moderation" && selectedSectionId) fetchComments(selectedSectionId);
    if (activeTab === "likes") fetchLikesSummary();
  }, [activeTab, selectedFormId, selectedSectionId]);

  // Forms overview: fetch when navigating there and forms are loaded
  useEffect(() => {
    if (activeTab === "forms-overview" && forms.length > 0) fetchOverviewSubmissions();
  }, [activeTab, forms.length]);

  // Comments overview: fetch when navigating there and sections are loaded
  useEffect(() => {
    if (activeTab === "comments-overview" && commentSections.length > 0) fetchOverviewComments();
  }, [activeTab, commentSections.length]);

  // ── Fetch helpers ──────────────────────────────────────────────
  async function fetchData() {
    const [entryRes, profileRes] = await Promise.all([
      fetch("/api/entries", { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/user?username=${username}`),
    ]);
    if (entryRes.ok)   setEntries(await entryRes.json());
    if (profileRes.ok) {
      const d = await profileRes.json();
      setCustomCss(d.custom_css || "");
      setCustomHtml(d.custom_html || "");
      setEmbedCssUrl(d.embed_css_url || "");
      setRequireApproval(d.require_approval === 1);
      setEmail(d.email || "");
      setTelegramChatId(d.telegram_chat_id || "");
      setTelegramNotifications(d.telegram_notifications === 1);
    }
    fetchForms();
    fetchCommentSections();
  }

  async function fetchForms() {
    const res = await fetch("/api/forms", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setForms(await res.json());
  }

  async function fetchSubmissions(formId) {
    if (!formId) { setSubmissions([]); return; }
    setSubmissionsBusy(true);
    const res = await fetch(`/api/submissions?form=${formId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setSubmissions(await res.json());
    setSubmissionsBusy(false);
  }

  async function fetchOverviewSubmissions() {
    if (!forms.length) return;
    setOverviewSubmissionsLoading(true);
    try {
      const all = [];
      await Promise.all(
        forms.map(async (form) => {
          const res = await fetch(`/api/submissions?form=${form.id}`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const subs = await res.json();
            all.push(...subs.map((s) => ({ ...s, formId: form.id, formName: form.name, formFields: form.fields })));
          }
        })
      );
      all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOverviewSubmissions(all);
    } finally { setOverviewSubmissionsLoading(false); }
  }

  async function fetchCommentSections() {
    const res = await fetch("/api/comment-sections", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCommentSections(await res.json());
  }

  async function fetchComments(sectionId) {
    if (!sectionId) { setAllComments([]); return; }
    setAllCommentsBusy(true);
    const res = await fetch(`/api/comments?section=${sectionId}&auth=1`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setAllComments(d.comments || []); }
    setAllCommentsBusy(false);
  }

  async function fetchOverviewComments() {
    if (!commentSections.length) return;
    setOverviewCommentsLoading(true);
    try {
      const all = [];
      await Promise.all(
        commentSections.map(async (section) => {
          const res = await fetch(`/api/comments?section=${section.id}&auth=1`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const d = await res.json();
            all.push(...(d.comments || []).map((c) => ({ ...c, sectionName: section.name })));
          }
        })
      );
      all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOverviewComments(all);
    } finally { setOverviewCommentsLoading(false); }
  }

  async function fetchLikesSummary() {
    if (!username) return;
    setLikesBusy(true);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "summary", owner_username: username }),
      });
      if (res.ok) {
        const d = await res.json();
        setLikesSummary({ total_likes: d.total_likes || 0, post_count: d.post_count || 0, top_posts: Array.isArray(d.top_posts) ? d.top_posts : [] });
      }
    } finally { setLikesBusy(false); }
  }

  // ── Actions ────────────────────────────────────────────────────
  async function saveSettings() {
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        custom_css: customCss,
        custom_html: customHtml,
        embed_css_url: embedCssUrl,
        require_approval: requireApproval,
        email,
        telegram_chat_id: telegramChatId,
        telegram_notifications: telegramNotifications
      }),
    });
    if (res.ok) { toast.success("Saved", "Settings updated."); }
    else { const d = await res.json().catch(() => ({})); toast.error("Error", d.error || "Failed to save."); }
  }

  async function deleteEntry(id) {
    if (!confirm("Delete this entry?")) return;
    await fetch("/api/entries", { method: "DELETE", body: JSON.stringify({ id }), headers: { Authorization: `Bearer ${token}` } });
    toast.info("Deleted", "Entry removed.");
    fetchData();
  }

  async function approveEntry(id) {
    await fetch("/api/entries", { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "approve", id }) });
    toast.success("Approved", "Entry is now visible.");
    fetchData();
  }

  async function sendReply(parentId) {
    if (!replyMsg.trim()) return;
    await fetch("/api/entries", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ owner_username: username, sender_name: username, message: replyMsg, parent_id: parentId }) });
    setReplyMsg(""); setReplyingTo(null);
    toast.success("Reply sent");
    fetchData();
  }

  async function addImportedEntry(e) {
    e.preventDefault();
    const dateObj = new Date(importDate);
    if (Number.isNaN(dateObj.getTime())) { toast.error("Error", "Please provide a valid date."); return; }
    const res = await fetch("/api/entries", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "import", owner_username: username, sender_name: importName, sender_website: importWebsite, message: importMessage, created_at: dateObj.toISOString() }) });
    if (res.ok) { setImportName(""); setImportWebsite(""); setImportDate(""); setImportMessage(""); toast.success("Added", "Entry imported."); fetchData(); }
    else { const d = await res.json().catch(() => ({})); toast.error("Error", d.error || "Failed to add entry."); }
  }

  async function exportAllData() {
    setDataTransferBusy(true);
    try {
      const res = await fetch("/api/entries?export=1", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${username}-guestbook-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
      toast.success("Exported");
    } catch (err) { toast.error("Export failed", err?.message); }
    finally { setDataTransferBusy(false); }
  }

  async function importAllDataFromFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setDataTransferBusy(true);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      if (!confirm("Import will replace all your current entries and profile customization. Continue?")) return;
      const res = await fetch("/api/entries", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "import_all", owner_username: username, data: parsed }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Import failed"); }
      toast.success("Imported"); fetchData();
    } catch (err) { toast.error("Import failed", err?.message); }
    finally { e.target.value = ""; setDataTransferBusy(false); }
  }

  // Forms
  function startNewForm() { setEditingForm("new"); setFormName(""); setFormFields([makeField({ name: "name", label: "Name", type: "text", required: true }), makeField({ name: "email", label: "Email", type: "email", required: true }), makeField({ name: "message", label: "Message", type: "textarea", required: true })]); }
  function startEditForm(form) { setEditingForm(form.id); setFormName(form.name); setFormFields(form.fields.map((f) => makeField(f))); }
  function cancelFormEdit() { setEditingForm(null); setFormName(""); setFormFields([]); }
  function addField() { setFormFields([...formFields, makeField({ name: `field_${formFields.length + 1}`, label: "New Field", type: "text" })]); }
  function updateField(i, upd) { const u = [...formFields]; u[i] = { ...u[i], ...upd }; setFormFields(u); }
  function removeField(i) { setFormFields(formFields.filter((_, j) => j !== i)); }
  function moveField(i, dir) { const ni = i + dir; if (ni < 0 || ni >= formFields.length) return; const u = [...formFields]; [u[i], u[ni]] = [u[ni], u[i]]; setFormFields(u); }

  async function saveForm() {
    if (!formName.trim()) { toast.error("Error", "Form name is required"); return; }
    if (!formFields.length) { toast.error("Error", "Add at least one field"); return; }
    setFormsBusy(true);
    const payload = { name: formName, fields: formFields.map(({ _id, ...f }) => f) };
    if (editingForm !== "new") payload.id = editingForm;
    const res = await fetch("/api/forms", { method: editingForm === "new" ? "POST" : "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
    if (res.ok) { toast.success(editingForm === "new" ? "Form created!" : "Form updated!"); cancelFormEdit(); fetchForms(); }
    else { const d = await res.json().catch(() => ({})); toast.error("Error", d.error || "Failed to save"); }
    setFormsBusy(false);
  }

  async function deleteForm(formId) {
    if (!confirm("Delete this form and all its submissions?")) return;
    const res = await fetch("/api/forms", { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: formId }) });
    if (res.ok) { toast.info("Deleted"); fetchForms(); if (selectedFormId === formId) { setSelectedFormId(""); setSubmissions([]); } }
    else { const d = await res.json().catch(() => ({})); toast.error("Error", d.error || "Failed to delete"); }
  }

  async function deleteSubmission(id) {
    if (!confirm("Delete this submission?")) return;
    const res = await fetch("/api/submissions", { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
    if (res.ok) { toast.info("Deleted"); fetchSubmissions(selectedFormId); }
  }

  async function exportFormSubmissions() {
    const res = await fetch(`/api/submissions?form=${selectedFormId}&export=1`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const fname = forms.find((f) => f.id === selectedFormId)?.name || "form";
      a.href = url; a.download = `${fname}-submissions-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
    }
  }

  // Comments
  function startNewSection() { setEditingSection("new"); setSectionName(""); setSectionSettings({ fields: { name: { show: true, required: true }, email: { show: true, required: true }, url: { show: false, required: false } }, allow_anonymous: false, allow_likes: true, require_approval: false }); }
  function startEditSection(s) { setEditingSection(s.id); setSectionName(s.name); setSectionSettings(s.settings); }

  async function saveSection() {
    if (!sectionName.trim()) { toast.error("Error", "Name is required"); return; }
    setCommentsBusy(true);
    const payload = { name: sectionName, settings: sectionSettings };
    if (editingSection !== "new") payload.id = editingSection;
    const res = await fetch("/api/comment-sections", { method: editingSection === "new" ? "POST" : "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
    if (res.ok) { setEditingSection(null); toast.success("Saved"); fetchCommentSections(); }
    else { toast.error("Error", "Failed to save section"); }
    setCommentsBusy(false);
  }

  async function deleteSection(id) {
    if (!confirm("Delete this section and all comments?")) return;
    await fetch("/api/comment-sections", { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
    toast.info("Deleted"); fetchCommentSections();
    if (selectedSectionId === id) { setSelectedSectionId(""); setAllComments([]); }
  }

  async function approveComment(id) {
    await fetch("/api/comments", { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "approve", id }) });
    toast.success("Approved");
    fetchComments(selectedSectionId);
    // Refresh overview too
    if (overviewComments.length) fetchOverviewComments();
  }

  async function deleteComment(id) {
    if (!confirm("Delete this comment?")) return;
    await fetch("/api/comments", { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
    toast.info("Deleted");
    fetchComments(selectedSectionId);
    setOverviewComments((prev) => prev.filter((c) => c.id !== id));
  }

  async function sendCommentReply(parentId) {
    if (!commentReplyMsg.trim()) return;
    await fetch("/api/comments", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ section_id: selectedSectionId, comment_text: commentReplyMsg, parent_id: parentId }) });
    setCommentReplyMsg(""); setReplyingToComment(null);
    toast.success("Reply sent");
    fetchComments(selectedSectionId);
  }

  // API Tester
  function resolveTesterEndpoint() {
    const base = (testerBaseUrl || origin).trim().replace(/\/+$/, "");
    return `${base}/api/entries`;
  }

  async function runTesterRequest({ method, payload, actionLabel }) {
    setTesterBusy(true); setTesterResult(`Running ${actionLabel}…`);
    const endpoint = resolveTesterEndpoint();
    try {
      const res = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const rawText = await res.text();
      let parsed = rawText; try { parsed = rawText ? JSON.parse(rawText) : {}; } catch {}
      setTesterResult(JSON.stringify({ request: { method, url: endpoint, body: payload }, response: { status: res.status, ok: res.ok, body: parsed } }, null, 2));
      if (res.ok) fetchData();
    } catch (err) {
      setTesterResult(JSON.stringify({ request: { method, url: endpoint, body: payload }, error: err?.message || "Request failed" }, null, 2));
    } finally { setTesterBusy(false); }
  }

  async function testCreateEntry(e) { e.preventDefault(); await runTesterRequest({ method: "POST", actionLabel: "entry test", payload: { owner_username: username, sender_name: testerName.trim(), sender_website: testerWebsite.trim(), message: testerMessage.trim(), parent_id: null, is_private: testerIsPrivate, bot_field: "" } }); }
  async function testCreateReply(e) { e.preventDefault(); const pid = Number(testerReplyParentId); await runTesterRequest({ method: "POST", actionLabel: "reply test", payload: { owner_username: username, sender_name: testerName.trim(), sender_website: testerWebsite.trim(), message: testerMessage.trim(), parent_id: pid, is_private: false, bot_field: "" } }); }
  async function testLikeEntry(e) { e.preventDefault(); const lid = Number(testerLikeId); await runTesterRequest({ method: "PUT", actionLabel: "like test", payload: { action: "like", id: lid } }); }

  async function runLikesRequest(e) {
    e.preventDefault();
    setLikesBusy(true); setLikesResult("Running…");
    const payload = { action: likesAction, owner_username: username };
    if (likesAction === "like" || likesAction === "get") payload.post_url = likesPostUrl.trim();
    try {
      const res = await fetch("/api/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const rawText = await res.text(); let parsed = rawText; try { parsed = rawText ? JSON.parse(rawText) : {}; } catch {}
      setLikesResult(JSON.stringify({ request: { body: payload }, response: { status: res.status, body: parsed } }, null, 2));
      if (res.ok) fetchLikesSummary();
    } catch (err) { setLikesResult(JSON.stringify({ error: err?.message }), null, 2); }
    finally { setLikesBusy(false); }
  }

  // ── Derived ────────────────────────────────────────────────────
  const rootEntryCount = entries.filter((e) => !e.parent_id).length;
  const replyCount     = entries.filter((e) => !!e.parent_id).length;
  const pendingCount   = entries.filter((e) => e.status === "pending").length;
  const privateCount   = entries.filter((e) => e.is_private === 1).length;
  const likesTotal     = entries.reduce((s, e) => s + (e.likes || 0), 0);

  // ── Tab Renderer ───────────────────────────────────────────────
  function renderTab() {
    switch (activeTab) {
      case "overview": return (
        <OverviewTab
          entries={entries}
          rootEntryCount={rootEntryCount} replyCount={replyCount}
          pendingCount={pendingCount}     privateCount={privateCount}
          likesTotal={likesTotal}
          replyingTo={replyingTo}         setReplyingTo={setReplyingTo}
          replyMsg={replyMsg}             setReplyMsg={setReplyMsg}
          approveEntry={approveEntry}     deleteEntry={deleteEntry}
          sendReply={sendReply}
          telegramChatId={telegramChatId}
          telegramNotifications={telegramNotifications}
          onOpenAccountSettings={() => handleTabChange("account")}
        />
      );
      case "embed": return (
        <EmbedTab
          origin={origin} username={username}
          embedCssUrl={embedCssUrl} setEmbedCssUrl={setEmbedCssUrl}
          saveSettings={saveSettings}
        />
      );
      case "settings": return (
        <SettingsTab
          requireApproval={requireApproval} setRequireApproval={setRequireApproval}
          customCss={customCss}             setCustomCss={setCustomCss}
          customHtml={customHtml}           setCustomHtml={setCustomHtml}
          saveSettings={saveSettings}
        />
      );
      case "account": return (
        <AccountTab
          email={email} setEmail={setEmail}
          telegramChatId={telegramChatId} setTelegramChatId={setTelegramChatId}
          telegramNotifications={telegramNotifications} setTelegramNotifications={setTelegramNotifications}
          saveSettings={saveSettings}
        />
      );
      case "data": return (
        <DataTab
          importFileRef={importFileRef}
          dataTransferBusy={dataTransferBusy}
          exportAllData={exportAllData}
          importAllDataFromFile={importAllDataFromFile}
          importName={importName}       setImportName={setImportName}
          importWebsite={importWebsite} setImportWebsite={setImportWebsite}
          importDate={importDate}       setImportDate={setImportDate}
          importMessage={importMessage} setImportMessage={setImportMessage}
          addImportedEntry={addImportedEntry}
        />
      );
      case "tester": return (
        <TesterTab
          origin={origin}
          testerBaseUrl={testerBaseUrl}             setTesterBaseUrl={setTesterBaseUrl}
          testerName={testerName}                   setTesterName={setTesterName}
          testerWebsite={testerWebsite}             setTesterWebsite={setTesterWebsite}
          testerMessage={testerMessage}             setTesterMessage={setTesterMessage}
          testerIsPrivate={testerIsPrivate}         setTesterIsPrivate={setTesterIsPrivate}
          testerReplyParentId={testerReplyParentId} setTesterReplyParentId={setTesterReplyParentId}
          testerLikeId={testerLikeId}               setTesterLikeId={setTesterLikeId}
          testerResult={testerResult}
          testerBusy={testerBusy}
          testCreateEntry={testCreateEntry}
          testCreateReply={testCreateReply}
          testLikeEntry={testLikeEntry}
        />
      );

      // ── Contact Forms ────────────────────────────────────────────
      case "forms-overview": return (
        <FormsOverviewTab
          forms={forms}
          overviewSubmissions={overviewSubmissions}
          overviewSubmissionsLoading={overviewSubmissionsLoading}
        />
      );
      case "forms": return (
        <FormsTab
          forms={forms}
          formsBusy={formsBusy}
          editingForm={editingForm}
          formName={formName}     setFormName={setFormName}
          formFields={formFields} setFormFields={setFormFields}
          startNewForm={startNewForm}
          startEditForm={startEditForm}
          cancelFormEdit={cancelFormEdit}
          addField={addField}
          updateField={updateField}
          removeField={removeField}
          moveField={moveField}
          saveForm={saveForm}
          deleteForm={deleteForm}
        />
      );
      case "forms-integration": return (
        <FormsIntegrationTab
          origin={origin}
          forms={forms}
          selectedFormId={selectedFormId} setSelectedFormId={setSelectedFormId}
        />
      );
      case "submissions": return (
        <SubmissionsTab
          forms={forms}
          selectedFormId={selectedFormId}           setSelectedFormId={setSelectedFormId}
          submissions={submissions}
          submissionsBusy={submissionsBusy}
          expandedSubmission={expandedSubmission}   setExpandedSubmission={setExpandedSubmission}
          fetchSubmissions={fetchSubmissions}
          deleteSubmission={deleteSubmission}
          exportFormSubmissions={exportFormSubmissions}
        />
      );

      // ── Comments ─────────────────────────────────────────────────
      case "comments-overview": return (
        <CommentsOverviewTab
          commentSections={commentSections}
          overviewComments={overviewComments}
          overviewCommentsLoading={overviewCommentsLoading}
          approveComment={approveComment}
          deleteComment={deleteComment}
        />
      );
      case "comment-sections": return (
        <CommentsTab
          commentSections={commentSections}
          commentsBusy={commentsBusy}
          editingSection={editingSection}   setEditingSection={setEditingSection}
          sectionName={sectionName}         setSectionName={setSectionName}
          sectionSettings={sectionSettings} setSectionSettings={setSectionSettings}
          startNewSection={startNewSection}
          startEditSection={startEditSection}
          saveSection={saveSection}
          deleteSection={deleteSection}
        />
      );
      case "comments-integration": return (
        <CommentsIntegrationTab
          origin={origin}
          commentSections={commentSections}
          selectedSectionId={selectedSectionId} setSelectedSectionId={setSelectedSectionId}
        />
      );
      case "comment-moderation": return (
        <ModerationTab
          commentSections={commentSections}
          selectedSectionId={selectedSectionId}   setSelectedSectionId={setSelectedSectionId}
          allComments={allComments}
          allCommentsBusy={allCommentsBusy}
          replyingToComment={replyingToComment}   setReplyingToComment={setReplyingToComment}
          commentReplyMsg={commentReplyMsg}        setCommentReplyMsg={setCommentReplyMsg}
          approveComment={approveComment}
          deleteComment={deleteComment}
          sendCommentReply={sendCommentReply}
          fetchComments={fetchComments}
        />
      );

      // ── Likes ────────────────────────────────────────────────────
      case "likes": return (
        <LikesTab
          origin={origin}
          username={username}
          likesSummary={likesSummary}
          likesBusy={likesBusy}
          likesAction={likesAction}   setLikesAction={setLikesAction}
          likesPostUrl={likesPostUrl} setLikesPostUrl={setLikesPostUrl}
          likesResult={likesResult}
          runLikesRequest={runLikesRequest}
        />
      );
      default: return null;
    }
  }

  return (
    <div className="dashboard-container">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        username={username}
        onLogout={() => { localStorage.clear(); navigate("/"); }}
      />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>{TAB_TITLES[activeTab] || activeTab}</h1>
        </header>
        {renderTab()}
      </main>
    </div>
  );
}
