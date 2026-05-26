# Notexa Backend

Laravel powers the Notexa API used by the Next.js web app and the Flutter app. The backend is API-first: browser pages are kept minimal, while application features are exposed through `/api` routes secured by Laravel Sanctum tokens.

## What This Backend Handles

- Username/email login, registration, logout, and user profile updates.
- Optional SMTP email verification with 6-digit codes.
- SMTP forgot-password and reset-password flow with 6-digit codes.
- Notes, trash, restore, pinning, version history, and version restore.
- Share codes, friend-based note sharing, direct collaboration access, and realtime presence heartbeats.
- Friend requests, friend search, accepted friends, and online status data.
- File upload, local storage by default, optional Cloudflare R2-compatible storage, signed downloads, safe previews, and file sharing.
- Admin dashboard APIs for users, notes, settings, site logo, SMTP testing, sharing, friendships, and activity logs.
- Admin-managed AI settings for DeepSeek, OpenAI-compatible APIs, and Gemini.
- OCR API support through Tesseract, with the web frontend also able to fall back to browser OCR.

## Requirements

- PHP 8.3 or newer
- Composer
- SQLite for local development, or MySQL/PostgreSQL in production
- Node/Next.js frontend configured separately
- Optional: Tesseract OCR for backend-side OCR
- Optional: Cloudflare R2 credentials for cloud file storage

## Local Setup

Run these commands from `backend/notexa`:

```powershell
composer install
Copy-Item .env.example .env
New-Item -ItemType File database/database.sqlite -Force
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan notexa:fix-temp
```

Start the API:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

Local API base URL:

```text
http://127.0.0.1:8000/api
```

Local route docs:

```text
http://127.0.0.1:8000/docs
```

## Environment

Important `.env` values:

```env
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://notexa.cloud,https://www.notexa.cloud,https://app.notexa.cloud

DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

FILESYSTEM_DISK=local

MAIL_MAILER=smtp
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME="${APP_NAME}"

AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash

TESSERACT_BINARY=
TESSERACT_LANG=eng
TESSERACT_PSM=6
```

For production, set `APP_ENV=production`, `APP_DEBUG=false`, and use the real domain values for `APP_URL`, `FRONTEND_URL`, and `CORS_ALLOWED_ORIGINS`.

## How Routes Work

Laravel registers routes in two files:

- `routes/web.php`: small public web endpoints, including `/` and `/docs`.
- `routes/api.php`: all application API endpoints. Laravel automatically prefixes these routes with `/api`.

Example:

```php
Route::post('/login', [AuthController::class, 'login']);
```

is available as:

```text
POST /api/login
```

The `/docs` page is generated from Laravel's registered route collection. When an API route is added or removed, `/docs` updates automatically without maintaining a separate hard-coded list.

## Route Access Levels

The API uses these access patterns:

- Public: no token required, for login, register, public settings, public profiles, signed file preview links, and email/password code endpoints.
- Bearer token: requires `Authorization: Bearer <token>` from `/api/login` or registration.
- Admin: requires a Sanctum token for a user with `role=admin`, plus the `is_admin` middleware.
- Signed URL: uses Laravel signed URLs for safe file content and preview routes.

## API Groups

Auth and account:

```text
POST /api/register
POST /api/login
POST /api/logout
GET  /api/me
PUT  /api/profile
PUT  /api/change-password
POST /api/streak/complete
```

Email verification and password reset:

```text
POST /api/email/verification-notification
POST /api/email/verify-code
POST /api/forgot-password
POST /api/reset-password
```

Notes:

```text
GET    /api/notes
POST   /api/notes
GET    /api/notes/{note}
PUT    /api/notes/{note}
DELETE /api/notes/{note}
GET    /api/notes/trashed
POST   /api/notes/{note}/restore
DELETE /api/notes/{note}/permanent
PATCH  /api/notes/{note}/pin
```

Collaboration and sharing:

```text
GET  /api/notes/{note}/presence
POST /api/notes/{note}/presence
GET  /api/notes/{note}/share-code
POST /api/notes/{note}/regenerate-code
POST /api/notes/redeem-code
POST /api/notes/{note}/share
PUT  /api/notes/{note}/share/{userId}
DELETE /api/notes/{note}/share/{userId}
GET  /api/notes/{note}/collaborators
GET  /api/shared-with-me
```

Version history:

```text
GET  /api/notes/{note}/versions
POST /api/notes/{note}/versions/{version}/restore
```

AI and OCR:

```text
POST /api/notes/{note}/ai-summary
POST /api/notes/{note}/ai-query
POST /api/notes/{note}/ocr
POST /api/notes/{note}/ai-ocr
```

Files:

```text
GET      /api/files
GET      /api/files/shared-with-me
POST|PUT /api/files/upload
GET      /api/files/{file}/download
GET      /api/files/{file}/preview
GET      /api/files/{file}/shares
POST     /api/files/{file}/share
DELETE   /api/files/{file}/share/{userId}
DELETE   /api/files/{file}
```

Friends:

```text
GET    /api/friends
GET    /api/friends/requests
POST   /api/friends/request
PUT    /api/friends/accept/{friendship}
PUT    /api/friends/reject/{friendship}
DELETE /api/friends/request/{friendship}
DELETE /api/friends/{userId}
GET    /api/friends/search
```

Admin:

```text
GET    /api/admin/dashboard
GET    /api/admin/users
GET    /api/admin/users/{user}
PUT    /api/admin/users/{user}
DELETE /api/admin/users/{user}
GET    /api/admin/notes
DELETE /api/admin/notes/{note}
GET    /api/admin/settings
PUT    /api/admin/settings
POST   /api/admin/settings/logo
POST   /api/admin/settings/smtp/test
GET    /api/admin/shared-notes
GET    /api/admin/friendships
GET    /api/admin/activity-logs
```

For the full live list with middleware, request hints, and copyable URLs, open `/docs`.

## Authentication

Login accepts either username or email:

```json
{
  "login": "admin@example.com",
  "password": "your-password"
}
```

Successful login returns a Sanctum token. Send it on protected requests:

```http
Authorization: Bearer <token>
Accept: application/json
```

## Seeded Admin

Development seed credentials:

```text
Email: admin@notexa.com
Username: admin
Password: NotexaAdmin@2026
```

Change this account before using the app outside local development.

## Create or Reset an Admin

Use this command on the API server:

```powershell
php artisan notexa:create-admin admin@example.com StrongPassword123 --name="Site Admin" --username=admin
```

If the password argument is omitted, the command securely prompts for it.

## SMTP

SMTP powers:

- registration email verification codes
- resend verification code
- forgot password reset codes
- admin SMTP test email

After changing SMTP settings in the admin panel, use:

```text
POST /api/admin/settings/smtp/test
```

If email verification is enabled in admin settings, non-admin users can log in but must verify with the 6-digit code before using the app normally.

## Storage

Local storage is the default and is recommended for local development:

```env
FILESYSTEM_DISK=local
```

Uploaded files are stored under `storage/app/public` and served through signed preview/download routes. Run:

```powershell
php artisan storage:link
```

Cloudflare R2 can be enabled later through environment variables and admin settings:

```env
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=notexa-files
CLOUDFLARE_R2_URL=
CLOUDFLARE_R2_ENDPOINT=
```

## Upload Temp Directory

If uploads return PHP startup warnings like:

```text
Unable to create temporary file
POST data can't be buffered; all data discarded
```

run:

```powershell
php artisan notexa:fix-temp
```

Notexa sets `TMP`, `TEMP`, and `TMPDIR` to `storage/app/php-temp` before Laravel handles requests. If the warning appears before Laravel starts, set these PHP values in PHP.ini or the hosting panel and restart PHP:

```text
upload_tmp_dir=/full/path/to/storage/app/php-temp
sys_temp_dir=/full/path/to/storage/app/php-temp
```

## AI

AI features use admin-managed provider settings. Supported providers are:

- DeepSeek
- OpenAI-compatible APIs
- Gemini

Default DeepSeek environment values:

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

Frontend personal AI keys are not required. The frontend calls backend AI endpoints, and the backend uses admin-configured keys.

## OCR

Backend OCR uses Tesseract when available:

```env
TESSERACT_BINARY=/usr/bin/tesseract
TESSERACT_LANG=eng
TESSERACT_PSM=6
```

Windows example:

```env
TESSERACT_BINARY=C:\Program Files\Tesseract-OCR\tesseract.exe
```

Check OCR availability:

```powershell
php artisan notexa:ocr-check
```

The Next.js frontend also includes browser OCR fallback, so web users can still extract text when server-side Tesseract is unavailable.

## Testing

Run all backend tests:

```powershell
php artisan test
```

Run one feature test from the backend root:

```powershell
php artisan test --filter=AuthLoginTest
```

The project also supports this command from inside `backend/notexa/tests`:

```powershell
php artisan test tests/Feature/AuthLoginTest.php
```

## Postman

The updated Postman collection is stored at:

```text
../../postman/Notexa_API_Collection.json
```

Set the Postman `base_url` variable to:

```text
http://127.0.0.1:8000/api
```

Then login and use the returned token as the `token` variable.

## Deployment Checklist

1. Upload backend files to the API host.
2. Install Composer dependencies with production flags.
3. Configure `.env` with production domains, database, SMTP, AI, and storage settings.
4. Run migrations.
5. Link storage.
6. Clear and rebuild Laravel caches.
7. Create or reset the admin account.
8. Confirm `/docs`, `/api/settings/public`, `/api/login`, file upload, SMTP test, and AI/OCR endpoints.

Useful deployment commands:

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

## Related Documentation

- Dynamic backend API docs: `/docs`
- Root project README: `../../README.md`
- Backend guide folder: `../../guides/backend/README.md`
- Postman collection: `../../postman/Notexa_API_Collection.json`
