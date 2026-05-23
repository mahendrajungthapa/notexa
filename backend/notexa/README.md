# Notexa Backend

This is the Laravel API for Notexa. It powers the Next.js frontend and Flutter app.

## Responsibilities

- Authentication with Laravel Sanctum tokens.
- User profiles and password changes.
- Notes, archived notes, trash, restore, pinning, and note versions.
- Share codes, friend-based sharing, collaborators, and permissions.
- Friend requests and friend management.
- File upload, download, and signed file serving.
- Subscription plans, subscriptions, payment history, and API Nepal IPN endpoint.
- Admin management for users, notes, payments, plans, settings, sharing, friendships, and activity logs.
- Service classes for API Nepal payments, DeepSeek summaries, and R2-compatible storage.

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
