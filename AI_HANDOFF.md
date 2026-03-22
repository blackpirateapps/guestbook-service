# Website Tools AI Handoff

Welcome, Agent. This document provides a high-level overview of the Website Tools web application to help you quickly understand the codebase, its architecture, and how to operate within it.

## Overview

Website Tools is a lightweight, customizable web application suite that provides essential tools for personal websites. It includes a Guestbook Service, a Contact Form Builder, and a Comments System.

## Technology Stack

- **Frontend Framework:** React 18, utilizing React Router DOM for routing.
- **Build Tool:** Vite, configured for fast, modern frontend development.
- **Styling:** Vanilla CSS (`src/index.css`) with a modern, clean design system. Uses CSS custom properties (variables) for colors, shadows, and border-radius tokens. Includes full dark mode support via `prefers-color-scheme`.
- **Database:** LibSQL (Turso) via `@libsql/client`.
- **Backend/API:** Serverless functions designed to be hosted on Vercel. Located in the `/api` directory.
- **Security:** JWT for authentication, bcryptjs for password hashing, and DOMPurify for sanitizing user-provided custom HTML.

## Directory Structure

```
/home/dog/git/guestbook-service/
├── api/             # Vercel Serverless Functions (Website Tools API)
│   ├── db.js        # LibSQL database connection utility + table init
│   ├── user.js      # Consolidated Login, Signup, and Profile management
│   ├── entries.js   # CRUD operations for guestbook messages & replies
│   ├── forms.js     # Contact form CRUD
│   ├── submit.js    # Public endpoint for form submissions
│   ├── submissions.js # View and manage form submissions
│   ├── comment-sections.js # CRUD for comment sections
│   └── comments.js    # Fetch and post comments
├── src/             # React Frontend Code
│   ├── App.jsx      # Main application router and shell with navbar
│   ├── index.css    # Global design system
│   ├── main.jsx     # Vite React entry point
│   ├── components/  # Reusable UI components
│   └── pages/       # Page-level components
├── public/          # Static Assets
│   ├── guestbook-widget.js # Embeddable guestbook widget
│   └── comments-widget.js  # Embeddable comments widget
```

## Design System (`src/index.css`)

The CSS uses a token-based approach with CSS custom properties:

**Color Tokens:**

- `--bg-color`, `--bg-secondary` - Background colors
- `--text-main`, `--text-muted` - Text colors
- `--accent-primary`, `--accent-primary-hover` - Brand/link colors
- `--border-color`, `--card-bg`, `--bg-input` - UI element colors

**Spacing/Shape Tokens:**

- `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px)
- `--shadow-sm`, `--shadow-md`, `--shadow-lg` - Elevation shadows

**Component Classes:**

- `.card`, `.panel-card` - Card containers
- `.sidebar-link` - Sidebar navigation items
- `.entry-card`, `.reply-card` - Guestbook entry styling
- `.auth-card`, `.auth-tabs` - Authentication form styling
- `.stat-card` - Dashboard statistics cards

## Key Mechanisms & Workflows

### 1. Client-Side Routing (`App.jsx`)

The application uses `react-router-dom` for navigation (`/`, `/dashboard`, `/u/:username`).

**Embed Mode:** Public guestbooks can be embedded via iframe using `?embed=1` on `/u/:username`. In embed mode, the app renders only the guestbook (no navbar), posts height updates to the parent window, and supports custom embed CSS URLs.

### 2. Dashboard (`Dashboard.jsx`)

The dashboard uses a **Sidebar Navigation** layout. Tools are grouped into logical clusters:

- **Guestbook Area:** Overview, Embed, Settings, Data, API Tester.
- **Contact Forms Area:** Forms, Submissions.
- **Comments Area:** Sections, Moderation.

Navigation state is managed via `useSearchParams` (`?tab=...`).

**Layout Model:** A responsive sidebar container (`.dashboard-container`). On desktop, it's a two-column grid with a sticky sidebar. On mobile, it stacks vertically.

### 3. Authentication & User Profile (`Auth.jsx`, `api/user.js`)

Authentication and profile management (custom CSS/HTML) are consolidated into `api/user.js`:

- `POST /api/user?action=signup` - Create account
- `POST /api/user?action=login` - Sign in
- `GET /api/user?username=...` - Fetch profile settings (CSS, HTML, moderation)
- `PUT /api/user` - Update profile settings (Auth required)

No email is required for the account flow.

### 4. Serverless API Layer (`/api`)

APIs extract JWT from `Authorization` header for authenticated actions. Public actions require `owner_username`.

**Key Endpoints:**

- `GET /api/entries?user=:username` - Public entries
- `POST /api/entries` - Create entry/reply
- `PUT /api/entries` - Like or approve entries
- `DELETE /api/entries` - Delete entry (auth required)
- `GET /api/entries?export=1` - Export all data (auth required)

**Contact Form Endpoints:**

- `GET /api/forms` - List user's forms (auth required)
- `POST /api/forms` - Create new form (auth required)
- `PUT /api/forms` - Update form (auth required)
- `DELETE /api/forms` - Delete form (auth required)
- `POST /api/submit?form=:formId` - Submit to form (public, CORS enabled)
- `GET /api/submissions?form=:formId` - List submissions (auth required)
- `DELETE /api/submissions` - Delete submission (auth required)

**Comments Endpoints:**

- `GET /api/comment-sections` - List user's sections (auth)
- `POST /api/comment-sections` - Create new section (auth)
- `PUT /api/comment-sections` - Update section settings (auth)
- `DELETE /api/comment-sections` - Delete section (auth)
- `GET /api/comments?section=:id` - Fetch public comments (public)
- `POST /api/comments` - Post a new comment (public)
- `PUT /api/comments` - Like or approve a comment
- `DELETE /api/comments` - Delete a comment (auth)

### 5. Security & Moderation

- **XSS Prevention:** DOMPurify sanitizes custom HTML in `PublicGuestbook.jsx`. Widget uses basic HTML escaping.
- **Honeypot:** Hidden `website_url_check` field catches spam bots (guestbook), `_honeypot` field for contact forms
- **Moderation:** Optional approval flow holds entries with `status: 'pending'`

### 6. Contact Form Builder

The Contact Form Builder allows users to create custom forms for external websites:

**Database Tables:**
- `forms` - Stores form definitions (id, owner_username, name, fields JSON, created_at)
- `form_submissions` - Stores submissions (id, form_id, data JSON, ip_address, created_at)

**Supported Field Types:**
- `text`, `email`, `textarea`, `checkbox`, `number`, `phone`, `url`, `select`, `radio`

**Form Fields Schema (JSON):**
```json
[
  { "name": "email", "label": "Email", "type": "email", "required": true },
  { "name": "plan", "label": "Plan", "type": "select", "options": ["Basic", "Pro"], "required": false }
]
```

**Public Submission Endpoint:**
- `POST /api/submit?form=:formId` - CORS enabled, validates against form schema
- Honeypot protection via `_honeypot` field
- Returns JSON: `{ success: true, message: "..." }`

**Visibility model:** Form submissions are private and owner-only (not publicly displayed).

**Integration:** The Forms tab provides ready-to-use HTML/JS snippets for embedding forms on external sites.

### 7. Comments System

The Comments System allows users to embed threaded discussions on any page.

**Database Tables:**
- `comment_sections` - Stores section configuration (id, owner_username, name, settings JSON)
- `comments` - Stores comments (id, section_id, parent_id, sender_name, sender_email, sender_url, comment_text, status, likes, page_url, etc.)

**URL Isolation:** Comments are associated with the `page_url` from which they were submitted. The public API and widgets automatically filter comments to only show those belonging to the current page's URL (`window.location.origin + window.location.pathname`).

**Settings (JSON):**
- `fields`: Toggle visibility and requirement for `name`, `email`, and `url`.
- `allow_anonymous`: Boolean.
- `allow_likes`: Boolean.
- `require_approval`: Boolean.

**Integration:** The Sections tab provides both a `CommentsWidget.mount()` snippet for quick embedding and a **Headless API (Custom Form)** HTML/JS snippet for fully custom integrations.

**Anonymous Mode:** When `is_anonymous` is checked/true, name, email, and URL fields are hidden and their requirements are bypassed on the server.

## Development & Testing Workflow

- **Local Dev Server:** `npm run dev` launches Vite on `localhost:5173`
- **Building:** `npm run build` compiles frontend to `dist/`
- **Dependencies:** Requires LibSQL database for API testing

## Deployment

Pre-configured for **Vercel** deployment:

- `vercel.json` routes `/api/*` to serverless functions
- Environment variables required: `TURSO_DB_URL`, `TURSO_DB_AUTH_TOKEN`, `JWT_SECRET`

## API Documentation

See `README.md` for headless API examples including widget mounting, reply/like functions, and JSON export/import schemas.

> **Note for AI Agents:** When modifying files, always use absolute paths. Do not change the routing model without explicit instruction as it affects Vercel compatibility. The dashboard navigation uses URL search params (?tab=...) - maintain this pattern for any new items.
