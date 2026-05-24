# Notexa Laravel Beginner Guide

The Laravel backend is the API server for Notexa. It receives requests from the Next.js frontend and Flutter app, validates input, checks permissions, stores data, and returns JSON responses.

## Main Backend Responsibilities

- Register and log in users with Laravel Sanctum tokens.
- Send 6-digit SMTP email verification codes when verification is enabled.
- Send 6-digit SMTP password reset codes and reset passwords after code verification.
- Manage notes, versions, trash, pinning, share codes, file sharing, and AI tools.
- Manage friends and note sharing permissions.
- Upload, download, directly share, and safely preview attached files.
- Provide admin dashboards for users, notes, settings, sharing, friendships, and activity logs.
- Store configurable settings for SMTP, R2 storage, legal content, and AI.

## Important Folders

| Path | Purpose |
| --- | --- |
| `routes/api.php` | API route definitions |
| `app/Http/Controllers/Api` | User-facing API controllers |
| `app/Http/Controllers/Admin` | Admin API controller |
| `app/Models` | Eloquent models |
| `app/Services` | Mail settings, R2 storage, and AI provider services |
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
2. Laravel sends a 6-digit verification code using the SMTP settings.
3. The frontend opens a verification popup.
4. The user submits the code to `/api/email/verify-code`.
5. The backend marks `email_verified_at` and returns a Sanctum token.

If SMTP is not configured, admins can save and test SMTP settings before enabling verification.

## Password Reset

Forgot password uses the same SMTP settings as email verification:

1. `POST /api/forgot-password` accepts an email address and sends a 6-digit reset code.
2. `POST /api/reset-password` accepts the email, code, new password, and confirmation.
3. The backend hashes the new password, clears the reset code, and revokes existing Sanctum tokens.

## AI Tools

The backend reads `ai_enabled`, `ai_provider`, and provider credentials from `site_settings`. It can call DeepSeek V4, OpenAI-compatible providers, or Gemini for summaries and prompt-based note tools. Provider keys stay on the backend and are never returned in public settings.

## Safe File Preview

File preview returns short-lived signed URLs. The backend allows inline preview only for PDF, text/code, and common image files, and sets `X-Content-Type-Options: nosniff` before serving preview content.

## Useful Commands

```powershell
php artisan migrate
php artisan migrate:fresh --seed
php artisan route:list
php artisan config:clear
php artisan cache:clear
php artisan test
```
