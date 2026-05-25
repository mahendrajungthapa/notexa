# API And Postman Update

Updated on 2026-05-25.

## Current Backend API Surface

This document and `postman/Notexa_API_Collection.json` are generated from the current Laravel backend route surface. The collection uses `{{base_url}}` with the default value `http://127.0.0.1:8000/api`. For production, set `base_url` to `https://app.notexa.cloud/api`.

## Important Current Behavior

- Subscription, premium, upgrade, billing, and payment gateway endpoints are removed.
- Folder APIs are removed; files load directly from `GET /files` and `GET /files/shared-with-me`.
- Archive endpoints are removed; deleted notes use trash, restore, and permanent delete.
- Personal browser AI workspace endpoints/settings are removed. AI keys are configured in Admin Settings and used only by backend AI endpoints.
- User storage defaults to `1 GB` and legacy lower limits are upgraded on login, `/me`, and upload.
- Email verification and forgot password use 6-digit SMTP codes when enabled/configured.
- File upload supports the frontend JSON/base64 `PUT /files/upload` payload and legacy multipart `POST /files/upload`.
- File preview is limited to PDFs, text/code files, and safe image types.
- Realtime collaboration links use note share codes plus backend presence endpoints for joined/typing status.

## Postman Variables

- `base_url`: `http://127.0.0.1:8000/api`
- `token`: normal user Sanctum token, auto-filled by Login with Email or Login with Username
- `admin_token`: admin Sanctum token, auto-filled by Login as Admin
- `admin_login`: `admin@notexa.com`
- `admin_password`: `NotexaAdmin@2026`
- `note_id`, `version_id`, `file_id`, `user_id`, `friendship_id`: IDs from create/list requests
- `share_code`: 8-character note share/collaboration code
- `verification_code`, `reset_code`: 6-digit SMTP codes

## Endpoint List

| Group | Request | Method | URL |
| --- | --- | --- | --- |
| 01 Public Auth and Settings | Register | POST | `{{base_url}}/register` |
| 01 Public Auth and Settings | Login with Email | POST | `{{base_url}}/login` |
| 01 Public Auth and Settings | Login with Username | POST | `{{base_url}}/login` |
| 01 Public Auth and Settings | Login as Admin | POST | `{{base_url}}/login` |
| 01 Public Auth and Settings | Forgot Password - Send Code | POST | `{{base_url}}/forgot-password` |
| 01 Public Auth and Settings | Reset Password with Code | POST | `{{base_url}}/reset-password` |
| 01 Public Auth and Settings | Resend Email Verification Code | POST | `{{base_url}}/email/verification-notification` |
| 01 Public Auth and Settings | Verify Email Code | POST | `{{base_url}}/email/verify-code` |
| 01 Public Auth and Settings | Public Settings | GET | `{{base_url}}/settings/public` |
| 01 Public Auth and Settings | Public Profile | GET | `{{base_url}}/profiles/{{username}}` |
| 01 Public Auth and Settings | Signed File Content URL | GET | `{{signed_file_content_url}}` |
| 01 Public Auth and Settings | Signed File Preview URL | GET | `{{signed_file_preview_url}}` |
| 02 Authenticated User | Get Me | GET | `{{base_url}}/me` |
| 02 Authenticated User | Logout | POST | `{{base_url}}/logout` |
| 02 Authenticated User | Complete Study Streak | POST | `{{base_url}}/streak/complete` |
| 02 Authenticated User | Update Profile | PUT | `{{base_url}}/profile` |
| 02 Authenticated User | Change Password | PUT | `{{base_url}}/change-password` |
| 03 Notes | List Notes | GET | `{{base_url}}/notes?search=&color=&page=1&per_page=20` |
| 03 Notes | Create Note | POST | `{{base_url}}/notes` |
| 03 Notes | Get Single Note | GET | `{{base_url}}/notes/{{note_id}}` |
| 03 Notes | Get Single Note with Collaboration Token | GET | `{{base_url}}/notes/{{note_id}}?collab_token={{share_code}}` |
| 03 Notes | Update Note | PUT | `{{base_url}}/notes/{{note_id}}` |
| 03 Notes | Delete Note to Trash | DELETE | `{{base_url}}/notes/{{note_id}}` |
| 03 Notes | Trashed Notes | GET | `{{base_url}}/notes/trashed?page=1` |
| 03 Notes | Restore Note | POST | `{{base_url}}/notes/{{note_id}}/restore` |
| 03 Notes | Permanent Delete Note | DELETE | `{{base_url}}/notes/{{note_id}}/permanent` |
| 03 Notes | Toggle Pin | PATCH | `{{base_url}}/notes/{{note_id}}/pin` |
| 03 Notes | Note Versions | GET | `{{base_url}}/notes/{{note_id}}/versions?page=1` |
| 03 Notes | Restore Note Version | POST | `{{base_url}}/notes/{{note_id}}/versions/{{version_id}}/restore` |
| 03 Notes | Get Share Code | GET | `{{base_url}}/notes/{{note_id}}/share-code` |
| 03 Notes | Regenerate Share Code | POST | `{{base_url}}/notes/{{note_id}}/regenerate-code` |
| 03 Notes | Redeem Share Code | POST | `{{base_url}}/notes/redeem-code` |
| 04 Realtime Collaboration Presence | Collaboration Presence List | GET | `{{base_url}}/notes/{{note_id}}/presence?collab_token={{share_code}}` |
| 04 Realtime Collaboration Presence | Collaboration Heartbeat | POST | `{{base_url}}/notes/{{note_id}}/presence` |
| 05 AI | AI Summary | POST | `{{base_url}}/notes/{{note_id}}/ai-summary` |
| 05 AI | AI Query / Writer / Translation / Quiz Prompt | POST | `{{base_url}}/notes/{{note_id}}/ai-query` |
| 05 AI | AI OCR Image | POST | `{{base_url}}/notes/{{note_id}}/ai-ocr` |
| 06 Note Sharing | Shared Notes With Me | GET | `{{base_url}}/shared-with-me?page=1&per_page=20` |
| 06 Note Sharing | Share Note With Friend | POST | `{{base_url}}/notes/{{note_id}}/share` |
| 06 Note Sharing | Update Share Permission | PUT | `{{base_url}}/notes/{{note_id}}/share/{{user_id}}` |
| 06 Note Sharing | Unshare Note | DELETE | `{{base_url}}/notes/{{note_id}}/share/{{user_id}}` |
| 06 Note Sharing | List Note Collaborators | GET | `{{base_url}}/notes/{{note_id}}/collaborators` |
| 07 Friends | List Friends | GET | `{{base_url}}/friends` |
| 07 Friends | Pending Friend Requests | GET | `{{base_url}}/friends/requests` |
| 07 Friends | Search Users | GET | `{{base_url}}/friends/search?query=ra` |
| 07 Friends | Send Friend Request | POST | `{{base_url}}/friends/request` |
| 07 Friends | Accept Friend Request | PUT | `{{base_url}}/friends/accept/{{friendship_id}}` |
| 07 Friends | Reject Friend Request | PUT | `{{base_url}}/friends/reject/{{friendship_id}}` |
| 07 Friends | Cancel Sent Friend Request | DELETE | `{{base_url}}/friends/request/{{friendship_id}}` |
| 07 Friends | Remove Friend | DELETE | `{{base_url}}/friends/{{user_id}}` |
| 08 Files | List My Files | GET | `{{base_url}}/files?page=1` |
| 08 Files | Files Shared With Me | GET | `{{base_url}}/files/shared-with-me?page=1` |
| 08 Files | Upload File - JSON Base64 | PUT | `{{base_url}}/files/upload` |
| 08 Files | Upload File - Legacy Multipart | POST | `{{base_url}}/files/upload` |
| 08 Files | Download File | GET | `{{base_url}}/files/{{file_id}}/download` |
| 08 Files | Preview File | GET | `{{base_url}}/files/{{file_id}}/preview` |
| 08 Files | List File Shares | GET | `{{base_url}}/files/{{file_id}}/shares` |
| 08 Files | Share File With Friend | POST | `{{base_url}}/files/{{file_id}}/share` |
| 08 Files | Unshare File | DELETE | `{{base_url}}/files/{{file_id}}/share/{{user_id}}` |
| 08 Files | Delete File | DELETE | `{{base_url}}/files/{{file_id}}` |
| 09 Admin | Admin Dashboard | GET | `{{base_url}}/admin/dashboard` |
| 09 Admin | Admin List Users | GET | `{{base_url}}/admin/users?search=&role=&page=1&per_page=20` |
| 09 Admin | Admin User Detail | GET | `{{base_url}}/admin/users/{{user_id}}` |
| 09 Admin | Admin Update User | PUT | `{{base_url}}/admin/users/{{user_id}}` |
| 09 Admin | Admin Delete User | DELETE | `{{base_url}}/admin/users/{{user_id}}` |
| 09 Admin | Admin List Notes | GET | `{{base_url}}/admin/notes?search=&user_id=&page=1&per_page=20` |
| 09 Admin | Admin Delete Note | DELETE | `{{base_url}}/admin/notes/{{note_id}}` |
| 09 Admin | Admin Get Settings | GET | `{{base_url}}/admin/settings?group=` |
| 09 Admin | Admin Update General Settings | PUT | `{{base_url}}/admin/settings` |
| 09 Admin | Admin Update SMTP Settings | PUT | `{{base_url}}/admin/settings` |
| 09 Admin | Admin Update Storage Settings | PUT | `{{base_url}}/admin/settings` |
| 09 Admin | Admin Update AI Settings - DeepSeek V4 | PUT | `{{base_url}}/admin/settings` |
| 09 Admin | Admin Update AI Settings - OpenAI Compatible | PUT | `{{base_url}}/admin/settings` |
| 09 Admin | Admin Update Legal Pages | PUT | `{{base_url}}/admin/settings` |
| 09 Admin | Admin Upload Site Logo | POST | `{{base_url}}/admin/settings/logo` |
| 09 Admin | Admin Test SMTP | POST | `{{base_url}}/admin/settings/smtp/test` |
| 09 Admin | Admin Shared Notes | GET | `{{base_url}}/admin/shared-notes?page=1` |
| 09 Admin | Admin Friendships | GET | `{{base_url}}/admin/friendships?status=accepted&page=1` |
| 09 Admin | Admin Activity Logs | GET | `{{base_url}}/admin/activity-logs?page=1` |
| 09 Admin | Admin Forbidden Check With User Token | GET | `{{base_url}}/admin/dashboard` |

## Upload File JSON Example

`PUT /files/upload`

```json
{
  "file_base64": "data:text/plain;base64,SGVsbG8gTm90ZXhh",
  "original_name": "hello.txt",
  "mime_type": "text/plain",
  "size": 12,
  "note_id": 1
}
```

If the server prints `Unable to create temporary file` before Laravel starts, run `php artisan notexa:fix-temp` on the backend and apply the printed `upload_tmp_dir` / `sys_temp_dir` values in PHP.ini or the hosting panel.
