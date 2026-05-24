# Flutter Beginner Guide for Notexa

## What Flutter Does

Flutter is the mobile app frontend of Notexa. It uses the same Laravel API as the Next.js website, so users can access the same notes from mobile and web.

## Current Flutter Stack

From `notexa_app/pubspec.yaml`:

- Dart SDK: `>=3.2.0 <4.0.0`
- State management: `provider`
- HTTP requests: `http`
- Local storage: `shared_preferences`
- File picker: `file_picker`
- PDF viewer: `syncfusion_flutter_pdfviewer`
- URL opening: `url_launcher`
- Connectivity helper: `connectivity_plus`

## Important Folders

```text
notexa_app/lib
  main.dart
  services/
    api_service.dart
    auth_service.dart
    error_handler.dart
    local_storage.dart
  screens/
    auth/
    dashboard/
    notes/
    shared/
    friends/
    files/
    settings/
```

## App Entry Point

File:

```text
lib/main.dart
```

It:

- starts Flutter
- installs global error handling
- creates `AuthService` with Provider
- sets Material 3 theme
- opens `DashboardScreen`

## API Service

File:

```text
lib/services/api_service.dart
```

Base URL:

```text
http://127.0.0.1:8000/api
```

It supports:

- GET
- POST
- PUT
- PATCH
- DELETE
- multipart file upload

It stores token in SharedPreferences and sends:

```text
Authorization: Bearer <token>
```

## Auth Service

File:

```text
lib/services/auth_service.dart
```

It manages:

- current user
- login status
- loading status
- user stats

Important methods:

| Method | Purpose |
| --- | --- |
| `login` | Calls Laravel `/login` |
| `register` | Calls Laravel `/register` |
| `forgotPassword` | Sends a 6-digit SMTP password reset code |
| `resetPassword` | Applies the reset code and new password |
| `verifyEmailCode` | Verifies the 6-digit SMTP registration code |
| `resendVerification` | Requests a new registration code |
| `logout` | Calls Laravel `/logout` and clears token |
| `fetchMe` | Calls Laravel `/me` |
| `updateProfile` | Updates name, username, and institution |

## Offline Sync

Notes are cached in `LocalNoteStorage`. Dirty local notes sync before cloud notes are loaded. If a local note points to a cloud note that no longer exists, the app recreates it through `/notes` instead of leaving a permanent "could not be synced" warning. Local attachment upload failures are reported separately so note text can still sync.

## Local Storage

File:

```text
lib/services/local_storage.dart
```

This is a special Flutter feature in Notexa.

It stores local notes in SharedPreferences using:

```text
notexa_local_notes
```

Offline note behavior:

```text
1. User creates a draft.
2. Flutter gives it a negative local ID.
3. Draft is marked _dirty = true.
4. When server is available, Flutter syncs it to Laravel.
5. Server returns real note ID.
6. Flutter replaces local ID with server ID.
```

## Screens

| Screen | Purpose |
| --- | --- |
| `LoginScreen` | Login form |
| `RegisterScreen` | Registration form |
| `DashboardScreen` | Bottom navigation |
| `NotesListScreen` | Show/search/create notes |
| `NoteEditorScreen` | Edit notes, share, AI, attach files |
| `SharedScreen` | Notes shared with user |
| `FriendsScreen` | Friend requests, search, friends, and note/file sharing |
| `FilesScreen` | Upload/download/delete files and inline PDF viewing |
| `PdfViewerScreen` | Preview PDFs |
| `SettingsScreen` | Profile/password/login/logout area |

## AI and Email Verification

The note editor can call backend AI endpoints for summaries, questions, flashcards, quizzes, and cleaned study notes. Registration shows a popup for the 6-digit verification code when backend email verification is enabled.

## How To Run

```bash
cd notexa_app
flutter pub get
flutter run
```

If Android emulator cannot reach backend at `127.0.0.1`, change API URL to:

```text
http://10.0.2.2:8000/api
```

If using a real phone, use your computer IP:

```text
http://YOUR_COMPUTER_IP:8000/api
```

## Teacher Explanation

Flutter is the mobile client. It displays screens using widgets, calls Laravel API using the `http` package, stores login tokens with SharedPreferences, and supports offline drafts through local storage.
