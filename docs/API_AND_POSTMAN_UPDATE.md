# API And Postman Update

Updated on 2026-05-24.

## Current API Surface

- Auth: register, login, logout, profile, change password, email verification code, forgot/reset password code.
- Notes: list, create, view, update, trash, restore, permanent delete, pin, share code, collaborators, shared-with-me, version history, AI summary, and AI query.
- Files: upload, list, preview, download, share with friends, list shares, unshare, delete, and shared-with-me.
- Friends: list, search, send request, accept/reject/cancel requests, and remove friend.
- Admin: dashboard, users, notes, settings, SMTP test, shared notes, friendships, and activity logs.

## Removed API Surface

- Subscription, premium, billing, and payment endpoints are not part of the app.
- Note archive endpoints are removed. Deleted notes use trash, restore, and permanent delete.
- Personal browser AI key endpoints/settings are removed. AI keys are configured in the Admin Panel and used by backend AI endpoints.

## Realtime Collaboration

The REST API manages note access and share permissions. The Next.js editor syncs active collaborators through Tiptap Collaboration and Yjs WebRTC rooms based on the shared note token. Backend autosave still persists note HTML and creates version snapshots when content changes.

## Postman

Use `postman/Notexa_API_Collection.json`.

Default variables:

- `base_url`: `http://127.0.0.1:8000/api`
- `token`: user Sanctum token
- `admin_token`: admin Sanctum token
- `note_id`, `file_id`, `user_id`, `friendship_id`: IDs from create/list requests

The collection has been refreshed to remove archive endpoints and stale archived fields.
