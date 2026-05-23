# Backend Guide

Path: `backend/notexa`

## Requirements

- PHP 8.3 or newer
- Composer
- Node.js 24.15 or newer
- npm 11.12 or newer
- SQLite for the default local setup, or MySQL/PostgreSQL if you change `.env`

## Setup

```powershell
cd backend/notexa
composer install
npm install
Copy-Item .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
```

If you want SQLite locally, keep `DB_CONNECTION=sqlite`. Laravel will use `database/database.sqlite`; create it if your PHP setup does not create it automatically:

```powershell
New-Item -ItemType File database/database.sqlite -Force
php artisan migrate --seed
```

## Run

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

The API will be available at:

```text
http://127.0.0.1:8000/api
```

## Test

```powershell
php artisan test
```

## Notes

- Do not commit `.env`, logs, `vendor`, `node_modules`, or uploaded files.
- API Nepal, Cloudflare R2, mail, and AWS-style values should be filled only in local or production environment files.
- The Postman collection is available at `postman/Notexa_API_Collection.json`.
