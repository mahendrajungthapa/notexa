# Notexa Complete Study Guide

Notexa is a collaborative note-taking platform with a Laravel API backend, a Next.js web frontend, and a Flutter app. Users can create rich notes, share notes with friends, redeem share codes, attach files, safely preview supported files, and use backend AI tools. Admins can manage users, notes, settings, sharing records, friendships, and activity logs.

## System Overview

```text
Next.js frontend  -> Laravel API -> Database
Flutter app       -> Laravel API -> Database
Admin panel       -> Laravel API -> Site settings
```

## Main Modules

- Authentication and Sanctum token login.
- Optional SMTP email verification.
- Notes, trash, restore, pinning, version history restore, and AI summaries.
- Friends and friend requests.
- Note sharing with view/edit permissions.
- Share code redemption.
- File upload, signed download URLs, direct friend sharing, and safe previews for PDF, text/code, and common image files.
- Admin dashboard and settings.
- Cloud storage configuration through R2-compatible settings.

## Backend

Laravel handles validation, permissions, storage, and JSON API responses. Important backend files:

| File or folder | Purpose |
| --- | --- |
| `routes/api.php` | API route list |
| `AuthController.php` | Register, login, logout, profile, password, email verification |
| `NoteController.php` | Notes and AI summaries |
| `NoteShareController.php` | Friend-based note sharing |
| `FriendController.php` | Friend requests and friend list |
| `FileController.php` | Upload, preview, share, and download files |
| `AdminController.php` | Admin stats, users, notes, settings, and logs |
| `MailSettingsService.php` | Applies SMTP settings from the database |
| `AiService.php` | Backend-managed AI note tools |
| `R2StorageService.php` | File storage |

## Frontend

The web frontend uses Next.js, React, TypeScript, Tailwind CSS, TipTap, Zustand, and Axios.

Important screens:

- Home page
- Login and registration
- Notes dashboard
- Note editor
- Friends
- Files and safe previews
- Trash
- User settings
- Admin dashboard
- Admin users
- Admin notes
- Admin settings

## Flutter App

The Flutter app uses the same Laravel API. It supports local note drafts and cloud sync after login.

Important files:

| File or folder | Purpose |
| --- | --- |
| `lib/services/api_service.dart` | API calls |
| `lib/services/auth_service.dart` | Auth state |
| `lib/services/local_storage.dart` | Local notes and offline sync |
| `lib/screens/notes` | Note list and editor |
| `lib/screens/friends` | Friends |
| `lib/screens/files` | Files |
| `lib/screens/settings` | Profile and account settings |

## Email Verification Flow

1. Admin saves SMTP settings.
2. Admin tests SMTP from the admin settings panel.
3. Admin enables email verification.
4. New users receive a 6-digit verification code by SMTP.
5. The registration page opens a verification popup.
6. Users verify with `/api/email/verify-code`, then receive a Sanctum token.

## AI Flow

1. User opens a note.
2. User clicks Summary, Ask AI, Flashcards, Quiz, or Clean Notes.
3. Frontend saves dirty content first.
4. Backend checks permission and `ai_enabled`.
5. Backend calls the configured OpenAI-compatible or Gemini provider.
6. Summary responses are saved on the note and returned to the client; prompt responses are returned without exposing provider API keys.

## File Preview and Sharing Flow

1. User uploads a file.
2. The files dashboard can preview only PDF, text/code, and safe image formats.
3. The backend returns a short-lived signed preview URL and forces `X-Content-Type-Options: nosniff`.
4. PDF previews render in a sandboxed frame, images render as images, and text/code renders as escaped text.
5. File owners can share files directly with accepted friends and remove access later.

## Admin Settings

Admin settings are stored in `site_settings` and grouped by:

- `general`
- `smtp`
- `email`
- `legal`
- `storage`
- `ai`

The admin settings UI saves typed values so booleans, integers, and text are handled consistently.

## Demonstration Checklist

1. Register a user.
2. Enable email verification and test resend.
3. Log in.
4. Create a note.
5. Generate an AI summary.
6. Add a friend.
7. Share a note with view/edit permission.
8. Redeem a share code.
9. Upload a file.
10. Share a file with a friend.
11. Move a note to trash, restore it, then permanently delete a test note.
12. Open the admin dashboard and update settings.
