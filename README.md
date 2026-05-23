# Notexa

Notexa is a full-stack collaborative note-taking project with:

- Laravel API backend in `backend/notexa`
- Next.js web frontend in `frontend`
- Flutter mobile/desktop app in `notexa_app`
- Postman collection in `postman`
- Project documentation in `docs`
- Setup guides in `guides`

## Quick Start

1. Start the backend first: see `guides/backend/README.md`.
2. Start the web frontend: see `guides/frontend/README.md`.
3. Run the Flutter app: see `guides/app/README.md`.

The repository intentionally excludes generated dependencies and build output such as `node_modules`, Laravel `vendor`, Flutter `build`, `.next`, local `.env` files, logs, archives, and generated PDF/PPTX outputs. Install dependencies locally from the committed lockfiles.

## Useful Paths

- Backend API routes: `backend/notexa/routes/api.php`
- Backend migrations: `backend/notexa/database/migrations`
- Frontend API client: `frontend/src/services/api.ts`
- Flutter API client: `notexa_app/lib/services/api_service.dart`
- Postman collection: `postman/Notexa_API_Collection.json`
