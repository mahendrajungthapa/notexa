# Frontend Guide

The Notexa frontend is a Next.js application. It contains the public pages, authentication screens, notes dashboard, settings, files, friends, and admin UI.

Path:

```text
frontend
```

## Requirements

- Node.js 24.15 or newer
- npm 11.12 or newer
- Running Laravel backend API

## Install

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
```

For Bash or Git Bash:

```bash
cd frontend
npm install
cp .env.example .env.local
```

## Environment

Local `.env.local` should contain:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Production should point to the deployed backend API:

```text
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```

The frontend API client is:

```text
frontend/src/services/api.ts
```

## Run

```powershell
npm run dev
```

Default web URL:

```text
http://localhost:3000
```

## Build

```powershell
npm run build
npm run start
```

## Main Code Locations

| Path | Purpose |
| --- | --- |
| `src/app/page.tsx` | Public home page |
| `src/app/auth` | Login and registration screens |
| `src/app/dashboard` | User dashboard, notes, file preview/share, friends, sharing, and settings |
| `src/app/admin` | Admin dashboard and management pages |
| `src/components/editor/NoteEditor.tsx` | Rich note editor |
| `src/components/layout` | Shared header, footer, auth provider |
| `src/contexts/authStore.ts` | Authentication state |
| `src/services/api.ts` | Axios API client and endpoint wrappers |

## Realtime Collaboration

The note editor uses `@tiptap/extension-collaboration`, Yjs, and `y-webrtc` for realtime multi-collaborator editing. Open a note, click the collaboration button in the editor toolbar, and share the generated realtime link with users who already have access to that note.

## Local Login Flow

1. Start the backend.
2. Run migrations and seeders.
3. Start the frontend.
4. Visit `http://localhost:3000/auth/login`.
5. Login with the seeded admin account or register a new account.

Seeded admin:

```text
Email: admin@notexa.com
Password: password123
```

## Troubleshooting

If login or API calls fail:

- Confirm the backend is running at `http://127.0.0.1:8000`.
- Confirm `.env.local` has `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api`.
- Restart `npm run dev` after editing `.env.local`.
- Check the browser network tab for the failing API path.
- Confirm the backend token routes are working through Postman.

If styles look wrong:

- Restart the dev server.
- Confirm dependencies installed without errors.
- Run `npm run build` to surface TypeScript or build issues.

## Do Not Commit

- `.env.local`
- `.next`
- `node_modules`
- generated zip files
