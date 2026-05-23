# Backend Guide

The Notexa backend is a Laravel API application. It handles authentication, SMTP email verification, notes, sharing, friends, files, admin screens, settings, and integrations.

Path:

```text
backend/notexa
```

## Requirements

- PHP 8.3 or newer
- Composer
- Node.js 24.15 or newer
- npm 11.12 or newer
- SQLite for the simplest local setup
- MySQL or PostgreSQL if you prefer a server database

## Install

```powershell
cd backend/notexa
composer install
npm install
Copy-Item .env.example .env
New-Item -ItemType File database/database.sqlite -Force
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
```

For Bash or Git Bash, use:

```bash
cd backend/notexa
composer install
npm install
cp .env.example .env
touch database/database.sqlite
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
```

## Environment

Local defaults in `.env.example` use SQLite:

```text
APP_URL=http://127.0.0.1:8000
DB_CONNECTION=sqlite
```

For MySQL, update the database section:

```text
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=notexa
DB_USERNAME=root
DB_PASSWORD=
```

Optional integrations:

| Setting | Purpose |
| --- | --- |
| `CLOUDFLARE_R2_*` | R2-compatible storage credentials |
| `MAIL_*` | SMTP or mail transport configuration |
| `AWS_*` | AWS-compatible fallback settings if needed |

## Run

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

API base URL:

```text
http://127.0.0.1:8000/api
```

## Seeded Admin

The seeder creates:

```text
Email: admin@notexa.com
Username: admin
Password: password123
```

Change this account before using the app outside local development.

## Useful Commands

```powershell
php artisan migrate
php artisan migrate:fresh --seed
php artisan route:list
php artisan config:clear
php artisan cache:clear
php artisan test
```

## Main Code Locations

| Path | Purpose |
| --- | --- |
| `routes/api.php` | Public, authenticated, and admin API routes |
| `app/Http/Controllers/Api` | User-facing API controllers |
| `app/Http/Controllers/Admin` | Admin API controller |
| `app/Models` | Eloquent models |
| `app/Services` | SMTP, AI, and storage service classes |
| `database/migrations` | Database schema |
| `database/seeders/DatabaseSeeder.php` | Default settings and admin user |
| `config/cors.php` | CORS configuration for frontend/app requests |

## API Testing

Use:

```text
postman/Notexa_API_Collection.json
```

Typical flow:

1. Register or login.
2. Copy the returned token.
3. Use `Authorization: Bearer TOKEN` for protected endpoints.
4. Test notes, file preview/share, sharing, friends, settings, and admin endpoints.

## Production Notes

- Set `APP_ENV=production`.
- Set `APP_DEBUG=false`.
- Use a strong generated `APP_KEY`.
- Use a real database, not local SQLite, for production.
- Configure `APP_URL` with HTTPS.
- Configure queue, cache, mail, storage, and AI settings.
- Replace or remove seeded demo credentials.
- Run `php artisan migrate --force` during deployment.
- Do not commit `.env`, logs, cache files, uploaded files, `vendor`, or `node_modules`.

## Troubleshooting

If the frontend cannot call the API:

- Confirm the backend is running on `127.0.0.1:8000`.
- Confirm `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api`.
- Check `config/cors.php`.
- Clear config with `php artisan config:clear`.

If SQLite fails:

- Confirm `database/database.sqlite` exists.
- Confirm `.env` contains `DB_CONNECTION=sqlite`.
- Run `php artisan migrate:fresh --seed`.
