# Notexa Minor Project Documentation

Project name: Notexa
Project type: Full-stack collaborative note-taking system
Stacks covered: Laravel backend, Next.js frontend, Flutter app

## Abstract

Notexa is a collaborative note-taking system that allows users to create rich notes, share notes with friends, redeem share codes, upload files, generate note summaries, and use the same backend from both web and Flutter clients. The admin panel provides user management, note monitoring, settings management, SMTP testing, storage configuration, AI configuration, and activity visibility.

## Objectives

- Provide secure user registration and login.
- Support optional SMTP email verification.
- Allow users to create, edit, archive, trash, and restore notes.
- Allow note sharing with friends and share codes.
- Support attached files.
- Provide AI-assisted note summaries.
- Provide a browser frontend and Flutter app using the same API.
- Provide an admin panel for operational control.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Backend | Laravel, PHP, Sanctum |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Mobile/Desktop app | Flutter, Dart |
| Database | SQLite locally, MySQL/PostgreSQL-ready migrations |
| Files | Local storage or R2-compatible configuration |
| Mail | SMTP settings stored in admin settings |
| AI | DeepSeek key with local fallback summary |

## Functional Modules

### Authentication

Users can register, verify email when enabled, login, logout, update profile, and change password.

### Notes

Users can create rich notes, edit content, pin notes, archive notes, move notes to trash, restore notes, and permanently delete notes.

### Sharing

Users can add friends by username, accept or reject friend requests, share notes with friends, choose view/edit access, and redeem share codes.

### Files

Users can upload files and attach files to notes. Storage usage is tracked per user.

### AI Summaries

Users can generate summaries from note content. The backend uses DeepSeek if configured and falls back to a local summary when needed.

### Admin

Admins can view dashboard stats, manage users, review notes, configure settings, test SMTP, manage shared notes, inspect friendships, and view activity logs.

## Database Tables

- `users`
- `notes`
- `note_versions`
- `friendships`
- `note_shares`
- `files`
- `site_settings`
- `activity_logs`
- `sessions`
- `personal_access_tokens`

## API Groups

| Group | Examples |
| --- | --- |
| Public | register, login, public settings, email verification |
| Authenticated | profile, password, notes, friends, sharing, files |
| Admin | dashboard, users, notes, settings, shared notes, friendships, activity logs |

## Email Verification

The admin saves SMTP host, port, username, password, sender address, and sender name. The backend applies those settings when sending verification and test emails. When verification is enabled, login is blocked until the user clicks the signed verification link.

## AI Summary

The note summary endpoint checks note permission, verifies that AI summaries are enabled, summarizes the note, saves the generated summary, and returns it to the web or Flutter client.

## Conclusion

Notexa demonstrates a complete full-stack workflow with a shared API, web client, app client, authentication, collaboration, file handling, admin settings, email verification, and AI-assisted note summaries.
