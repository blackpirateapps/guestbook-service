import { Link } from "react-router-dom";
import CodeBlock from "../components/CodeBlock.jsx";

const SITE = "https://your-app.vercel.app";
const USER = "your_username";
const FORM_ID = "contact01";
const SECTION_ID = "blog-comments";
const TOKEN = "YOUR_DASHBOARD_JWT";

const guestbookEmbedCode = `<iframe
  id="guestbook-embed"
  src="${SITE}/u/${USER}?embed=1"
  style="width:100%;border:0;height:650px"
  loading="lazy"
></iframe>

<script>
(function () {
  var iframe = document.getElementById("guestbook-embed");

  window.addEventListener("message", function (event) {
    if (!iframe || event.source !== iframe.contentWindow) return;
    if (!event.data || event.data.type !== "guestbook:resize") return;
    if (typeof event.data.height === "number") {
      iframe.style.height = event.data.height + 20 + "px";
    }
  });
})();
<\/script>`;

const guestbookFetchCode = `<div id="guestbook"></div>

<script>
const baseUrl = "${SITE}";
const owner = "${USER}";

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

async function loadGuestbook() {
  const res = await fetch(baseUrl + "/api/entries?user=" + encodeURIComponent(owner));
  if (!res.ok) throw new Error("Could not load guestbook entries");

  const entries = await res.json();
  const roots = entries.filter((entry) => !entry.parent_id);
  const container = document.getElementById("guestbook");

  container.innerHTML = roots.map((entry) => {
    const replies = entries.filter((reply) => reply.parent_id === entry.id);
    return \`
      <article class="guestbook-entry">
        <h3>\${escapeHtml(entry.sender_name)}</h3>
        <p>\${escapeHtml(entry.message)}</p>
        <small>\${new Date(entry.created_at).toLocaleString()}</small>
        <button data-like="\${entry.id}">Like \${entry.likes || 0}</button>
        <div class="guestbook-replies">
          \${replies.map((reply) => \`
            <p><strong>\${escapeHtml(reply.sender_name)}:</strong> \${escapeHtml(reply.message)}</p>
          \`).join("")}
        </div>
      </article>
    \`;
  }).join("");
}

loadGuestbook().catch((error) => {
  document.getElementById("guestbook").textContent = error.message;
});
<\/script>`;

const guestbookSubmitCode = `<form id="guestbook-form">
  <input name="sender_name" placeholder="Your name" required>
  <input name="sender_website" placeholder="https://example.com">
  <textarea name="message" placeholder="Leave a note" required></textarea>
  <label>
    <input type="checkbox" name="is_private">
    Send as a private message
  </label>
  <input name="bot_field" tabindex="-1" autocomplete="off" style="display:none">
  <button type="submit">Sign guestbook</button>
</form>

<script>
document.getElementById("guestbook-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());

  const res = await fetch("${SITE}/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner_username: "${USER}",
      sender_name: data.sender_name,
      sender_website: data.sender_website,
      message: data.message,
      is_private: data.is_private === "on",
      bot_field: data.bot_field || ""
    })
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Submission failed");

  alert(result.status === "pending" ? "Sent for approval" : "Posted");
  form.reset();
});
<\/script>`;

const guestbookReplyLikeCode = `async function replyToEntry(parentId, message) {
  const res = await fetch("${SITE}/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner_username: "${USER}",
      sender_name: "Reader name",
      message,
      parent_id: parentId,
      bot_field: ""
    })
  });
  return await res.json();
}

async function likeEntry(entryId) {
  const res = await fetch("${SITE}/api/entries", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "like", id: entryId })
  });
  return await res.json();
}`;

const guestbookImportJson = `{
  "version": 1,
  "owner_username": "${USER}",
  "profile": {
    "custom_css": "",
    "custom_html": "",
    "require_approval": 0,
    "embed_css_url": ""
  },
  "entries": [
    {
      "sender_name": "Ada",
      "sender_website": "https://example.com",
      "message": "First guestbook note from the old site.",
      "created_at": "2024-05-01T10:30:00.000Z",
      "status": "approved",
      "is_private": 0,
      "is_owner": 0,
      "likes": 0
    }
  ]
}`;

const guestbookImportCurl = `curl -X POST "${SITE}/api/entries" \\
  -H "Authorization: Bearer ${TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "import_all",
    "owner_username": "${USER}",
    "data": {
      "owner_username": "${USER}",
      "profile": { "require_approval": 0 },
      "entries": [
        {
          "sender_name": "Ada",
          "message": "Imported note",
          "created_at": "2024-05-01T10:30:00.000Z"
        }
      ]
    }
  }'`;

const formBuilderJson = `{
  "name": "Portfolio Contact",
  "fields": [
    { "name": "name", "label": "Name", "type": "text", "required": true },
    { "name": "email", "label": "Email", "type": "email", "required": true },
    { "name": "reason", "label": "Reason", "type": "select", "required": true, "options": ["Project", "Question", "Hello"] },
    { "name": "message", "label": "Message", "type": "textarea", "required": true }
  ],
  "require_approval": false
}`;

const formHtmlCode = `<form id="contact-form">
  <label>
    Name
    <input name="name" required>
  </label>
  <label>
    Email
    <input type="email" name="email" required>
  </label>
  <label>
    Reason
    <select name="reason" required>
      <option value="">Choose one</option>
      <option>Project</option>
      <option>Question</option>
      <option>Hello</option>
    </select>
  </label>
  <label>
    Message
    <textarea name="message" required></textarea>
  </label>
  <input name="_honeypot" tabindex="-1" autocomplete="off" style="display:none">
  <button type="submit">Send</button>
</form>

<script>
document.getElementById("contact-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());

  const res = await fetch("${SITE}/api/submit?form=${FORM_ID}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const result = await res.json();
  if (!res.ok) {
    alert(result.details ? result.details.join("\\n") : result.error);
    return;
  }

  alert(result.message || "Message sent");
  form.reset();
});
<\/script>`;

const formCurlCode = `curl -X POST "${SITE}/api/submit?form=${FORM_ID}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Ada",
    "email": "ada@example.com",
    "reason": "Project",
    "message": "I would like to work together.",
    "_honeypot": ""
  }'`;

const formExportCode = `async function exportFormSubmissions() {
  const res = await fetch("${SITE}/api/submissions?form=${FORM_ID}&export=1", {
    headers: { Authorization: "Bearer ${TOKEN}" }
  });

  if (!res.ok) throw new Error("Export failed");
  const data = await res.json();

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "form-submissions.json";
  anchor.click();
  URL.revokeObjectURL(url);
}`;

const deleteSubmissionCode = `await fetch("${SITE}/api/submissions", {
  method: "DELETE",
  headers: {
    Authorization: "Bearer ${TOKEN}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ id: 123 })
});`;

const commentsWidgetCode = `<div id="comments"></div>
<script src="${SITE}/comments-widget.js"><\/script>
<script>
  CommentsWidget.mount({
    baseUrl: "${SITE}",
    sectionId: "${SECTION_ID}",
    container: "#comments"
  });
<\/script>`;

const commentsCustomCode = `<section id="comments"></section>
<form id="comment-form">
  <input name="sender_name" placeholder="Name" required>
  <input type="email" name="sender_email" placeholder="Email">
  <input type="url" name="sender_url" placeholder="Website">
  <textarea name="comment_text" placeholder="Comment" required></textarea>
  <input name="website_url_check" tabindex="-1" autocomplete="off" style="display:none">
  <button type="submit">Post comment</button>
</form>

<script>
const baseUrl = "${SITE}";
const sectionId = "${SECTION_ID}";
let pageUrl = window.location.origin + window.location.pathname;
if (!pageUrl.endsWith("/")) pageUrl += "/";

async function loadComments() {
  const res = await fetch(
    baseUrl + "/api/comments?section=" + encodeURIComponent(sectionId) +
    "&page_url=" + encodeURIComponent(pageUrl)
  );
  const data = await res.json();
  document.getElementById("comments").innerHTML = (data.comments || [])
    .map((comment) => "<article><strong>" + comment.sender_name + "</strong><p>" + comment.comment_text + "</p></article>")
    .join("");
}

document.getElementById("comment-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());

  const res = await fetch(baseUrl + "/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      section_id: sectionId,
      page_url: pageUrl
    })
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Could not post comment");
  alert(result.status === "pending" ? "Awaiting approval" : "Comment posted");
  form.reset();
  loadComments();
});

loadComments();
<\/script>`;

const commentsReplyLikeCode = `async function postReply(parentId, message) {
  const res = await fetch("${SITE}/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      section_id: "${SECTION_ID}",
      parent_id: parentId,
      sender_name: "Reader",
      comment_text: message,
      page_url: window.location.origin + window.location.pathname + "/"
    })
  });
  return await res.json();
}

async function likeComment(commentId) {
  const res = await fetch("${SITE}/api/comments", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "like", id: commentId })
  });
  return await res.json();
}`;

const commentModerationCode = `// Fetch all comments for a section, including pending comments.
const res = await fetch("${SITE}/api/comments?section=${SECTION_ID}&auth=1", {
  headers: { Authorization: "Bearer ${TOKEN}" }
});
const data = await res.json();

// Approve a pending comment.
await fetch("${SITE}/api/comments", {
  method: "PUT",
  headers: {
    Authorization: "Bearer ${TOKEN}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ action: "approve", id: 123 })
});

// Delete a comment.
await fetch("${SITE}/api/comments", {
  method: "DELETE",
  headers: {
    Authorization: "Bearer ${TOKEN}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ id: 123 })
});`;

const likesButtonCode = `<button id="like-button" type="button">Like</button>
<span id="like-count">0</span>

<script>
const baseUrl = "${SITE}";
const owner = "${USER}";
let postUrl = window.location.origin + window.location.pathname;
if (!postUrl.endsWith("/")) postUrl += "/";

async function refreshLikes() {
  const res = await fetch(baseUrl + "/api/likes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "get",
      owner_username: owner,
      post_url: postUrl
    })
  });
  const data = await res.json();
  document.getElementById("like-count").textContent = data.likes || 0;
}

document.getElementById("like-button").addEventListener("click", async () => {
  const res = await fetch(baseUrl + "/api/likes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "like",
      owner_username: owner,
      post_url: postUrl
    })
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Could not like this post");
    return;
  }
  document.getElementById("like-count").textContent = data.likes;
});

refreshLikes();
<\/script>`;

const likesCurlCode = `# Add one like
curl -X POST "${SITE}/api/likes" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"like","owner_username":"${USER}","post_url":"https://example.com/blog/post/"}'

# Read likes for a page
curl -X POST "${SITE}/api/likes" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"get","owner_username":"${USER}","post_url":"https://example.com/blog/post/"}'

# Read account summary
curl -X POST "${SITE}/api/likes" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"summary","owner_username":"${USER}"}'`;

function Note({ title, children, tone = "info" }) {
  return (
    <div className={`docs-note docs-note-${tone}`}>
      <strong>{title}</strong>
      <div>{children}</div>
    </div>
  );
}

function LinkCards({ cards }) {
  return (
    <div className="docs-card-grid">
      {cards.map((card) => (
        <Link key={card.href} to={card.href} className="docs-link-card">
          <span>{card.kicker}</span>
          <strong>{card.title}</strong>
          <p>{card.description}</p>
        </Link>
      ))}
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="docs-table-wrap">
      <table className="docs-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")}>
              {row.map((cell, index) => <td key={`${row[0]}-${index}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const DOCS_PAGES = {
  "/docs": {
    title: "Getting Started",
    description: "Choose the Website Tools feature you want to add to your site and follow the shortest safe path.",
    sections: [
      {
        id: "start-with-an-account",
        title: "Start with an account",
        content: (
          <>
            <p>
              Website Tools is organized around one dashboard account. The username you create becomes the owner identifier for guestbooks, forms, comments, and likes. If you have not signed up yet, start with the account creation flow, then return here and pick the feature you want to install first.
            </p>
            <p>
              Go to the <Link to="/">login and sign up page</Link> to create an account. If you want the step-by-step explanation first, read <Link to="/docs/account/create-account">Create an Account</Link>.
            </p>
            <Note title="Before you integrate anything">
              Save your username exactly as it appears in the dashboard. API examples use <code>{USER}</code> as a placeholder, and that value must match your real account username.
            </Note>
          </>
        )
      },
      {
        id: "choose-a-feature",
        title: "Choose a feature",
        content: (
          <>
            <p>
              Each feature can be used independently. You can embed the hosted UI, build your own static-site integration with the public APIs, or combine both approaches.
            </p>
            <LinkCards
              cards={[
                { href: "/docs/guestbook", kicker: "Guestbook", title: "Collect public notes", description: "Use a hosted guestbook, custom API UI, moderation, private messages, replies, likes, and old-data import." },
                { href: "/docs/contact-forms", kicker: "Contact forms", title: "Receive structured submissions", description: "Build forms with typed fields, validate responses, send Telegram alerts, export entries, and delete spam." },
                { href: "/docs/comments", kicker: "Comments", title: "Add discussion sections", description: "Create reusable comment sections for static pages with optional anonymity, replies, likes, and moderation." },
                { href: "/docs/likes", kicker: "Likes", title: "Add lightweight reactions", description: "Attach like counters to any page URL using a small public endpoint and simple JavaScript." }
              ]}
            />
          </>
        )
      },
      {
        id: "common-flow",
        title: "The common setup flow",
        content: (
          <>
            <ol>
              <li>Create an account and sign in to the dashboard.</li>
              <li>Open the feature area from the dashboard sidebar.</li>
              <li>Create or configure the resource you need, such as a form or comment section.</li>
              <li>Copy the embed snippet or API example into your website.</li>
              <li>Test from a real page URL, not only from a local file, because some browsers restrict requests from <code>file://</code>.</li>
              <li>Set a Telegram Chat ID in Account settings if you want real-time notifications or password-reset links.</li>
            </ol>
          </>
        )
      }
    ]
  },

  "/docs/account": {
    title: "Account Overview",
    description: "Your account owns the data, settings, notification preferences, and password controls for every feature.",
    sections: [
      {
        id: "what-the-account-controls",
        title: "What the account controls",
        content: (
          <>
            <p>
              A Website Tools account stores your username, password hash, profile settings, optional contact email, optional Telegram Chat ID, and feature data. Your username is public whenever you embed or call public APIs because it identifies which account receives a guestbook entry, form submission, like, or comment.
            </p>
            <ul>
              <li>The username is required for public guestbook and likes endpoints.</li>
              <li>Form IDs and comment section IDs are generated inside the dashboard.</li>
              <li>The dashboard uses a JWT saved in browser local storage after sign-in.</li>
              <li>Owner-only API actions require <code>Authorization: Bearer YOUR_DASHBOARD_JWT</code>.</li>
            </ul>
          </>
        )
      },
      {
        id: "account-pages",
        title: "Account documentation",
        content: (
          <LinkCards
            cards={[
              { href: "/docs/account/create-account", kicker: "Sign up", title: "Create an account", description: "Create a username and password, then sign in to the dashboard." },
              { href: "/docs/account/change-password", kicker: "Security", title: "Change your password", description: "Update a known password from the Account section." },
              { href: "/docs/account/password-reset", kicker: "Recovery", title: "Reset a forgotten password", description: "Request a Telegram reset link, or contact admin if Telegram is not set." }
            ]}
          />
        )
      }
    ]
  },

  "/docs/account/create-account": {
    title: "Create an Account",
    description: "Create a dashboard account before integrating guestbooks, forms, comments, or likes.",
    sections: [
      {
        id: "steps",
        title: "Steps",
        content: (
          <>
            <ol>
              <li>Open the <Link to="/">login and sign up page</Link>.</li>
              <li>Select <strong>Create account</strong>.</li>
              <li>Choose a username. This username will be used in public URLs and API calls.</li>
              <li>Enter a password with at least 8 characters.</li>
              <li>Submit the form, then sign in from the same page.</li>
            </ol>
            <Note title="Pick the username carefully">
              Your username appears in guestbook URLs such as <code>/u/your_username</code> and in public API payloads. If you later change naming conventions on your own site, your Website Tools username still needs to match the account owner.
            </Note>
          </>
        )
      },
      {
        id: "after-signup",
        title: "After signup",
        content: (
          <>
            <p>
              The dashboard opens with Overview, Guestbook, Forms, Comments, Likes, Data, Tester, and Account sections. A good first pass is to open Account settings and add a Telegram Chat ID. Telegram is optional for normal usage, but it is required for automatic password reset links.
            </p>
            <p>
              If you are setting up a feature immediately, continue with <Link to="/docs/guestbook">Guestbook</Link>, <Link to="/docs/contact-forms">Contact Forms</Link>, <Link to="/docs/comments">Comments</Link>, or <Link to="/docs/likes">Likes</Link>.
            </p>
          </>
        )
      },
      {
        id: "signup-edge-cases",
        title: "Edge cases",
        content: (
          <ul>
            <li>If the username is already taken, choose a different username.</li>
            <li>If the password is rejected, use at least 8 characters.</li>
            <li>If the dashboard does not open after sign-in, clear old local storage for the site and sign in again.</li>
            <li>If you use a password manager, save the exact username, not an email address unless your username is actually an email address.</li>
          </ul>
        )
      }
    ]
  },

  "/docs/account/change-password": {
    title: "Change Password",
    description: "Use the Account section when you know your current password and want to replace it.",
    sections: [
      {
        id: "change-from-dashboard",
        title: "Change it from the dashboard",
        content: (
          <>
            <ol>
              <li>Sign in to the dashboard.</li>
              <li>Open <strong>Account</strong> from the sidebar.</li>
              <li>Find <strong>Update Password</strong>.</li>
              <li>Enter your current password.</li>
              <li>Enter and confirm the new password. It must be at least 8 characters.</li>
              <li>Submit the form. The new password will be used the next time you sign in.</li>
            </ol>
            <Note title="Active sessions">
              Changing the password updates future sign-ins. If you are already signed in on the same browser, you may remain signed in until the stored token is removed or expires.
            </Note>
          </>
        )
      },
      {
        id: "common-errors",
        title: "Common errors",
        content: (
          <ul>
            <li><strong>Current password is incorrect:</strong> use the password that currently signs in successfully.</li>
            <li><strong>Password must be at least 8 characters long:</strong> choose a longer password before submitting again.</li>
            <li><strong>Network error:</strong> retry after confirming the deployed API is reachable.</li>
          </ul>
        )
      }
    ]
  },

  "/docs/account/password-reset": {
    title: "Password Reset",
    description: "Request a reset link by username. Reset links are delivered through Telegram.",
    sections: [
      {
        id: "how-reset-works",
        title: "How password reset works",
        content: (
          <>
            <p>
              The login and sign up page includes a <strong>Forgot your password?</strong> button. When clicked, it opens a reset request form that asks for your username. If that username belongs to an account with a Telegram Chat ID, Website Tools sends a password reset link to that Telegram chat.
            </p>
            <p>
              The reset link contains a one-time token. The server stores only a hash of that token, and the link expires after a short window. After the password is updated, the reset token is cleared.
            </p>
            <Note title="Telegram is required for self-service reset" tone="warning">
              If no Telegram Chat ID has been added to the account, the reset form tells the user to contact admin. Use <a href="https://blackpiratex.com/contact" target="_blank" rel="noreferrer">blackpiratex.com/contact</a> for manual recovery.
            </Note>
          </>
        )
      },
      {
        id: "request-steps",
        title: "Request a reset link",
        content: (
          <ol>
            <li>Open the <Link to="/">login page</Link>.</li>
            <li>Click <strong>Forgot your password?</strong>.</li>
            <li>Enter your account username.</li>
            <li>Submit the form.</li>
            <li>Open Telegram and look for the reset message.</li>
            <li>Click the reset link and enter a new password with at least 8 characters.</li>
          </ol>
        )
      },
      {
        id: "edge-cases",
        title: "Edge cases",
        content: (
          <ul>
            <li>If no account exists for the username, the page still shows a generic success-style response to avoid exposing account existence.</li>
            <li>If a Telegram Chat ID is missing, use the contact link for admin help.</li>
            <li>If Telegram delivery fails, make sure the account started a chat with the bot and saved the numeric Telegram Chat ID, not a Telegram username.</li>
            <li>If the link expired, request a new reset link from the login page.</li>
            <li>If the token has already been used, it cannot be reused. Request a new link.</li>
          </ul>
        )
      }
    ]
  },

  "/docs/guestbook": {
    title: "Guestbook Features",
    description: "A guestbook lets visitors leave notes on your site, with moderation, private messages, replies, likes, embeds, and a headless API.",
    sections: [
      {
        id: "what-it-does",
        title: "What the guestbook does",
        content: (
          <>
            <p>
              The guestbook is a visitor message wall. You can use the hosted page at <code>/u/your_username</code>, embed that page in an iframe, or build a completely custom guestbook using the API. Visitors can leave public notes, private notes, replies, and likes. Owners can approve pending entries, delete entries, reply as the owner, export data, and import older guestbook data.
            </p>
            <ul>
              <li><strong>Public entries:</strong> visible to anyone after approval.</li>
              <li><strong>Private entries:</strong> visible only inside your dashboard.</li>
              <li><strong>Replies:</strong> entries can be threaded with <code>parent_id</code>.</li>
              <li><strong>Owner replies:</strong> authenticated owner replies are marked as owner posts.</li>
              <li><strong>Likes:</strong> guestbook entries can receive simple public likes.</li>
              <li><strong>Moderation:</strong> require approval before visitor entries appear publicly.</li>
              <li><strong>Telegram alerts:</strong> if enabled, new visitor entries send Telegram notifications.</li>
            </ul>
          </>
        )
      },
      {
        id: "ways-to-use",
        title: "Ways to use it",
        content: (
          <LinkCards
            cards={[
              { href: "/docs/guestbook/embed", kicker: "Fastest", title: "Embed hosted guestbook", description: "Paste an iframe into your site and optionally load custom CSS inside the embed." },
              { href: "/docs/guestbook/api", kicker: "Flexible", title: "Build a custom API UI", description: "Fetch entries, submit messages, add replies, and wire likes from your own HTML." },
              { href: "/docs/guestbook/settings", kicker: "Control", title: "Configure settings", description: "Moderation, custom CSS, custom HTML, and embed CSS are controlled from the dashboard." },
              { href: "/docs/guestbook/import-old-data", kicker: "Migration", title: "Import old guestbook data", description: "Bring old notes into the dashboard manually or through JSON import." }
            ]}
          />
        )
      },
      {
        id: "data-visibility",
        title: "Data visibility",
        content: (
          <p>
            Public API reads return only approved, non-private entries. The dashboard read endpoint returns everything for the signed-in owner, including private and pending entries. This means your custom public page should call <code>GET /api/entries?user=your_username</code>, while dashboard or backup tooling should use authenticated requests.
          </p>
        )
      }
    ]
  },

  "/docs/guestbook/embed": {
    title: "Embed Guestbook",
    description: "Use the hosted guestbook UI inside your own site with a responsive iframe.",
    sections: [
      {
        id: "iframe-embed",
        title: "Iframe embed",
        content: (
          <>
            <p>
              The iframe embed is the quickest way to add a guestbook. It loads <code>/u/your_username?embed=1</code>, which removes the outer page chrome and sends resize messages to the parent page.
            </p>
            <CodeBlock label="Responsive iframe embed" language="html" rows={16} code={guestbookEmbedCode} />
          </>
        )
      },
      {
        id: "styling-embed",
        title: "Styling the embed",
        content: (
          <>
            <p>
              Open the dashboard's Guestbook Embed page and set an optional <strong>Embed CSS URL</strong>. This stylesheet loads inside the iframe, so it can style guestbook internals even though your parent page CSS cannot cross the iframe boundary.
            </p>
            <ul>
              <li>The URL must be a valid <code>https://</code> URL.</li>
              <li>If the stylesheet is blocked by CORS or returns the wrong content type, the embed still works but your custom styles may not load.</li>
              <li>Use the Preview embed button in the dashboard after saving.</li>
            </ul>
          </>
        )
      },
      {
        id: "embed-edge-cases",
        title: "Edge cases",
        content: (
          <ul>
            <li>If the iframe height is too short, keep the resize listener in the snippet.</li>
            <li>If your site uses a strict Content Security Policy, allow frames from your Website Tools deployment URL.</li>
            <li>If the embed shows a login page, confirm the URL is <code>/u/your_username?embed=1</code>, not <code>/dashboard</code>.</li>
            <li>If old browser privacy settings block third-party content, the headless API approach may be more reliable.</li>
          </ul>
        )
      }
    ]
  },

  "/docs/guestbook/api": {
    title: "Custom Guestbook API",
    description: "Build your own guestbook UI on a static site using public endpoints.",
    sections: [
      {
        id: "endpoints",
        title: "Public endpoints",
        content: (
          <>
            <DataTable
              columns={["Action", "Endpoint", "Notes"]}
              rows={[
                ["Read entries", "GET /api/entries?user=:username", "Returns approved, non-private entries."],
                ["Create entry", "POST /api/entries", "Creates a top-level entry or reply."],
                ["Like entry", "PUT /api/entries", "Use body { action: \"like\", id }."]
              ]}
            />
            <p>
              Public requests support cross-origin calls, so they can be used from static sites hosted somewhere else.
            </p>
          </>
        )
      },
      {
        id: "read-and-render",
        title: "Read and render entries",
        content: (
          <>
            <p>
              Fetch entries by username. The response is a flat array ordered newest first. Replies contain a <code>parent_id</code>, so your frontend can group them under the parent entry.
            </p>
            <CodeBlock label="Fetch and render entries" language="html" rows={24} code={guestbookFetchCode} />
          </>
        )
      },
      {
        id: "submit-entry",
        title: "Submit entries",
        content: (
          <>
            <p>
              Submit a JSON body to <code>POST /api/entries</code>. Include a hidden honeypot field called <code>bot_field</code>; if a bot fills it, the server silently accepts the request without storing spam.
            </p>
            <CodeBlock label="Custom submission form" language="html" rows={26} code={guestbookSubmitCode} />
          </>
        )
      },
      {
        id: "reply-and-like",
        title: "Replies and likes",
        content: (
          <>
            <p>
              A reply is just another entry with <code>parent_id</code> set to the parent entry ID. A like is a public <code>PUT</code> request with <code>{`{ "action": "like", "id": entryId }`}</code>.
            </p>
            <CodeBlock label="Reply and like helpers" language="javascript" rows={18} code={guestbookReplyLikeCode} />
          </>
        )
      },
      {
        id: "api-edge-cases",
        title: "Edge cases",
        content: (
          <ul>
            <li>If moderation is enabled, new visitor entries return <code>status: "pending"</code> and will not appear in public reads until approved.</li>
            <li>Private entries are stored but never returned by public reads.</li>
            <li>Owner-only actions like approve and delete require an Authorization header.</li>
            <li>Always escape visitor-generated HTML before rendering custom UIs.</li>
            <li>If a custom frontend runs from <code>file://</code>, move it to a local dev server or deployed page before testing fetch behavior.</li>
          </ul>
        )
      }
    ]
  },

  "/docs/guestbook/settings": {
    title: "Guestbook Settings",
    description: "Configure how the hosted guestbook and embed behave.",
    sections: [
      {
        id: "settings-page",
        title: "Settings page",
        content: (
          <>
            <p>
              The Settings page controls the hosted guestbook experience. It is separate from Account settings. Guestbook settings are included in full JSON export and can be restored through import.
            </p>
            <ul>
              <li><strong>Require approval:</strong> visitor entries are saved as pending until you approve them.</li>
              <li><strong>Custom CSS:</strong> CSS applied to the hosted public guestbook page.</li>
              <li><strong>Custom HTML:</strong> optional custom content displayed with the guestbook.</li>
              <li><strong>Embed CSS URL:</strong> an external stylesheet loaded inside iframe embed mode.</li>
            </ul>
          </>
        )
      },
      {
        id: "moderation-effects",
        title: "How moderation affects visitors",
        content: (
          <p>
            When approval is required, the submit endpoint still returns success, but the new entry has <code>status: "pending"</code>. Public reads hide it. The dashboard Overview shows pending entries and gives you approve and delete actions.
          </p>
        )
      },
      {
        id: "safe-customization",
        title: "Safe customization tips",
        content: (
          <ul>
            <li>Keep custom CSS small and scoped to guestbook selectors when possible.</li>
            <li>Use HTTPS for external stylesheets.</li>
            <li>Preview after changing custom HTML because malformed markup can affect the hosted guestbook layout.</li>
            <li>If a custom CSS URL stops loading, remove it and save settings to return to default styles.</li>
          </ul>
        )
      }
    ]
  },

  "/docs/guestbook/import-old-data": {
    title: "Import Old Guestbook Data",
    description: "Bring older guestbook messages into Website Tools.",
    sections: [
      {
        id: "manual-import",
        title: "Manual import from the dashboard",
        content: (
          <>
            <p>
              Use the Data tab to add individual older entries with a name, website, message, and date. This is best for small migrations where you want to review each message as it comes in.
            </p>
            <ol>
              <li>Open the dashboard.</li>
              <li>Go to <strong>Data</strong>.</li>
              <li>Fill in the import form with the old entry details.</li>
              <li>Use the original date if you know it.</li>
              <li>Submit and verify the entry in Overview.</li>
            </ol>
          </>
        )
      },
      {
        id: "json-import",
        title: "Full JSON import",
        content: (
          <>
            <p>
              For larger migrations, prepare a JSON backup shape with a profile object and entries array. The bulk import replaces current entries for the account, so export a backup first if you already have live data.
            </p>
            <CodeBlock label="Import JSON shape" language="json" rows={22} code={guestbookImportJson} />
            <CodeBlock label="Bulk import request" language="bash" rows={22} code={guestbookImportCurl} />
          </>
        )
      },
      {
        id: "import-edge-cases",
        title: "Edge cases",
        content: (
          <ul>
            <li>Each imported entry must have <code>sender_name</code> and <code>message</code>.</li>
            <li>Dates should be valid ISO strings. Invalid dates are rejected in manual import.</li>
            <li>Optional websites must be valid URLs.</li>
            <li>Bulk import deletes existing entries before inserting the imported list.</li>
            <li>If you include IDs, avoid duplicates. If omitted, the database generates new IDs.</li>
          </ul>
        )
      }
    ]
  },

  "/docs/contact-forms": {
    title: "Contact Forms Overview",
    description: "Create structured forms, receive validated submissions, and manage entries from the dashboard.",
    sections: [
      {
        id: "what-forms-do",
        title: "What contact forms do",
        content: (
          <p>
            Contact forms let you define fields in the dashboard and submit data from any website to <code>/api/submit?form=FORM_ID</code>. Submissions are validated against your field schema, stored in the dashboard, and can trigger Telegram notifications when notifications are configured.
          </p>
        )
      },
      {
        id: "form-docs",
        title: "Form documentation",
        content: (
          <LinkCards
            cards={[
              { href: "/docs/contact-forms/builder", kicker: "Builder", title: "Build forms", description: "Create fields, choose input types, set required fields, and understand validation." },
              { href: "/docs/contact-forms/api-integration", kicker: "Integration", title: "Use the form API", description: "Post JSON from HTML, JavaScript, cURL, or a static site generator." },
              { href: "/docs/contact-forms/submissions", kicker: "Entries", title: "Export and delete entries", description: "Download form data, approve pending submissions, reject spam, and delete records." }
            ]}
          />
        )
      }
    ]
  },

  "/docs/contact-forms/builder": {
    title: "Form Builder",
    description: "Use the dashboard builder to create forms and define typed fields.",
    sections: [
      {
        id: "create-a-form",
        title: "Create a form",
        content: (
          <>
            <ol>
              <li>Open the dashboard and go to Contact Forms.</li>
              <li>Open <strong>Form Builder</strong>.</li>
              <li>Create a new form and give it a clear name.</li>
              <li>Add fields. Every field needs a machine name, label, type, and required setting.</li>
              <li>For select and radio fields, add the allowed options.</li>
              <li>Save the form, then open Integration to copy the endpoint or HTML snippet.</li>
            </ol>
            <CodeBlock label="Example form schema" language="json" rows={16} code={formBuilderJson} />
          </>
        )
      },
      {
        id: "input-types",
        title: "Available input types",
        content: (
          <DataTable
            columns={["Type", "Use it for", "Validation"]}
            rows={[
              ["text", "Names, short answers, labels", "Accepts any non-empty string when required."],
              ["email", "Email addresses", "Must look like a valid email address."],
              ["textarea", "Long messages", "Accepts multiline text."],
              ["checkbox", "Boolean consent or yes/no", "Stored when present; design your UI with clear meaning."],
              ["number", "Quantities or numeric answers", "Must convert to a number."],
              ["phone", "Phone numbers", "Allows digits, spaces, dashes, parentheses, and plus."],
              ["url", "Website links", "Must be a valid URL."],
              ["select", "One option from a dropdown", "Submitted value must match one configured option."],
              ["radio", "One visible option from a group", "Submitted value must match one configured option."]
            ]}
          />
        )
      },
      {
        id: "builder-edge-cases",
        title: "Edge cases",
        content: (
          <ul>
            <li>Forms can have up to 20 fields.</li>
            <li>Field names should be stable. Changing a field name affects future submission keys.</li>
            <li>Select and radio fields must include at least one option.</li>
            <li>If you rename a label but keep the same field name, old and new submissions remain easier to compare.</li>
            <li>If a static form sends extra fields, the API stores only fields defined in the form schema.</li>
          </ul>
        )
      }
    ]
  },

  "/docs/contact-forms/api-integration": {
    title: "Contact Form API Integration",
    description: "Submit form data from a static site or custom frontend.",
    sections: [
      {
        id: "endpoint",
        title: "Endpoint",
        content: (
          <>
            <p>
              Each form has a public submission endpoint:
            </p>
            <CodeBlock label="Endpoint" language="text" rows={4} code={`POST ${SITE}/api/submit?form=${FORM_ID}`} />
            <p>
              The endpoint accepts JSON. The keys must match the field names configured in the Form Builder. Include <code>_honeypot</code> as a hidden spam field; real users will leave it empty.
            </p>
          </>
        )
      },
      {
        id: "html-example",
        title: "HTML and JavaScript example",
        content: (
          <>
            <p>
              This example works on plain static sites. Replace <code>{FORM_ID}</code> with your real form ID from the Integration page.
            </p>
            <CodeBlock label="Static HTML form" language="html" rows={34} code={formHtmlCode} />
          </>
        )
      },
      {
        id: "curl-example",
        title: "cURL example",
        content: (
          <CodeBlock label="Submit from cURL" language="bash" rows={12} code={formCurlCode} />
        )
      },
      {
        id: "validation-and-responses",
        title: "Validation and responses",
        content: (
          <>
            <p>
              The API validates required fields and type-specific rules. A valid submission returns <code>201</code> with <code>success: true</code>. If the form requires approval, the response status is <code>pending</code>; otherwise it is approved immediately.
            </p>
            <DataTable
              columns={["Status", "Meaning", "Fix"]}
              rows={[
                ["400", "Missing form ID, invalid field, or validation failed", "Check field names and required values."],
                ["404", "Form not found", "Verify the form ID."],
                ["500", "Database or save error", "Retry and check deployment logs."],
                ["201", "Submission accepted", "Show a success message."]
              ]}
            />
          </>
        )
      }
    ]
  },

  "/docs/contact-forms/submissions": {
    title: "Export and Delete Form Entries",
    description: "Manage submitted form entries from the dashboard or authenticated API calls.",
    sections: [
      {
        id: "dashboard-management",
        title: "Dashboard management",
        content: (
          <ul>
            <li>Open <strong>Submissions</strong> to view entries for a selected form.</li>
            <li>Pending submissions can be approved or rejected when moderation is enabled.</li>
            <li>Rejected submissions are deleted.</li>
            <li>Use export when you need a portable JSON copy of a form and all its submissions.</li>
          </ul>
        )
      },
      {
        id: "export-api",
        title: "Export API",
        content: (
          <>
            <p>
              Authenticated owners can export a form's submissions with <code>GET /api/submissions?form=FORM_ID&amp;export=1</code>.
            </p>
            <CodeBlock label="Export submissions" language="javascript" rows={24} code={formExportCode} />
          </>
        )
      },
      {
        id: "delete-api",
        title: "Delete an entry",
        content: (
          <>
            <p>
              Delete a submission by ID. The API verifies that the submission belongs to a form owned by the authenticated account.
            </p>
            <CodeBlock label="Delete submission" language="javascript" rows={12} code={deleteSubmissionCode} />
          </>
        )
      },
      {
        id: "entry-edge-cases",
        title: "Edge cases",
        content: (
          <ul>
            <li>Submission management endpoints require a dashboard JWT.</li>
            <li>Deleting an entry is permanent.</li>
            <li>Deleting a form also deletes its submissions.</li>
            <li>Export before bulk cleanup if the data may be needed later.</li>
          </ul>
        )
      }
    ]
  },

  "/docs/comments": {
    title: "Comments Overview",
    description: "Add reusable comment sections with replies, likes, optional anonymity, page-specific filtering, and moderation.",
    sections: [
      {
        id: "what-comments-do",
        title: "What comments do",
        content: (
          <p>
            Comments are organized by sections. A section is a reusable configuration that can be embedded on one page or many pages. Public reads can filter by <code>page_url</code>, so the same section can power comments across a blog while keeping each post's thread separate.
          </p>
        )
      },
      {
        id: "comment-docs",
        title: "Comment documentation",
        content: (
          <LinkCards
            cards={[
              { href: "/docs/comments/sections", kicker: "Setup", title: "Sections", description: "Create section IDs, configure fields, allow anonymity, enable likes, and require approval." },
              { href: "/docs/comments/integration", kicker: "Static sites", title: "Integration", description: "Embed the widget or build a custom comment UI with public APIs." },
              { href: "/docs/comments/moderation", kicker: "Owner tools", title: "Moderation", description: "Approve pending comments, delete comments, and understand rate limits." }
            ]}
          />
        )
      }
    ]
  },

  "/docs/comments/sections": {
    title: "Comment Sections",
    description: "A section defines how a comment area behaves.",
    sections: [
      {
        id: "section-concept",
        title: "What is a section?",
        content: (
          <p>
            A comment section is a named container with settings. The section ID is used by widgets and API calls. You might create one section for your whole blog, one for a guest essay area, and one for a project changelog. If you pass <code>page_url</code>, each page gets its own public thread even when it shares the same section ID.
          </p>
        )
      },
      {
        id: "settings",
        title: "Section settings",
        content: (
          <ul>
            <li><strong>Name:</strong> internal label shown in the dashboard.</li>
            <li><strong>Name field:</strong> choose whether visitor names are shown and required.</li>
            <li><strong>Email field:</strong> collect an email privately for context. Public rendering should avoid displaying it.</li>
            <li><strong>URL field:</strong> collect a website link.</li>
            <li><strong>Allow anonymous:</strong> visitors can hide identity fields and post as Anonymous.</li>
            <li><strong>Allow likes:</strong> comment UIs can show like buttons.</li>
            <li><strong>Require approval:</strong> new visitor comments stay pending until approved.</li>
          </ul>
        )
      },
      {
        id: "page-url",
        title: "Page URL filtering",
        content: (
          <p>
            For static sites, use a normalized page URL like <code>window.location.origin + window.location.pathname</code> and add a trailing slash. The comments API normalizes trailing slashes, but being consistent prevents duplicate threads for the same page.
          </p>
        )
      }
    ]
  },

  "/docs/comments/integration": {
    title: "Static Site Comment Integration",
    description: "Add comments to plain HTML, static site generators, or custom frontends.",
    sections: [
      {
        id: "widget",
        title: "Widget embed",
        content: (
          <>
            <p>
              The widget is the quickest integration path. Create a section in the dashboard, copy its section ID, then add this snippet to your page.
            </p>
            <CodeBlock label="Comments widget" language="html" rows={12} code={commentsWidgetCode} />
          </>
        )
      },
      {
        id: "custom-ui",
        title: "Custom API UI",
        content: (
          <>
            <p>
              A custom UI reads approved comments with <code>GET /api/comments?section=SECTION_ID&amp;page_url=PAGE_URL</code> and posts comments to <code>POST /api/comments</code>.
            </p>
            <CodeBlock label="Custom comments UI" language="html" rows={42} code={commentsCustomCode} />
          </>
        )
      },
      {
        id: "replies-and-likes",
        title: "Replies and likes",
        content: (
          <>
            <p>
              Replies use <code>parent_id</code>. Likes use <code>PUT /api/comments</code> with <code>action: "like"</code>.
            </p>
            <CodeBlock label="Reply and like helpers" language="javascript" rows={22} code={commentsReplyLikeCode} />
          </>
        )
      },
      {
        id: "integration-edge-cases",
        title: "Edge cases",
        content: (
          <ul>
            <li>If approval is required, new comments return <code>pending</code> and public reads will hide them until approved.</li>
            <li>If anonymous posting is enabled, do not require name or email fields when the anonymous checkbox is selected.</li>
            <li>The spam honeypot field is named <code>website_url_check</code>.</li>
            <li>Public comment posting is rate-limited: 5 seconds between comments and 10 comments per hour per IP.</li>
            <li>Always escape comment text before rendering custom HTML.</li>
          </ul>
        )
      }
    ]
  },

  "/docs/comments/moderation": {
    title: "Comment Moderation Tools",
    description: "Approve, delete, and review comments safely.",
    sections: [
      {
        id: "dashboard-tools",
        title: "Dashboard tools",
        content: (
          <ul>
            <li><strong>Comments Overview:</strong> see recent comments across sections.</li>
            <li><strong>Sections:</strong> create, edit, and delete reusable comment areas.</li>
            <li><strong>Moderation:</strong> review pending comments for the selected section.</li>
            <li><strong>Replies:</strong> reply as the owner from moderation tools.</li>
            <li><strong>Delete:</strong> remove spam or unwanted comments permanently.</li>
          </ul>
        )
      },
      {
        id: "moderation-api",
        title: "Moderation API",
        content: (
          <>
            <p>
              Owner moderation uses authenticated requests. Public users can like comments, but approve and delete require a valid dashboard token.
            </p>
            <CodeBlock label="Moderate comments" language="javascript" rows={32} code={commentModerationCode} />
          </>
        )
      },
      {
        id: "deleting-sections",
        title: "Deleting sections",
        content: (
          <p>
            Deleting a section removes the section. The database schema is set up with cascading relationships for comments in new tables, but you should still export anything important before deleting a section because the dashboard treats deletion as permanent.
          </p>
        )
      }
    ]
  },

  "/docs/likes": {
    title: "Likes and Integration",
    description: "Attach a small like counter to any page URL.",
    sections: [
      {
        id: "how-likes-work",
        title: "How likes work",
        content: (
          <>
            <p>
              Likes are stored by account username and normalized post URL. The API uses a single endpoint, <code>POST /api/likes</code>, with three actions: <code>like</code>, <code>get</code>, and <code>summary</code>.
            </p>
            <DataTable
              columns={["Action", "Purpose", "Required fields"]}
              rows={[
                ["like", "Increment the count for one post", "owner_username, post_url"],
                ["get", "Read the count for one post", "owner_username, post_url"],
                ["summary", "Read total likes and top posts", "owner_username"]
              ]}
            />
          </>
        )
      },
      {
        id: "button-example",
        title: "Like button example",
        content: (
          <>
            <p>
              Use the canonical page URL as the identifier. The API normalizes the origin and path, adds a trailing slash when missing, and preserves query strings.
            </p>
            <CodeBlock label="Static like button" language="html" rows={36} code={likesButtonCode} />
          </>
        )
      },
      {
        id: "api-examples",
        title: "API examples",
        content: (
          <CodeBlock label="Likes API with cURL" language="bash" rows={18} code={likesCurlCode} />
        )
      },
      {
        id: "rate-limits-and-edge-cases",
        title: "Rate limits and edge cases",
        content: (
          <ul>
            <li>Like actions are rate-limited to 5 seconds between likes and 50 likes per hour per IP per post.</li>
            <li><code>get</code> and <code>summary</code> responses are cacheable for a short time, so counts may not update instantly everywhere.</li>
            <li>Invalid URLs are rejected. Always send absolute URLs such as <code>https://example.com/post/</code>.</li>
            <li>If your site can be reached with and without trailing slash, pick one canonical URL before sending likes.</li>
            <li>The likes endpoint does not require authentication because it is designed for public visitor interaction.</li>
          </ul>
        )
      }
    ]
  }
};
