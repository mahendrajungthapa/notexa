# Notexa Backend

This is the Laravel API for Notexa. It powers the Next.js frontend and Flutter app.

## Responsibilities

- Authentication with Laravel Sanctum tokens.
- User profiles, password changes, and SMTP password reset codes.
- Notes, archived notes, trash, restore, pinning, and note versions.
- Share codes, friend-based note sharing, collaborators, and permissions.
- Friend requests and friend management.
- File upload, signed download URLs, direct friend sharing, and safe previews for PDF, text/code, and image files.
- Admin management for users, notes, settings, sharing, friendships, and activity logs.
- Service classes for 6-digit SMTP email verification, SMTP password reset, AI endpoints, and R2-compatible storage.

## Setup

```powershell
composer install
npm install
Copy-Item .env.example .env
New-Item -ItemType File database/database.sqlite -Force
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
```

## Run

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

API base URL:

```text
http://127.0.0.1:8000/api
```

## Test

```powershell
php artisan test
```

## Seeded Admin

```text
Email: admin@notexa.com
Username: admin
Password: password123
```

Change this account before using the app outside local development.

## More Documentation

See:

```text
../../guides/backend/README.md
```
