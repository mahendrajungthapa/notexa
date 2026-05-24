# Notexa Next.js Beginner Guide

The Next.js frontend is the browser interface for Notexa. It calls the Laravel API through Axios and stores login state with Zustand.

## Main Frontend Areas

| Area | Purpose |
| --- | --- |
| Public pages | Home, about, privacy, terms |
| Auth pages | Login, registration, email verification, and forgot password |
| Dashboard | Notes, shared notes, friends, files, trash, redeem codes, and settings |
| Admin | Dashboard, users, notes, settings, sharing, friendships, and activity logs |

## API Client

The API helper lives at:

```text
frontend/src/services/api.ts
```

It attaches the stored token to requests:

```text
Authorization: Bearer TOKEN
```

The browser calls `NEXT_PUBLIC_API_URL` directly. Production should point this value at the Laravel API origin, for example `https://app.notexa.cloud/api`; it should not point at the frontend domain's `/api/backend` path.

## Environment

Local frontend environment:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Restart the dev server after changing `.env.local`.

## Email Verification UI

If email verification is enabled in the admin settings, registration opens a verification popup. The user enters the 6-digit SMTP code sent by the backend through:

```text
POST /api/email/verify-code
```

The resend action calls:

```text
POST /api/email/verification-notification
```

## Forgot Password UI

The forgot password screen is available at:

```text
/auth/forgot-password
```

It first calls `POST /api/forgot-password` to send a 6-digit SMTP code, then calls `POST /api/reset-password` with the code and new password.

## Notes, Trash, and Files

Deleted notes move to `/dashboard/trash`, where users can restore them or permanently delete them. The files page supports owned files, files shared by friends, direct file sharing with accepted friends, and safe previews. Preview is intentionally limited to PDF, text/code, and common image formats; unsupported files remain download-only.

## Admin Settings UI

The settings page uses typed setting definitions. Each field knows its key, group, type, and default value. This keeps saved data consistent for SMTP, email verification, legal pages, R2 storage, and AI summaries.
