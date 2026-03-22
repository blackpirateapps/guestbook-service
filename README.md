# Guestbook Service

A lightweight guestbook you can host for yourself (no email required to sign up). Create a public guestbook at `/u/:username`, embed it in an iframe, or go “headless” and use the API + your own UI.

## API (Headless)

All endpoints below are served from your deployed base URL (e.g. `https://your-app.vercel.app`). `api/entries.js` is CORS-enabled (currently `Access-Control-Allow-Origin: *`) so you can call it from your own site.

### Fetch entries (public)

`GET /api/entries?user=:username`

- Returns approved, non-private entries for that user (including replies).
- Response: array of entry objects (at least: `id`, `sender_name`, `message`, `sender_website`, `parent_id`, `created_at`, `likes`, `is_owner`).

### Create entry / reply (public)

`POST /api/entries`

Body (JSON):

```json
{
  "owner_username": "OWNER",
  "sender_name": "Jane",
  "sender_website": "https://example.com",
  "message": "Hello!",
  "parent_id": null,
  "is_private": false,
  "bot_field": ""
}
```

Notes:
- If the owner has moderation enabled, the response includes `status: "pending"` and the entry won’t show publicly until approved.
- `is_private: true` creates a private message visible only in the dashboard.
- `bot_field` is a honeypot (if non-empty, the request is treated as spam and ignored).

Reply example:

```json
{
  "owner_username": "OWNER",
  "sender_name": "Jane",
  "message": "Thanks for sharing!",
  "parent_id": 123,
  "is_private": false,
  "bot_field": ""
}
```

### Like an entry (public)

`PUT /api/entries`

Body (JSON):

```json
{ "action": "like", "id": 123 }
```

Returns:

```json
{ "success": true }
```

### Approve an entry (owner only)

`PUT /api/entries` with `Authorization: Bearer <JWT>`

Body (JSON):

```json
{ "action": "approve", "id": 123 }
```

### Delete an entry (owner only)

`DELETE /api/entries` with `Authorization: Bearer <JWT>`

Body (JSON):

```json
{ "id": 123 }
```

### Export all data as JSON (owner only)

`GET /api/entries?export=1` with `Authorization: Bearer <JWT>`

- Returns profile settings and all entries (including private/pending/replies) for the authenticated owner.

Response shape:

```json
{
  "version": 1,
  "exported_at": "2026-03-22T12:34:56.000Z",
  "owner_username": "OWNER",
  "profile": {
    "custom_css": "",
    "custom_html": "",
    "require_approval": 0,
    "embed_css_url": ""
  },
  "entries": [
    {
      "id": 123,
      "owner_username": "OWNER",
      "sender_name": "Jane",
      "message": "Hello!",
      "sender_website": "https://example.com",
      "parent_id": null,
      "is_private": 0,
      "is_owner": 0,
      "status": "approved",
      "created_at": "2026-03-20T10:11:12.000Z",
      "likes": 2
    }
  ]
}
```

### Import all data from JSON (owner only)

`POST /api/entries` with `Authorization: Bearer <JWT>`

Body (JSON):

```json
{
  "action": "import_all",
  "owner_username": "OWNER",
  "data": {
    "version": 1,
    "owner_username": "OWNER",
    "profile": {
      "custom_css": "",
      "custom_html": "",
      "require_approval": 0,
      "embed_css_url": ""
    },
    "entries": [
      {
        "id": 123,
        "sender_name": "Jane",
        "message": "Hello!",
        "sender_website": "https://example.com",
        "parent_id": null,
        "is_private": 0,
        "is_owner": 0,
        "status": "approved",
        "created_at": "2026-03-20T10:11:12.000Z",
        "likes": 2
      }
    ]
  }
}
```

Notes:
- Import replaces existing entries for the owner.
- Import also updates profile fields: `custom_css`, `custom_html`, `require_approval`, `embed_css_url`.
- `owner_username` in the payload must match the authenticated user.

## Widget (optional)

There’s a tiny helper script at `/guestbook-widget.js` you can use to populate entries on your own page.

### Mount into a container

```html
<div id="guestbook-entries"></div>
<script src="https://YOUR-APP/guestbook-widget.js"></script>
<script>
  GuestbookWidget.mount({
    baseUrl: "https://YOUR-APP",
    username: "OWNER",
    container: "#guestbook-entries"
  });
</script>
```

### Submit from your own form

```html
<script src="https://YOUR-APP/guestbook-widget.js"></script>
<script>
  GuestbookWidget.submitEntry({
    baseUrl: "https://YOUR-APP",
    owner_username: "OWNER",
    sender_name: "Jane",
    sender_website: "https://example.com",
    message: "Hello!",
    is_private: false
  });
</script>
```

### Reply and like with widget helpers

```html
<script src="https://YOUR-APP/guestbook-widget.js"></script>
<script>
  await GuestbookWidget.submitReply({
    baseUrl: "https://YOUR-APP",
    owner_username: "OWNER",
    parent_id: 123,
    sender_name: "Jane",
    message: "Great post!"
  });

  await GuestbookWidget.likeEntry({
    baseUrl: "https://YOUR-APP",
    id: 123
  });
</script>
```

## Auth (no email)

- `POST /api/signup` with `{ "username": "...", "password": "..." }`
- `POST /api/login` with `{ "username": "...", "password": "..." }` → returns a JWT used by dashboard endpoints.
