# Frontend Guide

Path: `frontend`

## Requirements

- Node.js 24.15 or newer
- npm 11.12 or newer
- Running backend API

## Setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
```

For local development, keep:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

For production, set `NEXT_PUBLIC_API_URL` to the public backend API URL.

## Run

```powershell
npm run dev
```

The web app will usually be available at:

```text
http://localhost:3000
```

## Build

```powershell
npm run build
npm run start
```

## Notes

- Do not commit `.env.local`, `.next`, `node_modules`, or generated zip files.
- The API client is in `frontend/src/services/api.ts`.
