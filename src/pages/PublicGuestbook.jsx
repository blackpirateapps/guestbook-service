"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import DOMPurify from "dompurify";
import { IconHeart, IconReply, IconExternalLink } from "../components/Icons";

const SAFE_CONFIG = {
  ALLOWED_TAGS: [
    "h1",
    "h2",
    "h3",
    "p",
    "span",
    "div",
    "br",
    "hr",
    "b",
    "i",
    "strong",
    "em",
    "ul",
    "li",
    "img",
    "a",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "class", "id", "target", "style", "rel"],
};

if (typeof window !== "undefined" && typeof DOMPurify?.addHook === "function") {
  DOMPurify.addHook("afterSanitizeAttributes", function (node) {
    if ("target" in node && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

const AVATAR_PALETTE = [
  { bg: "#0075de", text: "#ffffff" },
  { bg: "#10b981", text: "#ffffff" },
  { bg: "#8b5cf6", text: "#ffffff" },
  { bg: "#f59e0b", text: "#ffffff" },
  { bg: "#ec4899", text: "#ffffff" },
  { bg: "#06b6d4", text: "#ffffff" },
  { bg: "#6366f1", text: "#ffffff" },
  { bg: "#14b8a6", text: "#ffffff" },
];

function getAvatarStyle(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

function getInitials(name = "") {
  const clean = (name || "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function EntryForm({
  isReply = false,
  onCancel,
  senderName,
  setSenderName,
  senderWebsite,
  setSenderWebsite,
  message,
  setMessage,
  isPrivate,
  setIsPrivate,
  botField,
  setBotField,
  handleSubmit,
  isSubmitting,
  statusBanner,
  setStatusBanner,
}) {
  return (
    <form onSubmit={handleSubmit} className="guestbook-submit-card">
      <div className="guestbook-card-header">
        <h3 className="guestbook-card-title">
          {isReply ? "💬 Reply to message" : "✍️ Sign the Guestbook"}
        </h3>
      </div>

      {statusBanner && (
        <div className={`guestbook-status-banner ${statusBanner.type}`} role="status">
          <div className="guestbook-banner-content">
            <span aria-hidden="true">
              {statusBanner.type === "success" && "✓"}
              {statusBanner.type === "pending" && "⏳"}
              {statusBanner.type === "private" && "🔒"}
              {statusBanner.type === "error" && "✕"}
            </span>
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            className="guestbook-banner-close"
            onClick={() => setStatusBanner(null)}
            aria-label="Dismiss banner"
          >
            ×
          </button>
        </div>
      )}

      {/* Hidden Honeypot Anti-Spam Trap */}
      <input
        type="text"
        name="website_url_check"
        value={botField}
        onChange={(e) => setBotField(e.target.value)}
        className="honeypot"
        tabIndex="-1"
        autoComplete="off"
        aria-hidden="true"
        style={{ display: "none", position: "absolute", left: "-9999px" }}
      />

      <div className="guestbook-form-row">
        <div className="guestbook-form-group">
          <label htmlFor={`sender-name-${isReply ? "reply" : "main"}`}>
            Name <span className="required">*</span>
          </label>
          <input
            id={`sender-name-${isReply ? "reply" : "main"}`}
            type="text"
            placeholder="Your name"
            value={senderName}
            onChange={(e) => {
              setSenderName(e.target.value);
              if (statusBanner) setStatusBanner(null);
            }}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="guestbook-form-group">
          <label htmlFor={`sender-website-${isReply ? "reply" : "main"}`}>
            Website <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id={`sender-website-${isReply ? "reply" : "main"}`}
            type="url"
            placeholder="https://example.com"
            value={senderWebsite}
            onChange={(e) => {
              setSenderWebsite(e.target.value);
              if (statusBanner) setStatusBanner(null);
            }}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="guestbook-form-group">
        <label htmlFor={`message-${isReply ? "reply" : "main"}`}>
          {isReply ? "Reply" : "Message"} <span className="required">*</span>
        </label>
        <textarea
          id={`message-${isReply ? "reply" : "main"}`}
          rows={isReply ? 3 : 4}
          placeholder={isReply ? "Write your reply here..." : "Leave a note, say hello, or share some thoughts..."}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (statusBanner) setStatusBanner(null);
          }}
          required
          disabled={isSubmitting}
        />
      </div>

      {!isReply && (
        <label className="guestbook-checkbox-container">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            disabled={isSubmitting}
          />
          <div className="guestbook-checkbox-text">
            <span className="guestbook-checkbox-title">Private message (Owner only)</span>
            <span className="guestbook-checkbox-hint">Only the guestbook owner will be able to read this message.</span>
          </div>
        </label>
      )}

      <div className="guestbook-actions-bar">
        <button type="submit" className="primary" disabled={isSubmitting}>
          {isSubmitting
            ? isReply
              ? "Posting..."
              : "Signing..."
            : isReply
            ? "Post Reply"
            : "Sign Guestbook"}
        </button>

        {isReply && (
          <button
            type="button"
            className="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function PublicGuestbook({ overrideUsername }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const paramUsername = params?.username;
  const username = overrideUsername || paramUsername;
  const isEmbed =
    searchParams?.get("embed") === "1" ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("embed") === "1");
  const rootRef = useRef(null);

  const [entries, setEntries] = useState([]);
  const [customCss, setCustomCss] = useState("");
  const [customHtml, setCustomHtml] = useState("");
  const [embedCssUrl, setEmbedCssUrl] = useState("");
  const [unavailable, setUnavailable] = useState("");

  const [senderName, setSenderName] = useState("");
  const [senderWebsite, setSenderWebsite] = useState("");
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [botField, setBotField] = useState("");
  const [submissionTime, setSubmissionTime] = useState(() => Date.now());

  const [replyingTo, setReplyingTo] = useState(null);
  const [likingIds, setLikingIds] = useState(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  useEffect(() => {
    if (username) {
      Promise.all([fetchEntries(), fetchProfile()]);
    }
  }, [username]);

  useEffect(() => {
    if (!isEmbed) return;
    const root = rootRef.current;
    if (!root) return;

    let rafId = 0;
    const sendHeight = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const height = Math.max(root.scrollHeight, root.offsetHeight);
        window.parent?.postMessage({ type: "guestbook:resize", height }, "*");
      });
    };

    sendHeight();

    let resizeObserver;
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => sendHeight());
      resizeObserver.observe(root);
    }

    window.addEventListener("load", sendHeight);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener("load", sendHeight);
    };
  }, [isEmbed]);

  async function fetchEntries() {
    try {
      const res = await fetch(`/api/entries?user=${username}`);
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        setUnavailable(data.error || "This guestbook is unavailable.");
        return;
      }
      if (res.ok) setEntries(await res.json());
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchProfile() {
    try {
      const res = await fetch(`/api/user?username=${username}`);
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        setUnavailable(data.error || "This guestbook is unavailable.");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setCustomCss(data.custom_css || "");
        setCustomHtml(data.custom_html || "");
        setEmbedCssUrl(data.embed_css_url || "");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLike(id) {
    setLikingIds((prev) => new Set(prev).add(id));
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, likes: (e.likes || 0) + 1 } : e)),
    );

    try {
      await fetch("/api/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", id }),
      });
    } finally {
      setLikingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!senderName.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setStatusBanner(null);

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_username: username,
          sender_name: senderName,
          sender_website: senderWebsite,
          message: message,
          parent_id: replyingTo,
          is_private: isPrivate,
          bot_field: botField,
          _submission_time: submissionTime,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSenderName("");
        setSenderWebsite("");
        setMessage("");
        setIsPrivate(false);
        const wasReplying = replyingTo;
        setReplyingTo(null);
        setSubmissionTime(Date.now());

        if (data.status === "pending") {
          setStatusBanner({
            type: "pending",
            message: "Thank you! Your note has been submitted and is awaiting owner approval.",
          });
        } else if (isPrivate) {
          setStatusBanner({
            type: "private",
            message: "Private message sent to the owner!",
          });
        } else {
          setStatusBanner({
            type: "success",
            message: wasReplying
              ? "Your reply has been posted!"
              : "Thank you for signing the guestbook!",
          });
          fetchEntries();
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setStatusBanner({
          type: "error",
          message: data.error || "Failed to send message.",
        });
      }
    } catch (err) {
      console.error(err);
      setStatusBanner({
        type: "error",
        message: "Failed to send message. Please check your network connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const rootEntries = entries.filter((e) => !e.parent_id);
  const getReplies = (parentId) =>
    entries.filter((e) => e.parent_id === parentId);

  const embedBaseCss = isEmbed
    ? `
      :root { color-scheme: light dark; }
      html, body { background: var(--color-bg); color: var(--color-text); }
      footer { display: none; }
    `.trim()
    : "";

  return (
    <div
      ref={rootRef}
      className={`guestbook-page-wrapper ${isEmbed ? "embed-mode" : ""}`}
    >
      <div className="guestbook-container">
        {isEmbed && embedCssUrl && <link rel="stylesheet" href={embedCssUrl} />}
        <style>{`${embedBaseCss}\n${customCss}`}</style>

        {unavailable ? (
          <section className="guestbook-submit-card">
            <h1 style={{ marginBottom: "0.5rem" }}>Guestbook unavailable</h1>
            <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
              {unavailable}
            </p>
          </section>
        ) : (
          <>
            {!isEmbed && (
              <header className="guestbook-hero-card">
                <div className="guestbook-hero-avatar">
                  {getInitials(username)}
                </div>
                <div className="guestbook-hero-content">
                  {customHtml ? (
                    <div
                      className="guestbook-custom-header"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(customHtml, SAFE_CONFIG),
                      }}
                    />
                  ) : (
                    <>
                      <h1 className="guestbook-hero-title">
                        {username}'s Guestbook
                      </h1>
                      <p className="guestbook-hero-desc">
                        Leave a note below to say hi, share feedback, or just drop by!
                      </p>
                    </>
                  )}
                  <div className="guestbook-hero-pills">
                    <span className="guestbook-hero-pill">
                      📌 {rootEntries.length} {rootEntries.length === 1 ? "entry" : "entries"}
                    </span>
                    <span className="guestbook-hero-pill">
                      🌐 Public Guestbook
                    </span>
                    <a
                      href="/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guestbook-hero-pill"
                      style={{ textDecoration: "none" }}
                    >
                      ⬡ Website Tools
                    </a>
                  </div>
                </div>
              </header>
            )}

            {!replyingTo && (
              <section style={{ marginBottom: "2rem" }}>
                <EntryForm
                  senderName={senderName}
                  setSenderName={setSenderName}
                  senderWebsite={senderWebsite}
                  setSenderWebsite={setSenderWebsite}
                  message={message}
                  setMessage={setMessage}
                  isPrivate={isPrivate}
                  setIsPrivate={setIsPrivate}
                  botField={botField}
                  setBotField={setBotField}
                  handleSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                  statusBanner={statusBanner}
                  setStatusBanner={setStatusBanner}
                />
              </section>
            )}

            <section className="guestbook-entries-section">
              <div className="guestbook-entries-header">
                <h3 className="guestbook-entries-title">
                  <span>Entries</span>
                  <span className="guestbook-count-pill">
                    {rootEntries.length}
                  </span>
                </h3>
              </div>

              {rootEntries.length === 0 ? (
                <div className="guestbook-empty">
                  <div className="guestbook-empty-icon">👋</div>
                  <div className="guestbook-empty-title">No entries yet</div>
                  <p style={{ margin: 0 }}>Be the first to sign this guestbook!</p>
                </div>
              ) : (
                rootEntries.map((entry) => {
                  const avatarStyle = getAvatarStyle(entry.sender_name);
                  const replies = getReplies(entry.id);

                  return (
                    <article key={entry.id} className="guestbook-thread">
                      <div className="entry-thread-card">
                        <header className="entry-card-top">
                          <div className="entry-user-info">
                            <div
                              className="entry-author-avatar"
                              style={{
                                backgroundColor: avatarStyle.bg,
                                color: avatarStyle.text,
                              }}
                              aria-hidden="true"
                            >
                              {getInitials(entry.sender_name)}
                            </div>

                            <span className="entry-author-name">
                              {entry.sender_name}
                            </span>

                            {entry.sender_website && (
                              <a
                                className="entry-website-pill"
                                href={
                                  entry.sender_website.startsWith("http://") ||
                                  entry.sender_website.startsWith("https://")
                                    ? entry.sender_website
                                    : `https://${entry.sender_website}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                title={entry.sender_website}
                              >
                                <span>Website</span>
                                <IconExternalLink size={12} />
                              </a>
                            )}

                            {entry.is_owner === 1 && (
                              <span className="badge owner">Owner</span>
                            )}

                            <span className="entry-date-text" title={entry.created_at}>
                              {formatDate(entry.created_at)}
                            </span>
                          </div>

                          <div className="entry-actions-group">
                            <button
                              type="button"
                              className={`entry-action-pill ${
                                (entry.likes || 0) > 0 ? "active-like" : ""
                              }`}
                              onClick={() => handleLike(entry.id)}
                              disabled={likingIds.has(entry.id)}
                              title="Like"
                            >
                              <IconHeart size={14} />
                              <span>{entry.likes || 0}</span>
                            </button>

                            <button
                              type="button"
                              className="entry-action-pill"
                              onClick={() => {
                                setReplyingTo(entry.id);
                                setMessage("");
                                setIsPrivate(false);
                                setStatusBanner(null);
                              }}
                              title="Reply"
                            >
                              <IconReply size={14} />
                              <span>Reply</span>
                            </button>
                          </div>
                        </header>

                        <div className="entry-message-body">
                          {entry.message}
                        </div>
                      </div>

                      {replyingTo === entry.id && (
                        <div className="entry-inline-reply-composer">
                          <EntryForm
                            isReply={true}
                            onCancel={() => {
                              setReplyingTo(null);
                              setStatusBanner(null);
                            }}
                            senderName={senderName}
                            setSenderName={setSenderName}
                            senderWebsite={senderWebsite}
                            setSenderWebsite={setSenderWebsite}
                            message={message}
                            setMessage={setMessage}
                            isPrivate={isPrivate}
                            setIsPrivate={setIsPrivate}
                            botField={botField}
                            setBotField={setBotField}
                            handleSubmit={handleSubmit}
                            isSubmitting={isSubmitting}
                            statusBanner={statusBanner}
                            setStatusBanner={setStatusBanner}
                          />
                        </div>
                      )}

                      {replies.length > 0 && (
                        <div className="entry-replies-container">
                          {replies.map((reply) => {
                            const replyAvatar = getAvatarStyle(reply.sender_name);
                            return (
                              <div key={reply.id} className="entry-reply-box">
                                <div className="entry-reply-header">
                                  <div className="entry-reply-author">
                                    <div
                                      className="entry-author-avatar"
                                      style={{
                                        width: 24,
                                        height: 24,
                                        fontSize: "0.6875rem",
                                        backgroundColor: replyAvatar.bg,
                                        color: replyAvatar.text,
                                      }}
                                      aria-hidden="true"
                                    >
                                      {getInitials(reply.sender_name)}
                                    </div>
                                    <span>{reply.sender_name}</span>
                                    {reply.is_owner === 1 && (
                                      <span className="badge owner">Owner</span>
                                    )}
                                  </div>
                                  <span
                                    className="entry-date-text"
                                    title={reply.created_at}
                                  >
                                    {formatDate(reply.created_at)}
                                  </span>
                                </div>
                                <div className="entry-reply-content">
                                  {reply.message}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </section>

            {!isEmbed && (
              <footer className="guestbook-footer">
                Powered by{" "}
                <a href="/" target="_blank" rel="noopener noreferrer">
                  Website Tools
                </a>
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
}
