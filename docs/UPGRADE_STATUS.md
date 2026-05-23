# Upgrade Status

## What Was Upgraded Or Confirmed

| Area | Result |
| --- | --- |
| Laravel | Already on Laravel `13.6.0`, current Laravel 13 line |
| PHP | Local runtime is `8.4.20`, compatible with Laravel 13 |
| Next.js | Already on `16.2.4`; official Next.js blog lists 16.2 as latest stable release line |
| React | Project lockfile has `19.2.5`; package constraints updated to `^19.2.5` |
| TypeScript | Project lockfile has `5.9.3`; package constraints updated to `^5.9.3` |
| Tailwind CSS | Project lockfile has `3.4.19`; package constraints updated to `^3.4.19` |
| Node.js target | Added project target `24.15.0` through `package.json`, `.nvmrc`, `.node-version` |
| Flutter | Not upgraded, per instruction |

## Files Changed

```text
frontend/package.json
frontend/package-lock.json
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

