# Notexa Next.js Beginner Guide

The Next.js frontend is the browser interface for Notexa. It calls the Laravel API through Axios and stores login state with Zustand.

## Main Frontend Areas

| Area | Purpose |
| --- | --- |
| Public pages | Home, about, privacy, terms |
| Auth pages | Login and registration |
| Dashboard | Notes, shared notes, friends, files, and settings |
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

## Environment

Local frontend environment:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Restart the dev server after changing `.env.local`.

## Email Verification UI

If the backend says an account needs verification, the login page shows a resend verification action. When a user clicks the email link, Laravel redirects back to:

```text
/auth/login?verified=1
```

The frontend then shows a success message.

## Admin Settings UI

The settings page uses typed setting definitions. Each field knows its key, group, type, and default value. This keeps saved data consistent for SMTP, email verification, legal pages, R2 storage, and AI summaries.
