# Notexa Teacher Presentation And Code Docs

## Short Introduction

Notexa is a collaborative note-taking platform. Users can register, verify email when required, log in, create notes, edit notes, restore previous note versions, share notes and files with friends, redeem share codes, safely preview supported files, and use AI study tools. Admins can manage users, notes, settings, shared notes, friendships, and activity logs.

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
| `NoteController.php` | Notes, versions, share codes, AI tools |
| `NoteShareController.php` | Note sharing permissions |
| `FriendController.php` | Friend requests |
| `FileController.php` | Upload, preview, share, and download files |
| `AdminController.php` | Admin dashboard, users, notes, settings, logs |
| `MailSettingsService.php` | Applies SMTP settings from database |
| `AiService.php` | Calls backend-managed DeepSeek, OpenAI-compatible, or Gemini providers |
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
2. If email verification is enabled, backend sends a 6-digit SMTP code.
3. Frontend opens a verification popup.
4. User submits the code to `/api/email/verify-code`.
5. Backend sets `email_verified_at` and returns a Sanctum token.

### Create And Share A Note

1. User creates a note.
2. Backend stores note content and plain text.
3. User shares with a friend or copies a share code.
4. Backend stores permission in `note_shares`.

### Use AI Tools

1. User clicks AI summary, Ask AI, Flashcards, Quiz, or Clean Notes.
2. Client saves latest note content.
3. Backend checks access.
4. Backend uses the configured AI provider from Admin Settings.
5. Summary is saved to the note, while prompt responses return directly.

### Restore Version History

1. Note edits create server snapshots when content changes.
2. The Version History panel loads `/api/notes/{note}/versions`.
3. Users can preview recent edits and restore any older snapshot.
4. Restoring a snapshot saves it as the current note content.

### Realtime Collaboration

1. Authorized editors open the same shared note.
2. The editor joins a Yjs WebRTC room and sends backend presence heartbeats based on the note and share token.
3. Tiptap Collaboration syncs text changes between active collaborators.
4. The server still autosaves the current HTML content to the note record.

### Preview And Share Files

1. User uploads a file.
2. Backend stores the file locally or in R2-compatible storage.
3. The files dashboard can preview only PDF, text/code, and common image files using signed URLs.
4. File owners can share direct file access with accepted friends.

### Admin Settings

1. Admin opens settings.
2. Frontend loads `site_settings`.
3. Admin edits SMTP, email verification, legal, storage, or AI fields.
4. Backend saves typed setting values.
5. SMTP test uses the saved SMTP fields immediately.

## Demo Script

Good morning sir/ma'am. Our project is Notexa, a collaborative note-taking platform. It has a Laravel REST API backend, a Next.js web frontend, a Flutter app, and a relational database. Users can register, verify email, create notes, restore version history, collaborate in real time, share notes and files, safely preview supported files, and use AI study tools. Admins can manage users, notes, settings, sharing records, friendships, and activity logs.
