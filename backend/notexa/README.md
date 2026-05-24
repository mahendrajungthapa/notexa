# Notexa Backend

This is the Laravel API for Notexa. It powers the Next.js frontend and Flutter app.

## Responsibilities

- Authentication with Laravel Sanctum tokens.
- User profiles, password changes, and SMTP password reset codes.
- Notes, trash, restore, pinning, and note versions.
- Share codes, friend-based note sharing, collaborators, permissions, and collaboration presence heartbeats.
- Friend requests and friend management.
- File upload, signed download URLs, direct friend sharing, and safe previews for PDF, text/code, and image files.
- Admin management for users, notes, settings, site logo upload, sharing, friendships, and activity logs.
- Service classes for 6-digit SMTP email verification, SMTP password reset, DeepSeek/OpenAI-compatible/Gemini AI endpoints, and R2-compatible storage.

## Setup

```powershell
composer install
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
Password: NotexaAdmin@2026
```

Change this account before using the app outside local development.

## Create or Reset an Admin

Use this on the API server to create a new admin account or reset an existing admin email/password:

```powershell
php artisan notexa:create-admin admin@example.com StrongPassword123 --name="Site Admin" --username=admin
```

If you omit the password argument, the command securely prompts for it.

## More Documentation

See:

```text
../../guides/backend/README.md
```
