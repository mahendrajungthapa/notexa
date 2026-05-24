# Notexa Minor Project Documentation

Project name: Notexa
Project type: Full-stack collaborative note-taking system
Stacks covered: Laravel backend, Next.js frontend, Flutter app

## Abstract

Notexa is a collaborative note-taking system that allows users to create rich notes, share notes with friends, redeem share codes, upload and safely preview files, use backend AI tools, and use the same backend from both web and Flutter clients. The admin panel provides user management, note monitoring, settings management, SMTP testing, storage configuration, AI configuration, and activity visibility.

## Objectives

- Provide secure user registration and login.
- Support optional SMTP email verification.
- Allow users to create, edit, trash, restore, and permanently delete notes.
- Allow note sharing with friends and share codes.
- Support attached files, safe previews, and direct file sharing with friends.
- Provide AI-assisted summaries, questions, flashcards, quizzes, and cleaned study notes.
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
| AI | Admin-configured OpenAI-compatible or Gemini provider |

## Functional Modules

### Authentication

Users can register, verify email when enabled, login, logout, update profile, and change password.

### Notes

Users can create rich notes, edit content, pin notes, move notes to trash, restore notes, and permanently delete notes.

### Sharing

Users can add friends by username, accept or reject friend requests, share notes with friends, choose view/edit access, and redeem share codes.

### Files

Users can upload files, attach files to notes, preview PDFs/text/code/images safely, download files, and share files directly with accepted friends. Storage usage is tracked per user.

### AI Tools

Users can generate summaries and run prompt-based tools from note content. The backend uses the configured OpenAI-compatible or Gemini provider without exposing provider API keys to clients.

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

The admin saves SMTP host, port, username, password, sender address, and sender name. The backend applies those settings when sending verification and test emails. When verification is enabled, registration sends a 6-digit code by SMTP, the web frontend opens a verification popup, and login is blocked until `email_verified_at` is set.

## AI Tools

The note AI endpoints check note permission, verify that AI is enabled, call the configured provider, and return the result to the web or Flutter client. Summary responses are saved on the note; prompt responses are returned directly.

## Safe File Preview

File preview uses short-lived signed URLs. The backend allows inline preview only for PDF, text/code, and common image files, sets `X-Content-Type-Options: nosniff`, and keeps unsupported files download-only.

## Conclusion

Notexa demonstrates a complete full-stack workflow with a shared API, web client, app client, authentication, collaboration, safe file handling, admin settings, email verification, and AI-assisted study features.
