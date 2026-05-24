# Notexa

Notexa is a full-stack collaborative note-taking platform built with a Laravel API, a Next.js web app, and a Flutter app. It supports rich notes, sharing, friends, file uploads, admin management, SMTP email verification, and AI-assisted summaries.

## Features

- User registration, login, SMTP password reset codes, profile updates, and Laravel Sanctum token authentication.
- Rich note editor with headings, formatting, task lists, links, images, highlights, and code-friendly content.
- Notes dashboard with create, edit, pin, archive, trash, restore, and permanent delete flows.
- Version history for notes so important changes can be reviewed later.
- Friend system using search, usernames, pending requests, accept/reject/cancel actions, and friend removal.
- Note sharing through friends, permissions, collaborators, and share codes.
- Realtime note collaboration with Tiptap Collaboration, Yjs, and WebRTC for multiple authorized editors.
- File upload, safe PDF/text/image previews, download, note attachments, and direct file sharing with friends.
- Admin area for users, notes, site settings, shared notes, friendships, and activity logs.
- AI summary and prompt endpoints through the backend service layer.
- Optional 6-digit SMTP email verification during registration.
- Flutter app for mobile/desktop access to the same API, with local drafts and resilient offline note sync.

## Project Structure

| Path | Purpose |
| --- | --- |
| `backend/notexa` | Laravel API, database migrations, seeders, services, and admin/API controllers |
| `frontend` | Next.js web frontend with the marketing pages, auth screens, dashboard, and admin UI |
| `notexa_app` | Flutter app for Android, iOS, web, Windows, macOS, and Linux targets |
| `postman` | Postman API collection for testing the backend endpoints |
| `docs` | Project reports, beginner notes, upgrade notes, and study documentation |
| `guides` | Practical setup guides for backend, frontend, and app development |

## Tech Stack

- Backend: PHP 8.3, Laravel 13, Laravel Sanctum, SQLite/MySQL/PostgreSQL-ready migrations.
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, TipTap editor, Zustand, Axios.
- App: Flutter 3, Dart, Provider, Shared Preferences, HTTP client, File Picker, PDF viewer.
- Storage and services: local filesystem by default, Cloudflare R2-compatible configuration, SMTP mail configuration, and OpenAI/Gemini/DeepSeek AI settings.

## Requirements

- Git
- PHP 8.3 or newer
- Composer
- Node.js 24.15 or newer
- npm 11.12 or newer
- Flutter SDK 3.2 or newer
- SQLite for the default local backend setup

## Quick Start

Start the backend first because both the web frontend and Flutter app call the Laravel API.

### 1. Backend

```powershell
cd backend/notexa
composer install
npm install
Copy-Item .env.example .env
New-Item -ItemType File database/database.sqlite -Force
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8000
```

Backend API:

```text
http://127.0.0.1:8000/api
```

### 2. Frontend

Open a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Web app:

```text
http://localhost:3000
```

### 3. Flutter App

Open a third terminal:

```powershell
cd notexa_app
flutter pub get
flutter run
```

For Android emulator, change the API base URL in `notexa_app/lib/services/api_service.dart` from `http://127.0.0.1:8000/api` to:

```text
http://10.0.2.2:8000/api
```

## Default Local Account

Running `php artisan migrate --seed` creates this admin account:

```text
Email: admin@notexa.com
Username: admin
Password: password123
```

Change this password immediately in any shared, staging, or production environment.

To create a new admin or reset an existing admin password on the API server:

```bash
cd backend/notexa
php artisan notexa:create-admin admin@example.com StrongPassword123 --name="Site Admin" --username=admin
```

Omit the password argument to be prompted securely.

## Environment Files

Real environment files are not committed. Create local files from the templates:

| Project | Template | Local file |
| --- | --- | --- |
| Backend | `backend/notexa/.env.example` | `backend/notexa/.env` |
| Frontend | `frontend/.env.example` | `frontend/.env.local` |

Important values:

- `APP_URL`: Backend public URL, usually `http://127.0.0.1:8000` locally.
- `DB_CONNECTION`: `sqlite` locally, or change to `mysql`/`pgsql` with matching credentials.
- `NEXT_PUBLIC_API_URL`: Frontend API URL, usually `http://127.0.0.1:8000/api` locally.
- `CORS_ALLOWED_ORIGINS`: Comma-separated frontend origins. Production should include `https://notexa.cloud`, `https://www.notexa.cloud`, and `https://app.notexa.cloud`.
- `CLOUDFLARE_R2_*`: Cloud storage credentials.
- `MAIL_*`: SMTP settings for email verification and password reset codes.

## Documentation

- Backend setup: `guides/backend/README.md`
- Frontend setup: `guides/frontend/README.md`
- Flutter app setup: `guides/app/README.md`
- All setup guides: `guides/README.md`
- API collection: `postman/Notexa_API_Collection.json`
- Full study guide: `docs/NOTEXA_COMPLETE_STUDY_GUIDE.md`
- Minor project documentation: `docs/NOTEXA_MINOR_PROJECT_DOCUMENTATION.md`

## Testing

Backend:

```powershell
cd backend/notexa
php artisan test
```

Frontend production build:

```powershell
cd frontend
npm run build
```

Flutter:

```powershell
cd notexa_app
flutter test
```

## Repository Hygiene

The repository tracks source code, lockfiles, setup guides, and lightweight documentation. It intentionally excludes generated or local-only files such as:

- `node_modules`
- Laravel `vendor`
- `.env` and `.env.local`
- `.next`
- Flutter `.dart_tool` and `build`
- Laravel logs, cache files, SQLite database files, and uploaded user files
- zip archives, generated PDF/PPTX exports, and `outputs`

## Production Checklist

- Set `APP_ENV=production` and `APP_DEBUG=false`.
- Generate a production `APP_KEY`.
- Use a production database and run migrations.
- Configure HTTPS URLs for `APP_URL` and `NEXT_PUBLIC_API_URL`.
- Configure mail, storage, and AI provider credentials.
- Replace seeded demo credentials.
- Run backend tests and frontend/app builds before deployment.
