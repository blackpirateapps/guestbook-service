# Guestbook Service AI Handoff

Welcome, Agent. This document provides a high-level overview of the Guestbook Service web application to help you quickly understand the codebase, its architecture, and how to operate within it.

## Overview

The Guestbook Service is a lightweight, customizable web application that allows users to create their own digital guestbook. It supports private messages, moderation (approval flows), and custom appearance settings (CSS & HTML injection) per user.

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
├── api/             # Vercel Serverless Functions
│   ├── db.js        # LibSQL database connection utility
│   ├── login.js     # User authentication endpoint
│   ├── signup.js    # User registration endpoint
│   ├── profile.js   # Getting/updating user settings (design)
│   ├── entries.js   # CRUD operations for guestbook messages & replies
├── src/             # React Frontend Code
│   ├── App.jsx      # Main application router and shell with navbar
│   ├── index.css    # Global design system (colors, typography, components)
│   ├── main.jsx     # Vite React entry point
│   ├── components/  # Reusable UI components
│   │   ├── Icons.jsx    # SVG icon components
│   │   └── Tabs.jsx     # Reusable tabs component
│   └── pages/       # Page-level components
│       ├── Auth.jsx           # Login/Signup with tab-style toggle
│       ├── Dashboard.jsx      # Admin panel with tabbed navigation
│       └── PublicGuestbook.jsx# Public-facing guestbook page
├── package.json     # Node dependencies and scripts
└── vercel.json      # Vercel deployment configuration
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
- `.tabs`, `.tab-button` - Tab navigation
- `.entry-card`, `.reply-card` - Guestbook entry styling
- `.auth-card`, `.auth-tabs` - Authentication form styling
- `.stat-card` - Dashboard statistics cards

## Key Mechanisms & Workflows

### 1. Client-Side Routing (`App.jsx`)

The application uses `react-router-dom` for navigation (`/`, `/dashboard`, `/u/:username`).

**Embed Mode:** Public guestbooks can be embedded via iframe using `?embed=1` on `/u/:username`. In embed mode, the app renders only the guestbook (no navbar), posts height updates to the parent window, and supports custom embed CSS URLs.

### 2. Dashboard (`Dashboard.jsx`)

The dashboard uses **URL-based tabbed navigation** with 5 tabs:

| Tab        | URL             | Content                                                  |
| ---------- | --------------- | -------------------------------------------------------- |
| Overview   | `?tab=overview` | Stats cards, recent entries list with moderation actions |
| Embed      | `?tab=embed`    | Embed snippet, CSS URL config, Headless API docs         |
| Settings   | `?tab=settings` | Moderation toggle, Custom CSS/HTML appearance            |
| Data       | `?tab=data`     | Export/Import JSON backup, Add past entries              |
| API Tester | `?tab=tester`   | Live API testing for entries, replies, likes             |

Tab state is managed via `useSearchParams` from react-router-dom.

### 3. Authentication (`Auth.jsx`)

The homepage displays a centered single-column layout with:

- Hero section with product description
- Feature list card
- Login/Signup form with tab-style toggle between modes

### 4. Serverless API Layer (`/api`)

APIs extract JWT from `Authorization` header for authenticated actions. Public actions require `owner_username`.

**Key Endpoints:**

- `GET /api/entries?user=:username` - Public entries
- `POST /api/entries` - Create entry/reply
- `PUT /api/entries` - Like or approve entries
- `DELETE /api/entries` - Delete entry (auth required)
- `GET /api/entries?export=1` - Export all data (auth required)

### 5. Security & Moderation

- **XSS Prevention:** DOMPurify sanitizes custom HTML in `PublicGuestbook.jsx`
- **Honeypot:** Hidden `website_url_check` field catches spam bots
- **Moderation:** Optional approval flow holds entries with `status: 'pending'`

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

> **Note for AI Agents:** When modifying files, always use absolute paths. Do not change the routing model without explicit instruction as it affects Vercel compatibility. The dashboard tab structure uses URL search params - maintain this pattern for any new tabs.
