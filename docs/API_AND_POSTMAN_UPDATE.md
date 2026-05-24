# API And Postman Update

Updated on 2026-05-24.

## Current API Surface

- Auth: register, login, logout, profile, change password, email verification code, forgot/reset password code.
- Notes: list, create, view, update, trash, restore, permanent delete, pin, share code, collaborators, shared-with-me, version history, AI summary, AI query, and collaboration presence heartbeat.
- Files: upload, list, preview, download, share with friends, list shares, unshare, delete, and shared-with-me.
- Friends: list, search, send request, accept/reject/cancel requests, and remove friend.
- Admin: dashboard, users, notes, settings, site logo upload, SMTP test, shared notes, friendships, and activity logs.

## Removed API Surface

- Subscription, premium, billing, and payment endpoints are not part of the app.
- Note archive endpoints are removed. Deleted notes use trash, restore, and permanent delete.
- Personal browser AI key endpoints/settings are removed. AI keys are configured in the Admin Panel and used by backend AI endpoints.

## Realtime Collaboration

The REST API manages note access and share permissions. Friend sharing can grant view or edit permission from the Manage Sharing dialog.

Realtime collaboration links include a `collab_token`. When a logged-in user opens a valid collaboration link, the backend grants that user edit access to the note even if they are not already friends with the owner. The Next.js editor syncs content through Yjs WebRTC and also sends backend presence heartbeats to `/notes/{note}/presence`, so joined/writing status keeps working even when peer discovery is blocked. Backend autosave still persists note HTML and creates version snapshots when content changes.

## AI Providers

Admin settings support OpenAI-compatible providers, Gemini, and DeepSeek. DeepSeek defaults to `https://api.deepseek.com` with `deepseek-v4-flash`; `deepseek-v4-pro` can be selected in the admin AI settings.

## Postman

Use `postman/Notexa_API_Collection.json`.

Default variables:

- `base_url`: `http://127.0.0.1:8000/api`
- `token`: user Sanctum token
- `admin_token`: admin Sanctum token
- `note_id`, `file_id`, `user_id`, `friendship_id`: IDs from create/list requests

The collection has been refreshed to include collaboration presence, site logo upload, and DeepSeek V4 settings while keeping archive, billing, subscription, and premium endpoints removed.
