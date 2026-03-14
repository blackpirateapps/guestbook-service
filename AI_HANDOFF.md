# Guestbook Service AI Handoff

Welcome, Agent. This document provides a high-level overview of the Guestbook Service web application to help you quickly understand the codebase, its architecture, and how to operate within it.

## Overview
The Guestbook Service is a lightweight, customizable web application that allows users to create their own digital guestbook. It supports private messages, moderation (approval flows), and custom appearance settings (CSS & HTML injection) per user.

## Technology Stack
- **Frontend Framework:** React 18, utilizing React Router DOM for routing.
- **Build Tool:** Vite, configured for fast, modern frontend development.
- **Styling:** Vanilla CSS (`src/index.css`) featuring a minimal, semantic HTML-driven design inspired by Bearblog or Pico.css. It uses system fonts and relies on standard HTML element styling for a clean, lean interface.
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
│   ├── App.jsx      # Main application router and shell
│   ├── index.css    # Global styling and design system
│   ├── main.jsx     # Vite React entry point
│   └── pages/       # Page-level components
│       ├── Auth.jsx           # Login and Signup views
│       ├── Dashboard.jsx      # Admin panel for settings and moderation 
│       └── PublicGuestbook.jsx# The public-facing guestbook for users
├── package.json     # Node dependencies and scripts
└── vercel.json      # Vercel deployment configuration
```

## Key Mechanisms & Workflows
1. **Client-Side Routing (`App.jsx`)**
   The application uses standard `react-router-dom` for internal navigation (`/`, `/dashboard`, `/u/:username`).
   *Embed Mode:* Public guestbooks can be embedded via an iframe using `?embed=1` on `/u/:username`. In embed mode, the app renders only the public guestbook route (no navbar/layout), posts height updates to the parent window, and respects light/dark mode using the same CSS variables. The dashboard provides a copy-paste embed snippet that includes a small visible credit line.

2. **Serverless API Layer (`/api`)**
   APIs extract the JWT from the `Authorization` header to authenticate admin actions (deleting messages, updating settings). Public actions (viewing the guestbook, adding an unapproved entry) are unauthenticated but require the `owner_username`.

3. **Styling and Theming**
   The application uses a minimalistic, semantic HTML theme styled in `src/index.css`. It prioritizes readability and fast loading by staying close to browser defaults while providing a cohesive layout through CSS variables. It includes a basic responsive grid system and dark mode support via `prefers-color-scheme`.

4. **Security & Moderation**
   - **XSS Prevention:** `DOMPurify` is strictly used in `PublicGuestbook.jsx` before rendering custom HTML fragments provided by the user.
   - **Honeypot:** There is a hidden bot field (`website_url_check`) on the public creation form to catch simple spam bots.
   - **Moderation:** Dashboard allows users to check "Require Approval". When active, new messages are held with a `status: 'pending'` and must be approved before becoming publicly visible.

## Development & Testing Workflow
- **Local Dev Server:** Run `npm run dev` in the terminal to launch the Vite dev server. The server runs on `localhost:5173` but requires the local setup of a LibSQL database to test the API correctly.
- **Building:** Run `npm run build` to verify frontend compilation.

## Deployment
This repository is pre-configured to be deployed natively on **Vercel**. 
- The `vercel.json` ensures that all requests to `/api/*` fall back to the Node functions, while all root `/` requests fall back to the Vite frontend's `index.html`. 
- Environment variables (e.g., `TURSO_DB_URL`, `TURSO_DB_AUTH_TOKEN`, `JWT_SECRET`) must be provided in the Vercel dashboard.

> **Note for AI Agents:** When modifying files, always ensure that absolute paths are specifically referenced. Do not change the overall routing model unless specifically instructed, as it dictates the Vercel edge compatibility.
