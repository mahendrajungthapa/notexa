# Notexa Teacher Presentation And Code Docs

## Short Introduction

Notexa is a collaborative note-taking platform. Users can register, verify email when required, log in, create notes, edit notes, share notes with friends, redeem share codes, upload files, and request AI summaries. Admins can manage users, notes, settings, shared notes, friendships, and activity logs.

## Architecture

```text
Next.js Web App
        |
        v
Laravel REST API ---> Database
        ^
        |
Flutter App
```

## Backend Code Map

| File | Purpose |
| --- | --- |
| `routes/api.php` | API routes |
| `AuthController.php` | Register, login, profile, password, email verification |
| `NoteController.php` | Notes, versions, share codes, AI summary |
| `NoteShareController.php` | Note sharing permissions |
| `FriendController.php` | Friend requests |
| `FileController.php` | Upload and download files |
| `AdminController.php` | Admin dashboard, users, notes, settings, logs |
| `MailSettingsService.php` | Applies SMTP settings from database |
| `DeepSeekService.php` | Generates note summaries |
| `R2StorageService.php` | Stores and serves files |

## Frontend Code Map

| File or folder | Purpose |
| --- | --- |
| `frontend/src/services/api.ts` | Axios API client |
| `frontend/src/contexts/authStore.ts` | Auth state |
| `frontend/src/app/auth` | Login and register pages |
| `frontend/src/app/dashboard` | User dashboard |
| `frontend/src/app/admin` | Admin panel |
| `frontend/src/components/editor/NoteEditor.tsx` | Rich note editor |

## Flutter Code Map

| File or folder | Purpose |
| --- | --- |
| `notexa_app/lib/services/api_service.dart` | API requests |
| `notexa_app/lib/services/auth_service.dart` | Auth state |
| `notexa_app/lib/services/local_storage.dart` | Offline/local note drafts |
| `notexa_app/lib/screens/notes` | Notes UI |
| `notexa_app/lib/screens/friends` | Friends UI |
| `notexa_app/lib/screens/files` | Files UI |
| `notexa_app/lib/screens/settings` | Profile/settings UI |

## Important Flows

### Register And Verify Email

1. User registers.
2. If email verification is enabled, backend sends a signed email link.
3. User clicks the link.
4. Backend sets `email_verified_at`.
5. User signs in.

### Create And Share A Note

1. User creates a note.
2. Backend stores note content and plain text.
3. User shares with a friend or copies a share code.
4. Backend stores permission in `note_shares`.

### Generate Summary

1. User clicks AI summary.
2. Client saves latest note content.
3. Backend checks access.
4. Backend uses DeepSeek or local fallback.
5. Summary is saved to the note.

### Admin Settings

1. Admin opens settings.
2. Frontend loads `site_settings`.
3. Admin edits SMTP, email verification, legal, storage, or AI fields.
4. Backend saves typed setting values.
5. SMTP test uses the saved SMTP fields immediately.

## Demo Script

Good morning sir/ma'am. Our project is Notexa, a collaborative note-taking platform. It has a Laravel REST API backend, a Next.js web frontend, a Flutter app, and a relational database. Users can register, verify email, create notes, share notes, upload files, and generate summaries. Admins can manage users, notes, settings, sharing records, friendships, and activity logs.
