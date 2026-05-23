# Notexa Laravel Beginner Guide

The Laravel backend is the API server for Notexa. It receives requests from the Next.js frontend and Flutter app, validates input, checks permissions, stores data, and returns JSON responses.

## Main Backend Responsibilities

- Register and log in users with Laravel Sanctum tokens.
- Send signed email verification links when verification is enabled.
- Manage notes, versions, archive, trash, pinning, share codes, and AI summaries.
- Manage friends and note sharing permissions.
- Upload, download, and serve attached files.
- Provide admin dashboards for users, notes, settings, sharing, friendships, and activity logs.
- Store configurable settings for SMTP, R2 storage, legal content, and AI.

## Important Folders

| Path | Purpose |
| --- | --- |
| `routes/api.php` | API route definitions |
| `app/Http/Controllers/Api` | User-facing API controllers |
| `app/Http/Controllers/Admin` | Admin API controller |
| `app/Models` | Eloquent models |
| `app/Services` | Mail settings, R2 storage, and AI summary services |
| `database/migrations` | Database schema files |
| `database/seeders` | Default admin account and site settings |

## Authentication

Notexa uses Laravel Sanctum. After login, the backend returns a token. The frontend and app send that token in the `Authorization` header:

```text
Authorization: Bearer TOKEN
```

## Email Verification

The admin can enable email verification from the settings panel. When enabled:

1. A new user registers.
2. Laravel sends a signed verification link using the SMTP settings.
3. The user clicks the link.
4. The backend marks `email_verified_at`.
5. The user can sign in.

If SMTP is not configured, admins can save and test SMTP settings before enabling verification.

## AI Summary

The backend reads `ai_enabled` and `deepseek_api_key` from `site_settings`. If a DeepSeek key exists, the backend asks DeepSeek to summarize the note. If the key is missing or the external service fails, Notexa creates a short local fallback summary so the feature still works.

## Useful Commands

```powershell
php artisan migrate
php artisan migrate:fresh --seed
php artisan route:list
php artisan config:clear
php artisan cache:clear
php artisan test
```
