# Next.js Beginner Guide for Notexa

## What Next.js Does

Next.js is the web frontend of Notexa. It is what users see in the browser. It calls the Laravel API to log in, show notes, edit notes, upload files, share notes, and open the admin panel.

## Current Version

- Next.js: `16.2.4`
- React installed: `19.2.5`
- Node target added: `24.15.0` LTS
- npm target added: `11.12.1`

The project now includes:

```text
frontend/.nvmrc
frontend/.node-version
```

Both point to Node `24.15.0`.

## Important Folders

```text
frontend/src
  app                 Pages and layouts
  components          Reusable UI pieces
  contexts            Global app state
  services            API client
```

## Routing

Next.js uses file-based routing.

| File | Browser Route |
| --- | --- |
| `src/app/page.tsx` | `/` |
| `src/app/auth/login/page.tsx` | `/auth/login` |
| `src/app/auth/register/page.tsx` | `/auth/register` |
| `src/app/dashboard/notes/page.tsx` | `/dashboard/notes` |
| `src/app/dashboard/notes/[id]/page.tsx` | `/dashboard/notes/5` |
| `src/app/admin/dashboard/page.tsx` | `/admin/dashboard` |

`[id]` means dynamic route. It can load different note IDs.

## API Client

File:

```text
src/services/api.ts
```

It creates one Axios client:

```ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
});
```

The token is automatically attached:

```text
Authorization: Bearer <token>
```

Grouped API helpers:

| Helper | Purpose |
| --- | --- |
| `authApi` | Login, register, logout, profile |
| `notesApi` | Notes, share code, AI summary |
| `friendsApi` | Friend requests |
| `filesApi` | Upload/download files |
| `subscriptionApi` | Plans and payments |
| `adminApi` | Admin panel |

## Auth Store

File:

```text
src/contexts/authStore.ts
```

It uses Zustand to store:

- logged-in user
- token
- loading status
- authentication status
- dashboard stats

It also saves token and user in browser `localStorage`.

## Layouts

`src/app/layout.tsx`

- Root layout.
- Loads global CSS.
- Adds `AuthProvider`.
- Adds toast notifications.

`src/app/dashboard/layout.tsx`

- Protects user dashboard.
- Redirects guests to login.
- Shows sidebar.
- Includes redeem share code modal.

`src/app/admin/layout.tsx`

- Protects admin pages.
- Redirects non-admin users.
- Shows admin navigation.

## Note Editor

File:

```text
src/components/editor/NoteEditor.tsx
```

Uses TipTap rich text editor.

Features:

- bold
- italic
- underline
- headings
- bullet lists
- number lists
- task lists
- quote
- code
- image by URL
- links
- text alignment
- undo/redo

The editor returns HTML, and Laravel saves that HTML in the database.

## Important Pages

| Page | Purpose |
| --- | --- |
| Home | Landing page |
| Login | User login |
| Register | New account |
| Notes | List and create notes |
| Note Detail | Edit, autosave, share, AI, files |
| Shared | Notes shared with current user |
| Friends | Add/accept/remove friends |
| Files | Upload and download files |
| Subscription | Premium plans and payments |
| Settings | Profile and password |
| Admin Dashboard | Statistics |
| Admin Users | Manage users |
| Admin Settings | Configure SMTP, R2, AI, payment |

## How To Run

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
```

## Teacher Explanation

Next.js is the browser part of Notexa. It shows pages and components, stores login state in Zustand, sends requests to Laravel through Axios, and displays API responses as user interface.

