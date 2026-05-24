# Upgrade Status

## What Was Upgraded Or Confirmed

| Area | Result |
| --- | --- |
| Laravel | Already on Laravel `13.6.0`, current Laravel 13 line |
| PHP | Local runtime is `8.4.20`, compatible with Laravel 13 |
| Next.js | Project uses the Next.js `16.2.x` stable line |
| React | Project uses React `18.3.x`, matching the current app code and lockfile constraints |
| TypeScript | Project uses TypeScript `5.x` |
| Tailwind CSS | Project lockfile has `3.4.19`; package constraints updated to `^3.4.19` |
| Node.js target | Frontend target is `24.15.0` through `frontend/package.json`, `.nvmrc`, and `.node-version` |
| Flutter | App code was aligned with the current backend feature set |
| Payments/subscriptions | Removed from the product and API surface |
| Notes | Archive was removed; trash, restore, and permanent delete remain |
| AI | Browser-side personal AI keys were removed; all AI keys are admin/backend settings only |
| Realtime collaboration | Next.js editor uses Yjs WebRTC rooms plus backend presence heartbeats per shared note |

## Files Changed

```text
frontend/package.json
frontend/package-lock.json
frontend/src/components/editor/NoteEditor.tsx
frontend/src/app/dashboard/notes/page.tsx
frontend/src/app/dashboard/notes/[id]/page.tsx
frontend/src/app/dashboard/settings/page.tsx
backend/notexa/routes/api.php
backend/notexa/app/Http/Controllers/Api/NoteController.php
postman/Notexa_API_Collection.json
frontend/.nvmrc
frontend/.node-version
docs/LARAVEL_BEGINNER_GUIDE.md
docs/NEXTJS_BEGINNER_GUIDE.md
docs/FLUTTER_BEGINNER_GUIDE.md
docs/DATABASE_BEGINNER_GUIDE.md
docs/UPGRADE_STATUS.md
```

## Verification

Passed:

```bash
cd frontend
npm run build
```

Passed:

```bash
cd backend/notexa
composer validate --no-check-publish
php artisan route:list --path=api
```

## Important Node Note

The project now targets Node `24.15.0`, but the machine currently reports Node `22.20.0`. A project file can declare the Node version, but installing the system Node runtime must be done with a Node installer, nvm, fnm, Volta, or similar tool.
