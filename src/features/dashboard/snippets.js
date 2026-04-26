/**
 * snippets.js — Pure functions that generate embed / headless code strings.
 * No React, no side-effects. Easy to test or replace.
 */

export function makeEmbedSnippet(origin, username) {
  if (!origin || !username) return "";
  const src = `${origin}/u/${username}?embed=1`;
  return `<iframe
  id="guestbook-embed"
  src="${src}"
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
<\/script>
<div style="margin-top:8px;font-size:12px;opacity:.75;font-family:ui-serif,Georgia,Cambria,'Times New Roman',Times,serif">
  Powered by <a href="/" target="_blank" rel="noreferrer">Website Tools</a>
</div>`;
}

export function makeHeadlessSubmitSnippet(origin, username) {
  if (!origin || !username) return "";
  return `<form id="guestbook-form">
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
<\/script>`;
}

export function makeHeadlessReplySnippet(origin, username) {
  if (!origin || !username) return "";
  return `<script>
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
<\/script>`;
}

export function makeHeadlessLikeSnippet(origin) {
  if (!origin) return "";
  return `<script>
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
<\/script>`;
}

export function makeHeadlessWidgetSnippet(origin, username) {
  if (!origin || !username) return "";
  return `<div id="guestbook-entries"></div>
<script src="${origin}/guestbook-widget.js"><\/script>
<script>
  GuestbookWidget.mount({
    baseUrl: "${origin}",
    username: "${username}",
    container: "#guestbook-entries"
  });
<\/script>`;
}

export function makeHeadlessApiDocs(origin, username) {
  if (!origin || !username) return "";
  return `GET ${origin}/api/entries?user=${username}
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
  { "id": <entry id> }`;
}

export const HEADLESS_CSS_EXAMPLE = `/* Example styling for the default GuestbookWidget markup */
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

.gbw-author:hover { text-decoration: underline; }

.gbw-date {
  color: rgba(0, 0, 0, 0.6);
  font-weight: 500;
}

.gbw-entry-body {
  white-space: pre-wrap;
  line-height: 1.55;
}`;

export function makeLikesApiDocs(origin, username) {
  if (!origin) return "";
  const base = `${origin}/api/likes`;
  return `POST ${base}
- Single endpoint for likes.
- Body fields:
  action ("like" | "get" | "summary")
  owner_username (string, required)
  post_url (string, required for like/get)

Like a post:
{ "action": "like", "owner_username": "${username}", "post_url": "https://example.com/blog/my-post" }

Get likes for a post:
{ "action": "get", "owner_username": "${username}", "post_url": "https://example.com/blog/my-post" }

Summary for dashboard:
{ "action": "summary", "owner_username": "${username}" }`;
}

export function makeLikesUsageFetch(origin, username) {
  if (!origin) return "";
  const base = `${origin}/api/likes`;
  return `// Like a post
await fetch("${base}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "like",
    owner_username: "${username}",
    post_url: "https://example.com/blog/my-post"
  })
});

// Get likes for a post
const res = await fetch("${base}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "get",
    owner_username: "${username}",
    post_url: "https://example.com/blog/my-post"
  })
});
const data = await res.json();

// Summary for dashboard
await fetch("${base}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "summary",
    owner_username: "${username}"
  })
});`;
}

export function makeLikesUsageCurl(origin, username) {
  if (!origin) return "";
  const base = `${origin}/api/likes`;
  return `# Like a post
curl -X POST "${base}" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"like","owner_username":"${username}","post_url":"https://example.com/blog/my-post"}'

# Get likes for a post
curl -X POST "${base}" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"get","owner_username":"${username}","post_url":"https://example.com/blog/my-post"}'

# Summary for dashboard
curl -X POST "${base}" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"summary","owner_username":"${username}"}'`;
}

export function makeLikesResponseDocs(username) {
  return `Like / Get response:
{ "success": true, "post_url": "https://example.com/blog/my-post/", "likes": 12 }

Summary response:
{
  "success": true,
  "owner_username": "${username}",
  "total_likes": 120,
  "post_count": 8,
  "top_posts": [
    { "post_url": "https://example.com/blog/my-post/", "likes": 42 }
  ]
}`;
}

export function generateCommentWidgetSnippet(origin, section) {
  if (!section) return "";
  return `<!-- Add this to your HTML -->
<div id="comments-container"></div>
<script src="${origin}/comments-widget.js"><\/script>
<script>
  CommentsWidget.mount({
    baseUrl: "${origin}",
    sectionId: "${section.id}",
    container: "#comments-container"
  });
<\/script>`;
}

export function generateCommentHtmlSnippet(origin, section) {
  if (!section) return "";
  const settings = section.settings;
  const fields = settings.fields;

  let formFields = "";
  if (settings.allow_anonymous) {
    formFields += `  <div class="form-group">
    <label>
      <input type="checkbox" name="is_anonymous" id="anon-check">
      Comment as Anonymous
    </label>
  </div>\n`;
  }

  const fieldList = [
    { id: "name", label: "Name", type: "text" },
    { id: "email", label: "Email", type: "email" },
    { id: "url", label: "Website", type: "url" },
  ];
  fieldList.forEach((f) => {
    if (fields[f.id].show) {
      const required = fields[f.id].required ? " required" : "";
      const reqLabel = fields[f.id].required ? " *" : "";
      formFields += `  <div class="form-group field-${f.id}">
    <label for="${f.id}">${f.label}${reqLabel}</label>
    <input type="${f.type}" id="${f.id}" name="sender_${f.id}"${required}>
  </div>\n`;
    }
  });

  formFields += `  <div class="form-group">
    <label for="comment">Comment *</label>
    <textarea id="comment" name="comment_text" required></textarea>
  </div>`;

  return `<div id="comments-section-${section.id}">
  <!-- Comments List Container -->
  <div id="comments-list-${section.id}" style="margin-bottom: 2rem;">
    Loading comments...
  </div>

  <!-- Post Comment Form -->
  <form id="comment-form-${section.id}">
    <h3>Post a Comment</h3>
    <input type="text" name="website_url_check" style="display:none !important;" tabindex="-1" autocomplete="off">
${formFields}
    <input type="hidden" name="parent_id" id="parent-id-${section.id}">
    <div id="replying-to-info-${section.id}" style="display:none; margin-bottom: 1rem; color: #666;">
      Replying to a comment... <button type="button" id="cancel-reply-${section.id}" style="background:none; border:none; color: #007aff; cursor:pointer; padding:0; text-decoration:underline;">Cancel</button>
    </div>
    <button type="submit">Post Comment</button>
  </form>
</div>

<style>
  #comments-section-${section.id} .comment { border-left: 2px solid #eee; padding-left: 1rem; margin-bottom: 1.5rem; }
  #comments-section-${section.id} .comment-header { font-size: 0.9rem; margin-bottom: 0.3rem; }
  #comments-section-${section.id} .comment-author { font-weight: 600; color: #007aff; }
  #comments-section-${section.id} .comment-date { color: #888; font-size: 0.8rem; margin-left: 0.5rem; }
  #comments-section-${section.id} .comment-body { line-height: 1.5; white-space: pre-wrap; margin-bottom: 0.5rem; }
  #comments-section-${section.id} .comment-footer { display: flex; gap: 1rem; }
  #comments-section-${section.id} .comment-footer button { background:none; border:none; color: #007aff; cursor:pointer; padding:0; font-size: 0.85rem; }
  #comments-section-${section.id} .replies { margin-top: 1rem; padding-left: 1rem; border-left: 1px solid #eee; }
  #comments-section-${section.id} .form-group { margin-bottom: 1rem; }
  #comments-section-${section.id} .form-group label { display: block; margin-bottom: 0.3rem; font-weight: 500; }
  #comments-section-${section.id} .form-group input:not([type="checkbox"]), #comments-section-${section.id} .form-group textarea { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
</style>

<script>
(function() {
  const form = document.getElementById("comment-form-${section.id}");
  const list = document.getElementById("comments-list-${section.id}");
  const parentInput = document.getElementById("parent-id-${section.id}");
  const replyInfo = document.getElementById("replying-to-info-${section.id}");
  const cancelReplyBtn = document.getElementById("cancel-reply-${section.id}");
  const baseUrl = "${origin}";
  const sectionId = "${section.id}";
  let pageUrl = window.location.origin + window.location.pathname;
  if (!pageUrl.endsWith("/")) pageUrl += "/";

  async function fetchComments() {
    try {
      const res = await fetch(baseUrl + "/api/comments?section=" + sectionId + "&page_url=" + encodeURIComponent(pageUrl));
      const data = await res.json();
      renderComments(data.comments);
    } catch (err) {
      list.innerHTML = "Error loading comments.";
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderComment(comment, all) {
    const replies = all.filter(c => c.parent_id === comment.id);
    const date = new Date(comment.created_at).toLocaleString();
    return \`
      <div class="comment" id="comment-\${comment.id}">
        <div class="comment-header">
          <span class="comment-author">\${escapeHtml(comment.sender_name || "Anonymous")}</span>
          \${comment.is_owner ? '<span style="background:#eee; padding:2px 5px; border-radius:3px; font-size:0.7rem;">Owner</span>' : ''}
          <span class="comment-date">\${date}</span>
        </div>
        <div class="comment-body">\${escapeHtml(comment.comment_text)}</div>
        <div class="comment-footer">
          ${settings.allow_likes ? `\n          <button type="button" onclick="window.__cw_like(\${comment.id})">❤ \${comment.likes || 0}</button>` : ""}
          <button type="button" onclick="window.__cw_reply(\${comment.id})">Reply</button>
        </div>
        \${replies.length > 0 ? \`
          <div class="replies">
            \${replies.map(r => renderComment(r, all)).join("")}
          </div>
        \` : ""}
      </div>
    \`;
  }

  function renderComments(comments) {
    if (!comments || comments.length === 0) {
      list.innerHTML = "<p>No comments yet.</p>";
      return;
    }
    const roots = comments.filter(c => !c.parent_id);
    list.innerHTML = roots.map(c => renderComment(c, comments)).join("");
  }

  window.__cw_like = async (id) => {
    await fetch(baseUrl + "/api/comments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like", id })
    });
    fetchComments();
  };

  window.__cw_reply = (id) => {
    parentInput.value = id;
    replyInfo.style.display = "block";
    form.scrollIntoView({ behavior: 'smooth' });
    form.querySelector("textarea").focus();
  };

  cancelReplyBtn.onclick = () => {
    parentInput.value = "";
    replyInfo.style.display = "none";
  };

  const anonCheck = document.getElementById("anon-check");
  if (anonCheck) {
    anonCheck.addEventListener("change", (e) => {
      const isAnon = e.target.checked;
      ["name", "email", "url"].forEach(f => {
        const el = form.querySelector(".field-" + f);
        if (el) el.style.display = isAnon ? "none" : "block";
        const input = form.querySelector("[name='sender_" + f + "']");
        if (input) input.required = isAnon ? false : (input.dataset.wasRequired === "true");
      });
    });
    ["name", "email", "url"].forEach(f => {
      const input = form.querySelector("[name='sender_" + f + "']");
      if (input) input.dataset.wasRequired = input.required ? "true" : "false";
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.section_id = sectionId;
    data.page_url = pageUrl;
    data.is_anonymous = anonCheck ? anonCheck.checked : false;
    const res = await fetch(baseUrl + "/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      alert(result.status === "pending" ? "Awaiting approval!" : "Comment posted!");
      e.target.reset();
      parentInput.value = "";
      replyInfo.style.display = "none";
      fetchComments();
    } else {
      alert(result.error || "Failed to post");
    }
  });

  fetchComments();
})();
<\/script>`;
}

export function generateFormHtmlSnippet(origin, form) {
  const fields = form.fields
    .map((f) => {
      const required = f.required ? " required" : "";
      const reqLabel = f.required ? " *" : "";
      if (f.type === "textarea") {
        return `  <div class="form-group">
    <label for="${f.name}">${f.label}${reqLabel}</label>
    <textarea id="${f.name}" name="${f.name}"${required}></textarea>
  </div>`;
      }
      if (f.type === "checkbox") {
        return `  <div class="form-group">
    <label>
      <input type="checkbox" name="${f.name}"${required}>
      ${f.label}
    </label>
  </div>`;
      }
      if (f.type === "select") {
        const options = (f.options || [])
          .map((opt) => `      <option value="${opt}">${opt}</option>`)
          .join("\n");
        return `  <div class="form-group">
    <label for="${f.name}">${f.label}${reqLabel}</label>
    <select id="${f.name}" name="${f.name}"${required}>
      <option value="">Select...</option>
${options}
    </select>
  </div>`;
      }
      if (f.type === "radio") {
        const radios = (f.options || [])
          .map((opt) => `    <label><input type="radio" name="${f.name}" value="${opt}"${required}> ${opt}</label>`)
          .join("\n");
        return `  <div class="form-group">
    <label>${f.label}${reqLabel}</label>
${radios}
  </div>`;
      }
      const inputType =
        f.type === "phone" ? "tel"
        : f.type === "url"    ? "url"
        : f.type === "number" ? "number"
        : f.type === "email"  ? "email"
        : "text";
      return `  <div class="form-group">
    <label for="${f.name}">${f.label}${reqLabel}</label>
    <input type="${inputType}" id="${f.name}" name="${f.name}"${required}>
  </div>`;
    })
    .join("\n");

  const endpoint = `${origin}/api/submit?form=${form.id}`;
  return `<form id="contact-form-${form.id}">
${fields}
  <!-- Honeypot field for spam protection -->
  <input type="text" name="_honeypot" style="display:none" tabindex="-1" autocomplete="off">
  <button type="submit">Submit</button>
</form>

<script>
document.getElementById("contact-form-${form.id}").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  const res = await fetch("${endpoint}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (res.ok) {
    alert(result.message || "Form submitted successfully!");
    e.target.reset();
  } else {
    alert(result.error || "Failed to submit form");
  }
});
<\/script>`;
}
