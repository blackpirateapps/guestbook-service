# Website Tools AI Handoff

This is the current map of the repo. The UI brands the product as Website Tools, while the package name in `package.json` is still `guestbook-vite`.

## Overview

Website Tools is a React + Vite app for personal-site tooling:
- Guestbooks with replies, likes, moderation, privacy, embeds, and JSON import/export.
- Contact forms with a visual builder, public submission endpoint, moderation, and exports.
- Comment sections with threaded replies, likes, moderation, anonymous mode, and embeds.
- A simple likes API for arbitrary blog post URLs.
- An admin surface for role/status management, password reset links, and user support messages.

The frontend is a React 18 SPA. The backend is a set of Vercel serverless functions in `api/` that talk to LibSQL/Turso.

## Technology Stack

- Frontend: React 18, React Router DOM, Vite.
- Styling: Vanilla CSS in `src/index.css` with a warm, light-first, Notion-inspired token system.
- Icons: `lucide-react` for the dashboard UI, custom inline SVG icons in `src/components/Icons.jsx` for public guestbook actions.
- Charts: `recharts` for dashboard summaries.
- Database: `@libsql/client` for Turso/LibSQL.
- Auth and security: `jsonwebtoken`, `bcryptjs`, and `dompurify`.

## Repository Map

```text
/home/dog/git/guestbook-service/
api/                     # Vercel serverless functions
  db.js                  # LibSQL client, table init helpers, Telegram notifications
  user.js                # Signup, login, profile fetch/update
  entries.js             # Guestbook CRUD, replies, likes, import/export
  forms.js               # Contact form CRUD
  submit.js              # Public form submission endpoint
  submissions.js         # Owner-only form submission management
  comment-sections.js    # Comment section CRUD
  comments.js            # Public comments + moderation
  likes.js               # Post-like counter API
  access.js              # Shared account role/status helpers and active/admin guards
  admin.js               # Admin-only user list, roles/status, password reset link generation
  admin-messages.js      # User-to-admin dashboard messages
src/
  App.jsx                # Route switcher and app shell
  main.jsx               # React bootstrap
  index.css              # Global design system and layout styles
  components/            # Shared UI pieces (Toast, CodeBlock, Icons, Tabs)
  features/dashboard/    # Dashboard feature tabs and snippet generators
  pages/                 # Auth, dashboard, and public guestbook pages
public/
  guestbook-widget.js    # Standalone guestbook helper script
  comments-widget.js     # Standalone comments widget
README.md
design.md
vercel.json
dist/                    # Generated build output; do not treat as source
```

## Routes And Shell

- `/` renders `Auth.jsx`.
- `/dashboard` renders the authenticated dashboard.
- `/admin` renders the admin-only user management page. The API accepts active users with role `admin`; `sudip` is always normalized to active admin.
- `/u/:username` renders the public guestbook.
- `?embed=1` switches the public guestbook into embed mode.

`src/App.jsx` uses `ToastProvider` for normal public and dashboard routes, but skips the outer chrome for embed mode. Dashboard navigation is driven by URL search params (`?tab=...`) and should stay that way.

`src/pages/Admin.jsx` reads the existing JWT from `localStorage`, lists users through `GET /api/admin`, can update roles/statuses through `POST /api/admin?action=update_user`, and can generate reset links through `POST /api/admin?action=generate_password_reset`. Generated links point at the existing `/reset-password` page and are shown in the browser after generation so the admin can copy them. The page also lists messages sent from user dashboards through `GET /api/admin-messages`.

## Design System

`src/index.css` defines the actual design language used by the app:
- Warm neutral palette with `--color-bg`, `--color-bg-alt`, `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-accent`, and related semantic tokens.
- Inter is loaded from Google Fonts, with monospace code surfaces using `ui-monospace`.
- Rounded cards, whisper borders, and layered shadows are used across the dashboard.
- Shared classes include `.panel-card`, `.entry-card`, `.sidebar-link`, `.badge`, `.code-textarea`, `.toast`, `.auth-page`, and `.dashboard-sidebar`.
- Dark-mode token overrides exist via `prefers-color-scheme`, but the experience is still light-first.

## Dashboard Architecture

`src/pages/Dashboard.jsx` is the state orchestrator. It keeps one large set of local state for guestbook entries, forms, comments, likes, account settings, and the API tester, then delegates rendering to tab components in `src/features/dashboard/`.

The sidebar groups are:
- Guestbook: Overview, Embed, Settings, Data, API Tester.
- Contact Forms: Overview, Form Builder, Integration, Submissions.
- Comments: Overview, Sections, Integration, Moderation.
- Likes: dashboard summary and API testing.
- Account: email and Telegram notification settings.
- Contact Admin: lets signed-in users send messages to the admin dashboard.

Important dashboard behaviors:
- Guestbook settings save custom CSS, custom HTML, embed CSS URL, moderation, email, and Telegram fields through `PUT /api/user`.
- The Data tab exports and imports the entire guestbook dataset and profile settings through `GET /api/entries?export=1` and `POST /api/entries` with `action: "import_all"`.
- The API tester posts directly to `/api/entries` for create, reply, and like flows.
- New dashboard logic should live in `src/features/dashboard/` instead of growing `Dashboard.jsx` further.

## Public Guestbook Flow

`src/pages/PublicGuestbook.jsx`:
- Fetches approved, non-private guestbook entries with `GET /api/entries?user=:username`.
- Fetches the public profile with `GET /api/user?username=:username`.
- Injects `custom_css` directly into a `<style>` tag.
- Sanitizes `custom_html` with DOMPurify before rendering it in the page header.
- Loads the optional embed stylesheet only when `?embed=1` is present.
- Supports guestbook replies, likes, and private messages.
- Uses a honeypot field named `website_url_check` in the UI, which maps to `bot_field` on the guestbook create endpoint.
- In embed mode, sends height updates to the parent window via `postMessage` and `ResizeObserver`.

Public guestbook behavior is straightforward:
- Root entries are the top-level posts.
- Replies are nested under their parent entry.
- Entries marked `is_owner` render an owner badge.
- Entries marked private never appear in the public listing.

## API Surface

### `api/user.js`

- `POST /api/user?action=signup` creates an account from `{ username, password }`.
- `POST /api/user?action=login` validates credentials and returns `{ token, username, role, account_status }`; suspended accounts receive `403` with `code: "account_suspended"`.
- `GET /api/user?username=...` returns profile data for the public guestbook and dashboard.
- `PUT /api/user` updates `custom_css`, `custom_html`, `require_approval`, `embed_css_url`, `email`, `telegram_chat_id`, and `telegram_notifications`.
- `embed_css_url` must be a valid `https://` URL.

### `api/admin.js`

- Admin-only endpoint; every request must include a JWT for an active account with role `admin`.
- `GET /api/admin` returns all users with non-sensitive profile/reset metadata: username, role, account status, email, Telegram status, and active reset expiry.
- `POST /api/admin?action=update_user` with `{ username, role, account_status }` changes a user between `user`/`admin` and `active`/`suspended`. The primary `sudip` account cannot be demoted or suspended.
- `POST /api/admin?action=generate_password_reset` with `{ username, origin }` creates a 30-minute password reset token for any user and returns `{ reset_link, expires_at }`.
- Reset links are not sent through Telegram by this endpoint; the admin page displays them so the admin can copy or share them manually.
- The endpoint never returns password hashes or reset token hashes.

### `api/admin-messages.js`

- `POST /api/admin-messages` is available to active signed-in users and stores `{ subject, message }` for admins.
- `GET /api/admin-messages` lists messages for active admins.
- `PUT /api/admin-messages` updates message status to `open`, `read`, or `closed`.
- `DELETE /api/admin-messages` deletes a message.

### `api/entries.js`

- `GET /api/entries?user=:username` returns approved, non-private entries for the public guestbook.
- `GET /api/entries` with a JWT returns all entries for the authenticated owner.
- `GET /api/entries?export=1` with a JWT returns a versioned export containing profile settings and all entries.
- `POST /api/entries` creates a guestbook entry or reply.
- `POST /api/entries` with `action: "import"` inserts a backdated owner entry.
- `POST /api/entries` with `action: "import_all"` replaces the owner's entries and profile settings from a full export.
- `PUT /api/entries` with `action: "like"` increments a guestbook entry's likes.
- `PUT /api/entries` with `action: "approve"` approves a pending entry for the authenticated owner.
- `DELETE /api/entries` deletes an entry for the authenticated owner.

Guestbook notes:
- The public create flow uses `bot_field` as a honeypot.
- Moderation is driven by the owner's `require_approval` profile flag unless the owner is posting.
- Replies use `parent_id`.
- `is_private` keeps an entry visible only inside the dashboard.

### `api/forms.js`

- Owner-only CRUD for contact forms.
- `GET /api/forms` lists forms with submission counts.
- `GET /api/forms?id=:formId` returns one form.
- `POST /api/forms` creates a form.
- `PUT /api/forms` updates a form.
- `DELETE /api/forms` deletes a form and its submissions.
- Fields are capped at 20 and support `text`, `email`, `textarea`, `checkbox`, `number`, `phone`, `url`, `select`, and `radio`.
- `select` and `radio` fields require an options array.

### `api/submit.js`

- Public CORS-enabled `POST /api/submit?form=:formId`.
- Validates submissions against the stored form schema.
- Uses `_honeypot` as a spam trap.
- Stores submissions as `pending` or `approved` based on the form's `require_approval` flag.
- Returns a friendly success message in JSON.

### `api/submissions.js`

- Owner-only submission management.
- `GET /api/submissions?form=:formId` lists submissions for a form.
- `GET /api/submissions?form=:formId&export=1` returns a versioned export payload.
- `PUT /api/submissions` approves or rejects a submission.
- `DELETE /api/submissions` deletes a submission.

### `api/comment-sections.js`

- Owner-only CRUD for comment sections.
- `GET /api/comment-sections?id=:sectionId` is public and returns a single section definition.
- `GET /api/comment-sections` with JWT lists the owner's sections and comment counts.

### `api/comments.js`

- `GET /api/comments?section=:sectionId` returns approved comments for public viewers.
- `GET /api/comments?section=:sectionId&page_url=:url` also filters by the current page URL.
- `GET /api/comments?section=:sectionId&auth=1` with JWT lets the dashboard see all comments for the owned section.
- `POST /api/comments` creates comments and replies.
- `PUT /api/comments` with `action: "like"` increments likes.
- `PUT /api/comments` with `action: "approve"` approves a pending comment.
- `DELETE /api/comments` deletes a comment for the authenticated owner.

Comment settings are stored as JSON and control:
- Which fields are shown and required for name, email, and URL.
- Whether anonymous comments are allowed.
- Whether likes are enabled.
- Whether approval is required.

The comment create flow uses:
- `website_url_check` as a honeypot.
- IP-based rate limiting.
- `page_url` normalization with a trailing slash.
- Owner bypass for moderation and rate limits.

### `api/likes.js`

- `POST /api/likes` is the only entry point.
- `action: "like"` increments a post URL counter.
- `action: "get"` fetches likes for one post URL.
- `action: "summary"` returns total likes, post count, and the top 5 liked posts for a user.
- `post_url` is normalized to origin + pathname + optional search string.
- Rate limiting allows 5 seconds between likes and 50 likes per hour per IP per post.
- `get` and `summary` responses are cacheable; likes are not.

### `api/db.js`

- Creates the tables that this repo owns: `forms`, `form_submissions`, `rate_limits`, `post_likes`, `comment_sections`, `comments`, and `admin_messages`.
- Sends Telegram notifications when `TELEGRAM_BOT_TOKEN` is set and the user has Telegram notifications enabled.
- Looks up `telegram_chat_id` and `telegram_notifications` from the `users` table.

## Schema Notes

- `users` and `entries` are assumed to exist already. This repo does not create those tables.
- `api/user.js`, `api/admin.js`, and `api/access.js` opportunistically add columns such as `embed_css_url`, `email`, `telegram_chat_id`, `telegram_notifications`, `role`, and `account_status` if they are missing.
- Password reset flows opportunistically add `password_reset_token_hash` and `password_reset_expires` to `users`.
- Suspended users cannot log in, use authenticated dashboard APIs, or receive new guestbook entries, comment submissions/likes, post likes, or contact form submissions.
- `api/db.js` creates the `admin_messages` table for user-to-admin dashboard messages.
- If you change the schema, remember that the code assumes the owner profile row already exists before writing settings.

## Widgets And Snippets

- `public/guestbook-widget.js` exposes `GuestbookWidget.fetchEntries`, `submitEntry`, `submitReply`, `likeEntry`, and `mount`.
- `public/comments-widget.js` exposes `CommentsWidget.mount` and handles comment rendering, likes, replies, and anonymous mode.
- `src/features/dashboard/snippets.js` generates the embed iframe snippet, headless guestbook examples, comment embed snippets, form snippets, and likes docs.
- `src/features/dashboard/EmbedTab.jsx` and the integration tabs read from those snippet helpers, so keep the helpers and the UI in sync.

## Development And Deployment

- `npm run dev` starts Vite locally.
- `npm run build` produces the client bundle in `dist/`.
- `vercel.json` rewrites `/api/*` to the serverless functions and everything else to `index.html`.
- Environment variables used by the code are `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, and `TELEGRAM_BOT_TOKEN`.

## Notes For Future Agents

- Use absolute paths when editing files.
- Keep the `?tab=` dashboard state model intact unless the user explicitly asks to change navigation.
- Keep `?embed=1` behavior intact for public guestbook embeds.
- Prefer adding dashboard logic inside `src/features/dashboard/` instead of expanding `Dashboard.jsx`.
- Treat `dist/` as generated output.
- If you touch auth, entries, or profile persistence, double-check the external `users` and `entries` table assumptions first.
