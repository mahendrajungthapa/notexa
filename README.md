# Notexa

Notexa is a full-stack collaborative note-taking platform with a Laravel API backend, a Next.js web application, and a Flutter client. It is built for rich academic notes, realtime collaboration, file sharing, AI-assisted writing, OCR, admin-controlled settings, SMTP email workflows, and cross-device access.

The project is organized as a monorepo so the API, web frontend, mobile/desktop app, Postman collection, and documentation can evolve together.

## Table of Contents

- [Project Summary](#project-summary)
- [Major Features](#major-features)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Technology Stack](#technology-stack)
- [Components and Frameworks Used](#components-and-frameworks-used)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Environment Files](#environment-files)
- [Default Admin](#default-admin)
- [How API Routes Work](#how-api-routes-work)
- [Authentication](#authentication)
- [Core API Areas](#core-api-areas)
- [Realtime Collaboration](#realtime-collaboration)
- [AI and OCR](#ai-and-ocr)
- [Files and Storage](#files-and-storage)
- [Email and SMTP](#email-and-smtp)
- [Frontend Notes](#frontend-notes)
- [Flutter App Notes](#flutter-app-notes)
- [Testing](#testing)
- [Postman](#postman)
- [Deployment Checklist](#deployment-checklist)
- [Troubleshooting](#troubleshooting)
- [Documentation Map](#documentation-map)

## Project Summary

Notexa provides:

- a Laravel Sanctum API at `/api`
- generated backend API documentation at `/docs`
- a Next.js dashboard and admin panel
- a Flutter app that talks to the same backend
- local file storage by default, with optional Cloudflare R2-compatible storage
- SMTP-based email verification and password reset
- server-side AI endpoints configured from the admin panel
- OCR through backend Tesseract or browser-side fallback in the web frontend

## Major Features

### Users and Authentication

- Register and login with username or email.
- Laravel Sanctum token authentication.
- Optional 6-digit email verification through SMTP.
- Forgot password and reset password through 6-digit SMTP codes.
- User profile editing, public profile pages, and shareable profile links.
- Admin-safe user management with active/inactive user support.

### Notes

- Rich Tiptap note editor.
- Create note flow opens the new note editor immediately.
- Formatting, headings, lists, task lists, links, highlights, alignment, images, code blocks, and blockquotes.
- Image upload inside editor.
- Resizable uploaded images.
- Code blocks styled for readability.
- Pin, trash, restore, and permanent delete.
- Trash page.
- Version history with editor/user metadata and restore support.
- Study PDF side-by-side panel.
- Daily study streak tracking.

### Collaboration and Sharing

- Friend system with requests, accept/reject/cancel, and friend removal.
- Shared with me page.
- Note sharing with view/edit permissions.
- Direct share codes and collaboration links.
- Realtime collaboration presence and typing status.
- Collaborator list deduplicated by username/user identity.
- Online status indicators for friends.

### Files

- Upload files to local storage by default.
- Optional Cloudflare R2 configuration.
- File listing and sharing.
- Shared files badges.
- Signed download and preview URLs.
- Safe previews for PDF, images, and text/code-like files.
- Preview content is served through controlled backend routes.

### Admin Panel

- Dashboard statistics.
- User management.
- Email verified status visibility.
- Admin accounts cannot be deactivated from the inactive toggle.
- Notes moderation.
- Settings management.
- Site logo upload.
- Public content settings for privacy policy and terms.
- SMTP settings and SMTP test email.
- AI provider settings for DeepSeek, OpenAI-compatible APIs, and Gemini.
- Storage settings for local/R2 usage.
- Activity logs, shared notes, and friendships.

### AI and OCR

- Frontend AI tools are controlled by backend/admin settings.
- No personal AI workspace/API key requirement in the frontend.
- AI endpoints call backend services using admin-configured keys.
- Supported providers: DeepSeek, OpenAI-compatible APIs, Gemini.
- OCR image upload in the editor.
- Backend OCR through Tesseract when installed.
- Browser OCR fallback through `tesseract.js` when backend Tesseract is unavailable.

## Architecture

```text
Next.js Web App  ─┐
                  ├── Laravel API /api ─── Database
Flutter App     ──┘          │
                             ├── Local Storage or Cloudflare R2
                             ├── SMTP Provider
                             ├── AI Provider
                             └── Tesseract OCR / Browser OCR fallback
```

The backend is the source of truth for users, notes, sharing, files, settings, and AI configuration. The frontend and Flutter app consume the same API.

## Repository Structure

| Path | Purpose |
| --- | --- |
| `backend/notexa` | Laravel API, routes, controllers, migrations, seeders, services, tests, backend README |
| `frontend` | Next.js web app, landing page, auth pages, dashboard, editor, admin panel |
| `notexa_app` | Flutter client for Android, iOS, web, Windows, macOS, and Linux targets |
| `postman` | Complete Postman API collection |
| `docs` | Study guides, project docs, update notes, beginner guides |
| `guides` | Practical setup guides for backend, frontend, and app development |
| `outputs` | Generated local artifacts, excluded from normal app runtime |

## Technology Stack

### Backend

- PHP 8.3+
- Laravel 13
- Laravel Sanctum
- PHPUnit 12
- SQLite locally, MySQL/PostgreSQL-ready by configuration
- Flysystem S3 adapter for Cloudflare R2-compatible storage
- Tesseract OCR package

### Frontend

- Next.js 16
- React 19
- TypeScript 6
- Tailwind CSS
- Tiptap editor
- Yjs and y-webrtc
- Axios
- Zustand
- Lucide icons
- Tesseract.js browser OCR fallback

### Flutter

- Flutter 3+
- Dart 3.2+
- Provider
- HTTP client
- Shared Preferences
- File Picker
- Syncfusion PDF viewer

## Components and Frameworks Used

This section lists the main frameworks, libraries, and project components used across Notexa.

### Backend Components

| Component | Path | Framework or Package | Purpose |
| --- | --- | --- | --- |
| API routing | `backend/notexa/routes/api.php` | Laravel Router | Registers all `/api/...` routes for auth, notes, friends, files, admin, AI, OCR, and collaboration. |
| Web routing | `backend/notexa/routes/web.php` | Laravel Router + Blade | Registers `/`, generated `/docs`, and public backend web pages. |
| Auth controller | `backend/notexa/app/Http/Controllers/Api/AuthController.php` | Laravel, Sanctum, Mail, Hash | Registration, login, logout, profile, password change, email verification, forgot password, reset password, and streak completion. |
| Note controller | `backend/notexa/app/Http/Controllers/Api/NoteController.php` | Laravel Eloquent, Cache | Notes CRUD, trash/restore, share codes, versions, AI calls, OCR, and collaboration presence. |
| Note sharing controller | `backend/notexa/app/Http/Controllers/Api/NoteShareController.php` | Laravel Eloquent | Friend/direct note sharing, collaborators, and permissions. |
| File controller | `backend/notexa/app/Http/Controllers/Api/FileController.php` | Laravel Storage, signed URLs | File upload, list, download, preview, delete, and sharing. |
| Friend controller | `backend/notexa/app/Http/Controllers/Api/FriendController.php` | Laravel Eloquent | Friend search, requests, accept/reject/cancel, and remove friend. |
| Profile controller | `backend/notexa/app/Http/Controllers/Api/ProfileController.php` | Laravel Eloquent | Public user profile lookup by username. |
| Admin controller | `backend/notexa/app/Http/Controllers/Admin/AdminController.php` | Laravel Eloquent, Mail, Storage | Admin dashboard, users, notes, settings, logo upload, SMTP test, shared notes, friendships, and activity logs. |
| Admin middleware | `backend/notexa/app/Http/Middleware/IsAdmin.php` | Laravel Middleware | Protects `/api/admin/...` routes. |
| User model | `backend/notexa/app/Models/User.php` | Eloquent, Sanctum, MustVerifyEmail | Auth identity, storage limit, friends, shared notes/files, and admin checks. |
| Note model | `backend/notexa/app/Models/Note.php` | Eloquent | Notes, shares, versions, files, permission helpers, trash behavior. |
| File model | `backend/notexa/app/Models/File.php` | Eloquent | Uploaded file metadata and ownership. |
| Site settings model | `backend/notexa/app/Models/SiteSetting.php` | Eloquent | Stores admin-managed settings for AI, SMTP, site content, storage, and verification. |
| AI service | `backend/notexa/app/Services/AiService.php` | HTTP client logic | Calls DeepSeek, OpenAI-compatible, or Gemini providers using admin/env keys. |
| OCR service | `backend/notexa/app/Services/OcrService.php` | `thiagoalessio/tesseract_ocr` | Backend-side OCR diagnostics and text extraction. |
| R2 storage service | `backend/notexa/app/Services/R2StorageService.php` | Flysystem AWS S3 adapter | Local/R2 file storage abstraction. |
| Mail settings service | `backend/notexa/app/Services/MailSettingsService.php` | Laravel Mail Config | Applies admin SMTP settings for verification/reset/test emails. |
| Database migrations | `backend/notexa/database/migrations` | Laravel Migrations | Defines users, notes, files, shares, settings, activity logs, versions, and collaboration metadata. |
| Seeders | `backend/notexa/database/seeders` | Laravel Seeders | Creates default admin and initial local data. |
| Console commands | `backend/notexa/routes/console.php` | Laravel Artisan | Admin creation, temp directory repair, and OCR diagnostics. |
| Backend tests | `backend/notexa/tests` | PHPUnit | Feature and unit tests for auth, settings, files, OCR, docs, and streaks. |

### Backend Frameworks and Packages

| Framework or Package | Used For |
| --- | --- |
| Laravel 13 | Main API framework, routing, controllers, middleware, validation, config, cache, mail, storage, and testing integration. |
| Laravel Sanctum | Token authentication for frontend, Flutter, and Postman. |
| Eloquent ORM | Database models, relationships, queries, pagination, and model factories. |
| PHPUnit 12 | Automated backend tests. |
| Flysystem AWS S3 v3 | Cloudflare R2-compatible object storage. |
| Tesseract OCR wrapper | Server-side OCR image text extraction. |
| Laravel Mail | SMTP verification codes, password reset codes, and admin SMTP test emails. |
| Laravel signed URLs | Safe file preview/download URLs. |

### Frontend Components

| Component or Area | Path | Framework or Package | Purpose |
| --- | --- | --- | --- |
| App router pages | `frontend/src/app` | Next.js App Router | Public pages, auth pages, dashboard pages, admin pages, profile pages, and API proxy route. |
| Landing page | `frontend/src/app/page.tsx` | Next.js, React, Tailwind | Public home/marketing page. |
| Auth pages | `frontend/src/app/auth` | Next.js, React Hook-style state | Login, register, forgot password, and reset flows. |
| Dashboard layout | `frontend/src/app/dashboard/layout.tsx` | Next.js, Zustand, Axios | Auth guard, sidebar, badges, email verification gate, and streak timer. |
| Notes dashboard | `frontend/src/app/dashboard/notes/page.tsx` | React, dnd-kit, Tailwind | Notes list, grid/list view, create note, pin, trash, tags, sorting, and drag ordering. |
| Note detail page | `frontend/src/app/dashboard/notes/[id]/page.tsx` | React, Axios, browser OCR | Note editor shell, files, AI/OCR actions, sharing, versions, and collaboration controls. |
| Note editor | `frontend/src/components/editor/NoteEditor.tsx` | Tiptap, Yjs, y-webrtc | Rich editor, realtime collaboration, image upload, OCR popup, AI tools, PDF study panel, and formatting toolbar. |
| Files page | `frontend/src/app/dashboard/files/page.tsx` | React, Axios, Tailwind | File upload, listing, preview, download, delete, and share UI. |
| Friends page | `frontend/src/app/dashboard/friends/page.tsx` | React, Axios | Friend search, requests, online indicators, and friend actions. |
| Shared page | `frontend/src/app/dashboard/shared/page.tsx` | React, Axios | Notes shared with the user and seen/unseen badge behavior. |
| Trash page | `frontend/src/app/dashboard/trash/page.tsx` | React, Axios | Restore or permanently delete trashed notes. |
| Settings page | `frontend/src/app/dashboard/settings/page.tsx` | React, Zustand | Profile editing, share profile, password change, stats, activity, and streak display. |
| Admin layout | `frontend/src/app/admin/layout.tsx` | Next.js, React | Admin shell and navigation. |
| Admin settings page | `frontend/src/app/admin/settings/page.tsx` | React, Axios | Site settings, SMTP, logo upload, AI keys, DeepSeek config, storage settings, and policy content. |
| Admin users page | `frontend/src/app/admin/users/page.tsx` | React, Axios | User list, verified status, activation, and admin/user management. |
| API service layer | `frontend/src/services/api.ts` | Axios | Central typed-ish HTTP client for all backend endpoints. |
| API URL helper | `frontend/src/lib/api-url.ts` | TypeScript | Resolves backend URL from `NEXT_PUBLIC_API_URL`. |
| Auth store | `frontend/src/contexts/authStore.ts` | Zustand | Stores user/token auth state. |
| Browser OCR helper | `frontend/src/lib/browser-ocr.ts` | `tesseract.js` | Runs OCR in the browser when backend OCR is unavailable. |
| Nav badge state | `frontend/src/lib/nav-badge-state.ts` | Local storage | Tracks unseen shared files, shared notes, and friend requests. |

### Frontend Frameworks and Packages

| Framework or Package | Used For |
| --- | --- |
| Next.js 16 | Web framework, app routing, production build, server/client page boundaries. |
| React 19 | UI component model and client interactivity. |
| TypeScript 6 | Type safety for frontend code. |
| Tailwind CSS | Utility-first styling and responsive UI. |
| Tiptap | Rich note editor and editor extensions. |
| Yjs | Shared document model for realtime collaboration. |
| y-webrtc | WebRTC provider/signaling for collaboration sessions. |
| Axios | API requests to Laravel. |
| Zustand | Client auth/session state. |
| dnd-kit | Drag-and-drop note ordering. |
| Lucide React | Icons throughout the UI. |
| React Hot Toast | Toast notifications. |
| Recharts | Admin/dashboard charts and metrics. |
| Tesseract.js | Browser OCR fallback. |

### Flutter App Components

| Component or Area | Path | Framework or Package | Purpose |
| --- | --- | --- | --- |
| Flutter app root | `notexa_app/lib` | Flutter, Dart | Mobile/desktop client source. |
| API service | `notexa_app/lib/services` | `http` | Calls the Laravel API. |
| Local state/storage | `notexa_app/lib` | Provider, Shared Preferences | Auth/session and local app state. |
| File support | `notexa_app/lib` | File Picker, Path Provider | Select and manage local files. |
| PDF viewing | `notexa_app/lib` | Syncfusion PDF Viewer | Preview PDFs inside the app. |
| Connectivity/offline handling | `notexa_app/lib` | connectivity_plus | Detect connectivity and manage offline sync behavior. |

### Flutter Frameworks and Packages

| Framework or Package | Used For |
| --- | --- |
| Flutter | Cross-platform UI framework. |
| Dart | Flutter app language. |
| Provider | App state management. |
| http | API calls. |
| shared_preferences | Local persisted key/value storage. |
| file_picker | File selection. |
| path_provider | Platform-safe local paths. |
| connectivity_plus | Network status detection. |
| syncfusion_flutter_pdfviewer | PDF preview. |
| url_launcher | Open external links. |
| google_fonts | App typography. |

### Database and Data Components

| Component | Used For |
| --- | --- |
| users | Auth identities, roles, storage limits, status, verification, streaks. |
| notes | User notes, trash state, pin state, content, and plain text. |
| note_versions | Version history and restore metadata. |
| note_shares | Shared note permissions. |
| files | Uploaded file metadata. |
| file_shares | Shared file access. |
| friendships | Friend request and accepted friend relationships. |
| site_settings | Admin-controlled runtime settings. |
| activity_logs | Admin-visible operational activity. |
| cache/session tables | Laravel cache, sessions, queues, and runtime state where configured. |

### External Services

| Service | Used For |
| --- | --- |
| SMTP provider | Email verification, forgot password, reset password, SMTP test. |
| DeepSeek API | Default backend AI provider option. |
| OpenAI-compatible API | Optional backend AI provider option. |
| Gemini API | Optional backend AI provider option. |
| Cloudflare R2 | Optional cloud storage for uploaded files. |
| Yjs signaling server | WebRTC collaboration discovery/signaling. |
| Tesseract OCR binary | Optional backend OCR engine. |

### Documentation and API Tooling

| Component | Path | Purpose |
| --- | --- | --- |
| Root README | `README.md` | Complete project overview and setup guide. |
| Backend README | `backend/notexa/README.md` | Backend-specific setup, API routes, env, deploy, and troubleshooting. |
| Generated API docs | `/docs` on backend server | Dynamic route documentation generated from Laravel routes. |
| Postman collection | `postman/Notexa_API_Collection.json` | API testing and endpoint examples. |
| Guides | `guides` | Backend, frontend, and app setup guides. |
| Project docs | `docs` | Beginner guides, study guides, project documentation, and update notes. |

## Requirements

- Git
- PHP 8.3 or newer
- Composer
- Node.js compatible with the frontend lockfile
- npm
- Flutter SDK 3.2 or newer
- SQLite for the default local backend setup
- Optional: Tesseract OCR binary
- Optional: SMTP mailbox/provider
- Optional: Cloudflare R2 account

## Quick Start

Start the backend first because both clients depend on it.

### 1. Backend

```powershell
cd backend/notexa
composer install
Copy-Item .env.example .env
New-Item -ItemType File database/database.sqlite -Force
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan notexa:fix-temp
php artisan serve --host=127.0.0.1 --port=8000
```

Backend URLs:

```text
API:  http://127.0.0.1:8000/api
Docs: http://127.0.0.1:8000/docs
```

### 2. Frontend

Open a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

For local API connection, set `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
NEXT_PUBLIC_YJS_SIGNALING_URLS=wss://signaling.yjs.dev
```

### 3. Flutter App

Open a third terminal:

```powershell
cd notexa_app
flutter pub get
flutter run
```

For Android emulator, use:

```text
http://10.0.2.2:8000/api
```

For Windows/macOS/Linux/web local testing, use:

```text
http://127.0.0.1:8000/api
```

## Environment Files

Local env files are intentionally not committed.

| Project | Template | Local file |
| --- | --- | --- |
| Backend | `backend/notexa/.env.example` | `backend/notexa/.env` |
| Frontend | `frontend/.env.example` | `frontend/.env.local` |

### Backend Essentials

```env
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://notexa.cloud,https://www.notexa.cloud,https://app.notexa.cloud

DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

FILESYSTEM_DISK=local

MAIL_MAILER=log
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS=hello@example.com

AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash

TESSERACT_BINARY=
TESSERACT_LANG=eng
TESSERACT_PSM=6
```

### Frontend Essentials

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
NEXT_PUBLIC_YJS_SIGNALING_URLS=wss://signaling.yjs.dev
```

The frontend should use only `NEXT_PUBLIC_API_URL` for backend API calls. Do not hardcode live or local backend URLs in components.

## Default Admin

Running backend seeders creates:

```text
Email: admin@notexa.com
Username: admin
Password: NotexaAdmin@2026
```

Change this account before using any shared, staging, or production environment.

Create or reset an admin:

```powershell
cd backend/notexa
php artisan notexa:create-admin admin@example.com StrongPassword123 --name="Site Admin" --username=admin
```

If the password argument is omitted, the command prompts securely.

## How API Routes Work

Laravel routes are split into:

- `backend/notexa/routes/web.php`
- `backend/notexa/routes/api.php`

`web.php` contains small browser-facing routes:

```text
GET /
GET /docs
```

`api.php` contains application endpoints. Laravel automatically prefixes them with `/api`.

For example:

```php
Route::post('/login', [AuthController::class, 'login']);
```

is available as:

```text
POST /api/login
```

The backend `/docs` page is generated from the registered Laravel routes and shows:

- route group
- HTTP methods
- full route path
- access level
- request body hints
- controller action
- route middleware
- copyable route URL

Open it locally:

```text
http://127.0.0.1:8000/docs
```

## Authentication

Login accepts username or email:

```json
{
  "login": "admin@example.com",
  "password": "NotexaAdmin@2026"
}
```

Protected endpoints require:

```http
Authorization: Bearer <token>
Accept: application/json
```

Admin endpoints require a token for a user with `role=admin`.

## Core API Areas

Use `/docs` and `postman/Notexa_API_Collection.json` for the full, current endpoint list.

### Public

- `POST /api/register`
- `POST /api/login`
- `POST /api/forgot-password`
- `POST /api/reset-password`
- `POST /api/email/verification-notification`
- `POST /api/email/verify-code`
- `GET /api/settings/public`
- `GET /api/profiles/{username}`

### Authenticated User

- `POST /api/logout`
- `GET /api/me`
- `PUT /api/profile`
- `PUT /api/change-password`
- `POST /api/streak/complete`

### Notes

- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/{note}`
- `PUT /api/notes/{note}`
- `DELETE /api/notes/{note}`
- `GET /api/notes/trashed`
- `POST /api/notes/{note}/restore`
- `DELETE /api/notes/{note}/permanent`
- `PATCH /api/notes/{note}/pin`
- `GET /api/notes/{note}/versions`
- `POST /api/notes/{note}/versions/{version}/restore`

### Sharing and Collaboration

- `GET /api/shared-with-me`
- `POST /api/notes/{note}/share`
- `PUT /api/notes/{note}/share/{userId}`
- `DELETE /api/notes/{note}/share/{userId}`
- `GET /api/notes/{note}/collaborators`
- `GET /api/notes/{note}/share-code`
- `POST /api/notes/{note}/regenerate-code`
- `POST /api/notes/redeem-code`
- `GET /api/notes/{note}/presence`
- `POST /api/notes/{note}/presence`

### Files

- `GET /api/files`
- `GET /api/files/shared-with-me`
- `POST|PUT /api/files/upload`
- `GET /api/files/{file}/download`
- `GET /api/files/{file}/preview`
- `GET /api/files/{file}/shares`
- `POST /api/files/{file}/share`
- `DELETE /api/files/{file}/share/{userId}`
- `DELETE /api/files/{file}`

### Friends

- `GET /api/friends`
- `GET /api/friends/requests`
- `POST /api/friends/request`
- `PUT /api/friends/accept/{friendship}`
- `PUT /api/friends/reject/{friendship}`
- `DELETE /api/friends/request/{friendship}`
- `DELETE /api/friends/{userId}`
- `GET /api/friends/search`

### AI and OCR

- `POST /api/notes/{note}/ai-summary`
- `POST /api/notes/{note}/ai-query`
- `POST /api/notes/{note}/ocr`
- `POST /api/notes/{note}/ai-ocr`

### Admin

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/users/{user}`
- `PUT /api/admin/users/{user}`
- `DELETE /api/admin/users/{user}`
- `GET /api/admin/notes`
- `DELETE /api/admin/notes/{note}`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`
- `POST /api/admin/settings/logo`
- `POST /api/admin/settings/smtp/test`
- `GET /api/admin/shared-notes`
- `GET /api/admin/friendships`
- `GET /api/admin/activity-logs`

## Realtime Collaboration

The editor uses:

- Tiptap Collaboration
- Yjs
- y-webrtc signaling URLs from `NEXT_PUBLIC_YJS_SIGNALING_URLS`
- backend presence heartbeat endpoints

Collaboration behavior:

- Friends can be shared into a note directly.
- Non-friends can use a valid collaboration/share link to gain access.
- Presence is tracked through `/api/notes/{note}/presence`.
- Live editor state is synchronized through Yjs/WebRTC.
- Collaborator display is deduplicated by username/user identity.

## AI and OCR

AI is backend-managed. Users do not need personal AI keys in the frontend.

Admin settings control:

- AI enabled/disabled state
- provider
- API key
- base URL
- model

Supported providers:

- DeepSeek
- OpenAI-compatible APIs
- Gemini

OCR options:

- backend OCR with Tesseract
- browser OCR fallback with `tesseract.js`

Check backend OCR:

```powershell
cd backend/notexa
php artisan notexa:ocr-check
```

Windows Tesseract example:

```env
TESSERACT_BINARY=C:\Program Files\Tesseract-OCR\tesseract.exe
```

Linux example:

```env
TESSERACT_BINARY=/usr/bin/tesseract
```

## Files and Storage

Default storage is local:

```env
FILESYSTEM_DISK=local
```

Local file storage uses:

```text
backend/notexa/storage/app/public
```

Make files publicly reachable through Laravel:

```powershell
cd backend/notexa
php artisan storage:link
```

Cloudflare R2-compatible storage can be configured with:

```env
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=notexa-files
CLOUDFLARE_R2_URL=
CLOUDFLARE_R2_ENDPOINT=
```

The admin panel also exposes storage-related settings.

## Email and SMTP

SMTP is used for:

- email verification during registration
- resend verification code
- forgot password
- reset password
- admin SMTP test

If email verification is enabled in admin settings, regular users must verify their email after login. Admin users are not forced through that verification gate.

Use the admin SMTP test endpoint or admin panel after saving SMTP settings.

## Frontend Notes

The Next.js frontend includes:

- public home page
- login/register/forgot-password pages
- dashboard shell
- mobile-friendly sidebar
- notes dashboard
- rich note editor
- shared notes
- friends
- files
- trash
- settings/profile
- admin panel
- privacy policy and terms pages

Important frontend rule:

```text
All backend API calls should use NEXT_PUBLIC_API_URL.
```

## Flutter App Notes

The Flutter app is in `notexa_app`.

Typical commands:

```powershell
cd notexa_app
flutter pub get
flutter run
flutter test
```

If running on Android emulator, replace local API URLs with:

```text
http://10.0.2.2:8000/api
```

The app includes API integration, note features, file/PDF support, local state, and offline sync handling.

## Testing

Backend:

```powershell
cd backend/notexa
php artisan test
```

Backend focused test:

```powershell
php artisan test --filter=AuthLoginTest
```

The repo also supports running this from `backend/notexa/tests`:

```powershell
php artisan test tests/Feature/AuthLoginTest.php
```

Frontend production build:

```powershell
cd frontend
npm run build
```

Frontend install/audit:

```powershell
cd frontend
npm install
npm audit --omit=dev
```

Flutter:

```powershell
cd notexa_app
flutter test
```

## Postman

Postman collection:

```text
postman/Notexa_API_Collection.json
```

Recommended variables:

```text
base_url = http://127.0.0.1:8000/api
token    = token returned by /login
```

The collection is intended to mirror the backend route surface and should be updated whenever API behavior changes.

## Deployment Checklist

### Backend

1. Upload `backend/notexa` to the API host.
2. Configure `.env`.
3. Install Composer dependencies.
4. Run migrations.
5. Link storage.
6. Create/reset admin credentials.
7. Clear and rebuild caches.
8. Confirm `/docs`, `/api/settings/public`, `/api/login`, SMTP, upload, AI, and OCR behavior.

Useful commands:

```powershell
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan notexa:create-admin admin@example.com StrongPassword123 --name="Site Admin" --username=admin
```

### Frontend

1. Set `NEXT_PUBLIC_API_URL` to the deployed backend `/api` URL.
2. Set `NEXT_PUBLIC_YJS_SIGNALING_URLS`.
3. Install dependencies.
4. Build the app.
5. Deploy the Next.js output to the web host.

```powershell
npm install
npm run build
npm run start
```

### Flutter

1. Set the correct API base URL for the target platform.
2. Run `flutter pub get`.
3. Build the target package.

```powershell
flutter build apk
flutter build web
flutter build windows
```

## Troubleshooting

### CORS

If the browser blocks requests, check:

- backend `CORS_ALLOWED_ORIGINS`
- frontend `NEXT_PUBLIC_API_URL`
- no duplicated CORS headers from hosting/server config
- exact protocol/domain/port match

Local example:

```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

### Upload Temp Directory

If PHP reports:

```text
Unable to create temporary file
POST data can't be buffered; all data discarded
```

run:

```powershell
cd backend/notexa
php artisan notexa:fix-temp
```

If the warning happens before Laravel starts, set these values in PHP.ini or hosting panel PHP options:

```text
upload_tmp_dir=/full/path/to/storage/app/php-temp
sys_temp_dir=/full/path/to/storage/app/php-temp
```

Then restart PHP-FPM/LiteSpeed/Apache.

### Laravel Cache Path

If Laravel reports an invalid cache/view path:

```powershell
cd backend/notexa
php artisan optimize:clear
```

Make sure these directories exist and are writable:

```text
storage/framework/cache/data
storage/framework/sessions
storage/framework/views
storage/logs
bootstrap/cache
```

### OCR

If backend OCR says Tesseract is unavailable:

```powershell
php artisan notexa:ocr-check
```

Install Tesseract and set `TESSERACT_BINARY`. The web frontend can still use browser OCR fallback for normal UI usage.

### Cloudflare 502

A Cloudflare 502 usually means the origin server failed or returned an invalid response. Check:

- PHP/Laravel logs
- web server logs
- PHP-FPM/LiteSpeed status
- file and cache directory permissions
- `.env` domain and database values
- recent deploy/cache changes

### Tests From `tests` Folder

This works:

```powershell
cd backend/notexa/tests
php artisan test tests/Feature/AuthLoginTest.php
```

The `tests/artisan` proxy forwards the command to the real backend `artisan`.

## Documentation Map

| Document | Purpose |
| --- | --- |
| `backend/notexa/README.md` | Backend-specific setup, routes, deployment, SMTP, storage, AI, OCR |
| `guides/README.md` | Guide index |
| `guides/backend/README.md` | Backend guide |
| `guides/frontend/README.md` | Frontend guide |
| `guides/app/README.md` | Flutter app guide |
| `docs/API_AND_POSTMAN_UPDATE.md` | API/Postman update notes |
| `docs/NOTEXA_COMPLETE_STUDY_GUIDE.md` | Study guide |
| `docs/NOTEXA_MINOR_PROJECT_DOCUMENTATION.md` | Project documentation |
| `docs/NEXTJS_BEGINNER_GUIDE.md` | Next.js beginner guide |
| `docs/LARAVEL_BEGINNER_GUIDE.md` | Laravel beginner guide |
| `docs/FLUTTER_BEGINNER_GUIDE.md` | Flutter beginner guide |
| `docs/DATABASE_BEGINNER_GUIDE.md` | Database beginner guide |
| `postman/Notexa_API_Collection.json` | Postman API collection |

## Repository Hygiene

The repository tracks source, lockfiles, guides, and documentation. It intentionally excludes generated/local-only files such as:

- `node_modules`
- Laravel `vendor`
- `.env` and `.env.local`
- `.next`
- Flutter `.dart_tool` and `build`
- Laravel logs, cache files, SQLite database files, and uploaded user files
- generated exports and archives

## Current Status

The project currently targets local development with:

```text
Backend:  http://127.0.0.1:8000/api
Frontend: http://localhost:3000
Docs:     http://127.0.0.1:8000/docs
```

For production, configure the backend and frontend environment files with the live domains before building/deploying.
