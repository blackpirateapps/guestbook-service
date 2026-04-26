import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../components/Toast.jsx";

import Sidebar       from "../features/dashboard/Sidebar.jsx";
import OverviewTab   from "../features/dashboard/OverviewTab.jsx";
import EmbedTab      from "../features/dashboard/EmbedTab.jsx";
import SettingsTab   from "../features/dashboard/SettingsTab.jsx";
import DataTab       from "../features/dashboard/DataTab.jsx";
import TesterTab     from "../features/dashboard/TesterTab.jsx";
import FormsTab, { makeField } from "../features/dashboard/FormsTab.jsx";
import SubmissionsTab from "../features/dashboard/SubmissionsTab.jsx";
import CommentsTab   from "../features/dashboard/CommentsTab.jsx";
import ModerationTab from "../features/dashboard/ModerationTab.jsx";
import LikesTab      from "../features/dashboard/LikesTab.jsx";

const TAB_TITLES = {
  overview:            "Overview",
  embed:               "Embed",
  settings:            "Settings",
  data:                "Data",
  tester:              "API Tester",
  forms:               "Contact Forms",
  submissions:         "Submissions",
  "comment-sections":  "Comment Sections",
  "comment-moderation":"Moderation",
  likes:               "Likes",
};

export default function Dashboard() {
  const toast    = useToast();
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  // ── Guestbook State ───────────────────────────────────────
  const [entries,         setEntries]         = useState([]);
  const [customCss,       setCustomCss]       = useState("");
  const [customHtml,      setCustomHtml]      = useState("");
  const [embedCssUrl,     setEmbedCssUrl]     = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [origin,          setOrigin]          = useState("");
  const [replyingTo,      setReplyingTo]      = useState(null);
  const [replyMsg,        setReplyMsg]        = useState("");
  const [dataTransferBusy, setDataTransferBusy] = useState(false);

  // Import form state
  const [importName,    setImportName]    = useState("");
  const [importWebsite, setImportWebsite] = useState("");
  const [importDate,    setImportDate]    = useState("");
  const [importMessage, setImportMessage] = useState("");
  const importFileRef = useRef(null);

  // API Tester state
  const [testerBaseUrl,       setTesterBaseUrl]       = useState("");
  const [testerName,          setTesterName]          = useState("");
  const [testerWebsite,       setTesterWebsite]       = useState("");
  const [testerMessage,       setTesterMessage]       = useState("");
  const [testerIsPrivate,     setTesterIsPrivate]     = useState(false);
  const [testerReplyParentId, setTesterReplyParentId] = useState("");
  const [testerLikeId,        setTesterLikeId]        = useState("");
  const [testerResult,        setTesterResult]        = useState("");
  const [testerBusy,          setTesterBusy]          = useState(false);

  // ── Forms State ───────────────────────────────────────────
  const [forms,              setForms]              = useState([]);
  const [formsBusy,          setFormsBusy]          = useState(false);
  const [editingForm,        setEditingForm]        = useState(null);
  const [formName,           setFormName]           = useState("");
  const [formFields,         setFormFields]         = useState([]);
  const [selectedFormId,     setSelectedFormId]     = useState("");
  const [submissions,        setSubmissions]        = useState([]);
  const [submissionsBusy,    setSubmissionsBusy]    = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState(null);

  // ── Comments State ────────────────────────────────────────
  const [commentSections,   setCommentSections]   = useState([]);
  const [commentsBusy,      setCommentsBusy]      = useState(false);
  const [editingSection,    setEditingSection]     = useState(null);
  const [sectionName,       setSectionName]        = useState("");
  const [sectionSettings,   setSectionSettings]   = useState({
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

  // ── Likes State ───────────────────────────────────────────
  const [likesSummary, setLikesSummary] = useState({ total_likes: 0, post_count: 0, top_posts: [] });
  const [likesBusy,    setLikesBusy]   = useState(false);
  const [likesPostUrl, setLikesPostUrl] = useState("");
  const [likesAction,  setLikesAction]  = useState("get");
  const [likesResult,  setLikesResult]  = useState("");

  // ── Bootstrap ─────────────────────────────────────────────
  useEffect(() => {
    setOrigin(window.location.origin);
    setTesterBaseUrl(window.location.origin);
    if (!token) { navigate("/"); return; }
    fetchData();
  }, [token]);

  useEffect(() => {
    if (activeTab === "submissions" && selectedFormId) fetchSubmissions(selectedFormId);
    if (activeTab === "comment-moderation" && selectedSectionId) fetchComments(selectedSectionId);
    if (activeTab === "likes") fetchLikesSummary();
  }, [activeTab, selectedFormId, selectedSectionId]);

  const handleTabChange = (tabId) => setSearchParams({ tab: tabId });

  // ── Fetch helpers ─────────────────────────────────────────
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
        setLikesSummary({
          total_likes: d.total_likes || 0,
          post_count:  d.post_count  || 0,
          top_posts:   Array.isArray(d.top_posts) ? d.top_posts : [],
        });
      }
    } finally { setLikesBusy(false); }
  }

  // ── Actions ───────────────────────────────────────────────
  async function saveSettings() {
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ custom_css: customCss, custom_html: customHtml, embed_css_url: embedCssUrl, require_approval: requireApproval }),
    });
    if (res.ok) {
      toast.success("Saved", "Settings updated successfully.");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error("Error", d.error || "Failed to save settings.");
    }
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
    await fetch("/api/entries", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ owner_username: username, sender_name: username, message: replyMsg, parent_id: parentId }),
    });
    setReplyMsg(""); setReplyingTo(null);
    toast.success("Reply sent");
    fetchData();
  }

  async function addImportedEntry(e) {
    e.preventDefault();
    if (!importName.trim() || !importMessage.trim() || !importDate) return;
    const dateObj = new Date(importDate);
    if (Number.isNaN(dateObj.getTime())) { toast.error("Error", "Please provide a valid date."); return; }
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "import", owner_username: username, sender_name: importName, sender_website: importWebsite, message: importMessage, created_at: dateObj.toISOString() }),
    });
    if (res.ok) {
      setImportName(""); setImportWebsite(""); setImportDate(""); setImportMessage("");
      toast.success("Added", "Entry imported.");
      fetchData();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error("Error", d.error || "Failed to add entry.");
    }
  }

  async function exportAllData() {
    setDataTransferBusy(true);
    try {
      const res = await fetch("/api/entries?export=1", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Export failed"); }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `${username}-guestbook-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Exported", "Data downloaded.");
    } catch (err) { toast.error("Export failed", err?.message); }
    finally { setDataTransferBusy(false); }
  }

  async function importAllDataFromFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDataTransferBusy(true);
    try {
      const raw    = await file.text();
      const parsed = JSON.parse(raw);
      if (parsed?.owner_username && parsed.owner_username !== username) throw new Error("Export belongs to a different username.");
      if (!Array.isArray(parsed?.entries) || !parsed?.profile) throw new Error("Invalid export file format.");
      if (!confirm("Import will replace all your current entries and profile customization. Continue?")) return;
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "import_all", owner_username: username, data: parsed }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Import failed"); }
      toast.success("Imported", "Data imported successfully.");
      fetchData();
    } catch (err) { toast.error("Import failed", err?.message); }
    finally { e.target.value = ""; setDataTransferBusy(false); }
  }

  // Forms
  function startNewForm() {
    setEditingForm("new"); setFormName("");
    setFormFields([
      makeField({ name: "name",    label: "Name",    type: "text",     required: true }),
      makeField({ name: "email",   label: "Email",   type: "email",    required: true }),
      makeField({ name: "message", label: "Message", type: "textarea", required: true }),
    ]);
  }
  function startEditForm(form)  { setEditingForm(form.id); setFormName(form.name); setFormFields(form.fields.map((f) => makeField(f))); }
  function cancelFormEdit()     { setEditingForm(null); setFormName(""); setFormFields([]); }
  function addField()           { setFormFields([...formFields, makeField({ name: `field_${formFields.length + 1}`, label: "New Field", type: "text" })]); }
  function updateField(i, upd)  { const upd2 = [...formFields]; upd2[i] = { ...upd2[i], ...upd }; setFormFields(upd2); }
  function removeField(i)       { setFormFields(formFields.filter((_, j) => j !== i)); }
  function moveField(i, dir)    {
    const ni = i + dir;
    if (ni < 0 || ni >= formFields.length) return;
    const upd = [...formFields]; [upd[i], upd[ni]] = [upd[ni], upd[i]]; setFormFields(upd);
  }

  async function saveForm() {
    if (!formName.trim()) { toast.error("Error", "Form name is required"); return; }
    if (formFields.length === 0) { toast.error("Error", "At least one field is required"); return; }
    setFormsBusy(true);
    const payload = { name: formName, fields: formFields.map(({ _id, ...f }) => f) };
    if (editingForm !== "new") payload.id = editingForm;
    const res = await fetch("/api/forms", {
      method: editingForm === "new" ? "POST" : "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingForm === "new" ? "Form created!" : "Form updated!");
      cancelFormEdit(); fetchForms();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error("Error", d.error || "Failed to save form");
    }
    setFormsBusy(false);
  }

  async function deleteForm(formId) {
    if (!confirm("Delete this form and all its submissions?")) return;
    const res = await fetch("/api/forms", { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: formId }) });
    if (res.ok) {
      toast.info("Deleted", "Form removed.");
      fetchForms();
      if (selectedFormId === formId) { setSelectedFormId(""); setSubmissions([]); }
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error("Error", d.error || "Failed to delete form");
    }
  }

  async function deleteSubmission(id) {
    if (!confirm("Delete this submission?")) return;
    const res = await fetch("/api/submissions", { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
    if (res.ok) { toast.info("Deleted"); fetchSubmissions(selectedFormId); }
  }

  async function exportFormSubmissions() {
    if (!selectedFormId) return;
    const res = await fetch(`/api/submissions?form=${selectedFormId}&export=1`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data  = await res.json();
      const blob  = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      const fname = forms.find((f) => f.id === selectedFormId)?.name || "form";
      a.href = url; a.download = `${fname}-submissions-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
    }
  }

  // Comments
  function startNewSection() {
    setEditingSection("new"); setSectionName("");
    setSectionSettings({ fields: { name: { show: true, required: true }, email: { show: true, required: true }, url: { show: false, required: false } }, allow_anonymous: false, allow_likes: true, require_approval: false });
  }
  function startEditSection(s) { setEditingSection(s.id); setSectionName(s.name); setSectionSettings(s.settings); }

  async function saveSection() {
    if (!sectionName.trim()) { toast.error("Error", "Name is required"); return; }
    setCommentsBusy(true);
    const payload = { name: sectionName, settings: sectionSettings };
    if (editingSection !== "new") payload.id = editingSection;
    const res = await fetch("/api/comment-sections", {
      method: editingSection === "new" ? "POST" : "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (res.ok) { setEditingSection(null); toast.success("Saved"); fetchCommentSections(); }
    else        { toast.error("Error", "Failed to save section"); }
    setCommentsBusy(false);
  }

  async function deleteSection(id) {
    if (!confirm("Delete this section and all comments?")) return;
    await fetch("/api/comment-sections", { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
    toast.info("Deleted");
    fetchCommentSections();
    if (selectedSectionId === id) { setSelectedSectionId(""); setAllComments([]); }
  }

  async function approveComment(id) {
    await fetch("/api/comments", { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "approve", id }) });
    toast.success("Approved");
    fetchComments(selectedSectionId);
  }

  async function deleteComment(id) {
    if (!confirm("Delete this comment?")) return;
    await fetch("/api/comments", { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
    toast.info("Deleted");
    fetchComments(selectedSectionId);
  }

  async function sendCommentReply(parentId) {
    if (!commentReplyMsg.trim()) return;
    await fetch("/api/comments", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ section_id: selectedSectionId, comment_text: commentReplyMsg, parent_id: parentId }),
    });
    setCommentReplyMsg(""); setReplyingToComment(null);
    toast.success("Reply sent");
    fetchComments(selectedSectionId);
  }

  // API Tester
  function resolveTesterEndpoint() {
    const base = (testerBaseUrl || origin || window.location.origin).trim().replace(/\/+$/, "");
    return `${base}/api/entries`;
  }

  async function runTesterRequest({ method, payload, actionLabel }) {
    const endpoint = resolveTesterEndpoint();
    setTesterBusy(true); setTesterResult(`Running ${actionLabel}...`);
    try {
      const res      = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const rawText  = await res.text();
      let   parsed   = rawText;
      try { parsed = rawText ? JSON.parse(rawText) : {}; } catch {}
      setTesterResult(JSON.stringify({ request: { method, url: endpoint, body: payload }, response: { status: res.status, ok: res.ok, body: parsed } }, null, 2));
      if (res.ok) fetchData();
    } catch (err) {
      setTesterResult(JSON.stringify({ request: { method, url: endpoint, body: payload }, error: err?.message || "Request failed" }, null, 2));
    } finally { setTesterBusy(false); }
  }

  async function testCreateEntry(e) {
    e.preventDefault();
    if (!testerName.trim() || !testerMessage.trim()) return;
    await runTesterRequest({ method: "POST", actionLabel: "entry test", payload: { owner_username: username, sender_name: testerName.trim(), sender_website: testerWebsite.trim(), message: testerMessage.trim(), parent_id: null, is_private: testerIsPrivate, bot_field: "" } });
  }
  async function testCreateReply(e) {
    e.preventDefault();
    const pid = Number(testerReplyParentId);
    if (!testerName.trim() || !testerMessage.trim() || !Number.isInteger(pid) || pid <= 0) return;
    await runTesterRequest({ method: "POST", actionLabel: "reply test", payload: { owner_username: username, sender_name: testerName.trim(), sender_website: testerWebsite.trim(), message: testerMessage.trim(), parent_id: pid, is_private: false, bot_field: "" } });
  }
  async function testLikeEntry(e) {
    e.preventDefault();
    const lid = Number(testerLikeId);
    if (!Number.isInteger(lid) || lid <= 0) return;
    await runTesterRequest({ method: "PUT", actionLabel: "like test", payload: { action: "like", id: lid } });
  }

  async function runLikesRequest(e) {
    e.preventDefault();
    if (!username || !origin) return;
    if ((likesAction === "like" || likesAction === "get") && !likesPostUrl.trim()) return;
    setLikesBusy(true); setLikesResult("Running request...");
    const payload = { action: likesAction, owner_username: username };
    if (likesAction === "like" || likesAction === "get") payload.post_url = likesPostUrl.trim();
    try {
      const res     = await fetch("/api/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const rawText = await res.text();
      let  parsed   = rawText;
      try { parsed = rawText ? JSON.parse(rawText) : {}; } catch {}
      setLikesResult(JSON.stringify({ request: { method: "POST", url: "/api/likes", body: payload }, response: { status: res.status, ok: res.ok, body: parsed } }, null, 2));
      if (res.ok) fetchLikesSummary();
    } catch (err) {
      setLikesResult(JSON.stringify({ request: { method: "POST", url: "/api/likes", body: payload }, error: err?.message || "Request failed" }, null, 2));
    } finally { setLikesBusy(false); }
  }

  // ── Derived ───────────────────────────────────────────────
  const rootEntryCount = entries.filter((e) => !e.parent_id).length;
  const replyCount     = entries.filter((e) => !!e.parent_id).length;
  const pendingCount   = entries.filter((e) => e.status === "pending").length;
  const privateCount   = entries.filter((e) => e.is_private === 1).length;
  const likesTotal     = entries.reduce((s, e) => s + (e.likes || 0), 0);

  // ── Render ────────────────────────────────────────────────
  function renderTab() {
    switch (activeTab) {
      case "overview": return (
        <OverviewTab
          entries={entries}
          rootEntryCount={rootEntryCount}
          replyCount={replyCount}
          pendingCount={pendingCount}
          privateCount={privateCount}
          likesTotal={likesTotal}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          replyMsg={replyMsg}
          setReplyMsg={setReplyMsg}
          approveEntry={approveEntry}
          deleteEntry={deleteEntry}
          sendReply={sendReply}
        />
      );
      case "embed": return (
        <EmbedTab
          origin={origin}
          username={username}
          embedCssUrl={embedCssUrl}
          setEmbedCssUrl={setEmbedCssUrl}
          saveSettings={saveSettings}
        />
      );
      case "settings": return (
        <SettingsTab
          requireApproval={requireApproval}
          setRequireApproval={setRequireApproval}
          customCss={customCss}
          setCustomCss={setCustomCss}
          customHtml={customHtml}
          setCustomHtml={setCustomHtml}
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
          testerBaseUrl={testerBaseUrl}       setTesterBaseUrl={setTesterBaseUrl}
          testerName={testerName}             setTesterName={setTesterName}
          testerWebsite={testerWebsite}       setTesterWebsite={setTesterWebsite}
          testerMessage={testerMessage}       setTesterMessage={setTesterMessage}
          testerIsPrivate={testerIsPrivate}   setTesterIsPrivate={setTesterIsPrivate}
          testerReplyParentId={testerReplyParentId} setTesterReplyParentId={setTesterReplyParentId}
          testerLikeId={testerLikeId}         setTesterLikeId={setTesterLikeId}
          testerResult={testerResult}
          testerBusy={testerBusy}
          testCreateEntry={testCreateEntry}
          testCreateReply={testCreateReply}
          testLikeEntry={testLikeEntry}
        />
      );
      case "forms": return (
        <FormsTab
          origin={origin}
          forms={forms}
          formsBusy={formsBusy}
          editingForm={editingForm}
          formName={formName}           setFormName={setFormName}
          formFields={formFields}       setFormFields={setFormFields}
          selectedFormId={selectedFormId} setSelectedFormId={setSelectedFormId}
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
      case "submissions": return (
        <SubmissionsTab
          forms={forms}
          selectedFormId={selectedFormId}         setSelectedFormId={setSelectedFormId}
          submissions={submissions}
          submissionsBusy={submissionsBusy}
          expandedSubmission={expandedSubmission} setExpandedSubmission={setExpandedSubmission}
          fetchSubmissions={fetchSubmissions}
          deleteSubmission={deleteSubmission}
          exportFormSubmissions={exportFormSubmissions}
        />
      );
      case "comment-sections": return (
        <CommentsTab
          origin={origin}
          commentSections={commentSections}
          commentsBusy={commentsBusy}
          editingSection={editingSection}       setEditingSection={setEditingSection}
          sectionName={sectionName}             setSectionName={setSectionName}
          sectionSettings={sectionSettings}     setSectionSettings={setSectionSettings}
          selectedSectionId={selectedSectionId} setSelectedSectionId={setSelectedSectionId}
          startNewSection={startNewSection}
          startEditSection={startEditSection}
          saveSection={saveSection}
          deleteSection={deleteSection}
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
