# Notexa Setup Guides

This folder contains practical setup documentation for the three Notexa applications:

- `backend/README.md`: Laravel API setup, database, seed data, API URL, tests, and deployment notes.
- `frontend/README.md`: Next.js web app setup, environment variables, development server, and production build.
- `app/README.md`: Flutter app setup, device-specific API URLs, run commands, and release build notes.

## Recommended Order

1. Install and run the Laravel backend.
2. Start the Next.js frontend and point it to the backend API.
3. Run the Flutter app and point it to the same backend API.
4. Use the Postman collection in `postman/Notexa_API_Collection.json` when you need to test API endpoints directly.

## Local Development URLs

| Service | Default URL |
| --- | --- |
| Backend API | `http://127.0.0.1:8000/api` |
| Backend app root | `http://127.0.0.1:8000` |
| Frontend web app | `http://localhost:3000` |
| Android emulator API URL | `http://10.0.2.2:8000/api` |

## Local Credentials

After running backend seeders, the default admin account is:

```text
Email: admin@notexa.com
Username: admin
Password: password123
```

Use this only for local development and change it in any deployed environment.

## What Not To Commit

Keep these local:

- Backend `.env`
- Frontend `.env.local`
- Dependency directories such as `vendor` and `node_modules`
- Build output such as `.next`, Flutter `build`, and Laravel compiled caches
- Uploaded files, local database files, logs, zip archives, and generated report exports
