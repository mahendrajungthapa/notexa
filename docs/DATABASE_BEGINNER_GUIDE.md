# Notexa Database Beginner Guide

This guide explains the current Notexa database in simple terms. Notexa stores users, notes, friendships, shared notes, uploaded files, site settings, note versions, sessions, and activity logs.

## Main Tables

| Table | Purpose |
| --- | --- |
| `users` | Registered accounts, roles, email verification, account status, and storage usage |
| `notes` | User-created notes with title, content, color, trash state, share code, and AI summary |
| `note_versions` | Saved versions of note content |
| `friendships` | Friend requests and accepted friend links |
| `note_shares` | Which users can view or edit shared notes |
| `files` | Uploaded file metadata and storage paths |
| `site_settings` | Admin-managed settings for site text, SMTP, R2 storage, legal pages, and AI |
| `activity_logs` | Admin-visible activity records |
| `sessions` | Laravel session storage when database sessions are used |
| `personal_access_tokens` | Laravel Sanctum API tokens |

## Core Relationships

```text
users 1 -> many notes
users 1 -> many files
users 1 -> many activity_logs
users many -> many notes through note_shares
users many -> many users through friendships
notes 1 -> many note_versions
notes 1 -> many files
```

## Users

Important user fields:

- `name`
- `username`
- `email`
- `email_verified_at`
- `role`
- `storage_used`
- `storage_limit`
- `is_active`

The admin user is created by the seeder for local development.

## Notes

Important note fields:

- `title`
- `content`
- `plain_text`
- `color`
- `is_pinned`
- `is_trashed`
- `share_code`
- `ai_summary`

The backend keeps plain text for searching, HTML content for rich display, and trashed notes for restore/permanent delete flows.

## Site Settings

`site_settings` is a flexible key-value table. The admin panel edits these groups:

- `general`
- `smtp`
- `email`
- `legal`
- `storage`
- `ai`

Settings are saved with a `type`, so booleans and integers can be converted correctly when the backend reads them.

## Why This Design Works

The schema keeps ownership simple: users own notes and files, while sharing is stored in separate tables. This makes permissions easy to check and keeps the API clean for both the web frontend and Flutter app.
