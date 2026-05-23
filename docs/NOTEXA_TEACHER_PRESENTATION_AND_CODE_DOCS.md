# Notexa Complete Project Documentation

This document explains how the Notexa minor project was made, how the Laravel backend, Next.js frontend, Flutter app, and database work together, and how to explain the full codebase to a teacher during a viva or project defense.

The details below were checked against the actual project source code in:

- `backend/notexa`
- `frontend`
- `notexa_app`

## 1. Project Summary

Notexa is a collaborative note-taking platform. A user can register, log in, create notes, edit notes, share notes with friends, redeem share codes, upload files, request AI summaries, and manage subscription/payment features. An admin can see analytics, manage users, notes, plans, payments, and site settings.

The project has three application layers:

1. Laravel backend API
   - Handles authentication, validation, business logic, database queries, file upload logic, payment logic, AI summary logic, and admin APIs.

2. Next.js web frontend
   - Runs in the browser.
   - Provides the landing page, login/register pages, user dashboard, note editor, friends page, files page, subscription page, and admin panel.

3. Flutter mobile app
   - Runs as a mobile/desktop app.
   - Uses the same Laravel API.
   - Adds local note caching and offline draft support using SharedPreferences.

The database stores all permanent project data: users, notes, friendships, note shares, files, subscriptions, payments, settings, versions, and activity logs.

## 2. Technology Stack

Actual versions and dependencies from the codebase:

| Area | Technology | Where It Is Defined | Purpose |
| --- | --- | --- | --- |
| Backend | PHP 8.3+ | `backend/notexa/composer.json` | Server-side language |
| Backend framework | Laravel `^13.0` | `backend/notexa/composer.json` | REST API framework |
| API auth | Laravel Sanctum `^4.0` | `backend/notexa/composer.json` | Token-based API login |
| File storage adapter | Flysystem AWS S3 v3 | `backend/notexa/composer.json` | Cloudflare R2 compatible storage |
| Realtime package | Pusher PHP Server | `backend/notexa/composer.json` | Prepared for realtime events |
| Web frontend | Next.js `^16.2.4` | `frontend/package.json` | React web app framework |
| Web UI | React `^19.1.0` | `frontend/package.json` | Component-based UI |
| Web language | TypeScript `^5.8.3` | `frontend/package.json` | Typed JavaScript |
| Web styling | Tailwind CSS `^3.4.17` | `frontend/package.json` | Utility CSS styling |
| Web API client | Axios `^1.15.2` | `frontend/package.json` | HTTP requests to Laravel |
| Web state | Zustand `^5.0.12` | `frontend/package.json` | Auth/user state |
| Web editor | TipTap `^2.12.0` | `frontend/package.json` | Rich text editor |
| Mobile app | Flutter | `notexa_app/pubspec.yaml` | Cross-platform app |
| Mobile language | Dart SDK `>=3.2.0 <4.0.0` | `notexa_app/pubspec.yaml` | Flutter language |
| Mobile state | Provider `^6.1.0` | `notexa_app/pubspec.yaml` | Auth state management |
| Mobile HTTP | http `^1.2.0` | `notexa_app/pubspec.yaml` | API requests |
| Mobile local storage | shared_preferences `^2.2.0` | `notexa_app/pubspec.yaml` | Token and local note cache |
| Mobile file picker | file_picker `^8.0.0` | `notexa_app/pubspec.yaml` | Select files |
| Mobile PDF viewer | Syncfusion PDF Viewer `^27.2.5` | `notexa_app/pubspec.yaml` | Preview PDF attachments |

## 3. High-Level Architecture

The system follows a client-server architecture:

```text
User Browser or Flutter App
        |
        | HTTP/JSON requests
        v
Laravel REST API
        |
        | Eloquent ORM queries
        v
Database
```

External services are optional/configurable:

```text
Laravel API
  |-- DeepSeek API for AI note summaries
  |-- Cloudflare R2 or local public disk for file storage
  |-- API Nepal for subscription payments
  |-- SMTP mail server for optional email testing/verification
```

Important point for presentation:

The web app and Flutter app do not directly access the database. They only call the Laravel API. Laravel is the trusted middle layer that validates requests, checks permissions, and reads/writes the database.

## 4. Request Flow

Example: creating a note from the web frontend.

```text
1. User clicks create note in Next.js.
2. Next.js calls POST http://localhost:8000/api/notes.
3. Axios adds Authorization: Bearer <token>.
4. Laravel Sanctum identifies the logged-in user.
5. routes/api.php sends the request to NoteController@store.
6. NoteController validates title/content/color.
7. Eloquent creates a row in the notes table.
8. A first note_versions row is created.
9. Laravel returns JSON to Next.js.
10. Next.js redirects the user to the note editor page.
```

The Flutter flow is the same, except Flutter uses `ApiService` instead of Axios.

## 5. Backend Folder Structure

```text
backend/notexa
  app/
    Http/
      Controllers/
        Admin/AdminController.php
        Api/AuthController.php
        Api/NoteController.php
        Api/NoteShareController.php
        Api/FriendController.php
        Api/FileController.php
        Api/SubscriptionController.php
      Middleware/
        IsAdmin.php
        IsPremium.php
    Models/
      User.php
      Note.php
      NoteShare.php
      Friendship.php
      File.php
      Payment.php
      Subscription.php
      SubscriptionPlan.php
      SiteSetting.php
      NoteVersion.php
      ActivityLog.php
    Services/
      DeepSeekService.php
      R2StorageService.php
      ApiNepalPaymentService.php
  bootstrap/app.php
  config/
  database/
    migrations/
    seeders/DatabaseSeeder.php
  routes/api.php
```

## 6. Laravel Backend Code Documentation

### 6.1 `routes/api.php`

This file is the API route map. It connects URLs to controller methods.

Main route groups:

| Group | Protection | Purpose |
| --- | --- | --- |
| Public routes | No token required | Register, login, public settings, payment IPN callback |
| Authenticated routes | `auth:sanctum` | User profile, notes, sharing, friends, files, subscriptions |
| Admin routes | `auth:sanctum` plus `is_admin` | Admin dashboard, users, notes, payments, plans, settings |

Important public routes:

| Method | Route | Controller | Purpose |
| --- | --- | --- | --- |
| POST | `/api/register` | `AuthController@register` | Create user account |
| POST | `/api/login` | `AuthController@login` | Login using email/username and password |
| POST | `/api/subscription/ipn` | `SubscriptionController@handleIPN` | Payment callback from API Nepal |
| GET | `/api/settings/public` | Inline route | Public site name/logo/about/legal content |
| GET | `/api/files/{file}/content` | `FileController@serve` | Signed file download route |

Important authenticated routes:

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/logout` | Delete current API token |
| GET | `/api/me` | Return logged-in user and stats |
| PUT | `/api/profile` | Update name/username |
| PUT | `/api/change-password` | Change password |
| GET | `/api/notes` | List user's active notes |
| POST | `/api/notes` | Create note |
| GET | `/api/notes/{note}` | Show note if user can view |
| PUT | `/api/notes/{note}` | Update note if user can edit |
| DELETE | `/api/notes/{note}` | Move note to trash |
| POST | `/api/notes/{note}/restore` | Restore trashed note |
| DELETE | `/api/notes/{note}/permanent` | Permanently delete note |
| PATCH | `/api/notes/{note}/pin` | Toggle pin |
| PATCH | `/api/notes/{note}/archive` | Toggle archive |
| GET | `/api/notes/{note}/versions` | List note edit history |
| GET | `/api/notes/{note}/share-code` | Get note share code |
| POST | `/api/notes/{note}/regenerate-code` | Generate new share code |
| POST | `/api/notes/redeem-code` | Redeem 8-character share code |
| POST | `/api/notes/{note}/ai-summary` | Generate AI summary |
| GET | `/api/shared-with-me` | Notes shared with current user |
| POST | `/api/notes/{note}/share` | Share with a friend |
| PUT | `/api/notes/{note}/share/{userId}` | Change permission |
| DELETE | `/api/notes/{note}/share/{userId}` | Remove sharing |
| GET | `/api/notes/{note}/collaborators` | List collaborators |
| GET | `/api/friends` | Friend list |
| GET | `/api/friends/requests` | Pending sent/received friend requests |
| POST | `/api/friends/request` | Send request by username |
| PUT | `/api/friends/accept/{friendship}` | Accept request |
| PUT | `/api/friends/reject/{friendship}` | Reject request |
| DELETE | `/api/friends/{userId}` | Remove friend |
| GET | `/api/friends/search` | Search users |
| GET | `/api/files` | List files |
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files/{file}/download` | Get temporary download URL |
| DELETE | `/api/files/{file}` | Delete file |
| GET | `/api/subscription/plans` | Public active plans for logged-in user |
| GET | `/api/subscription/my` | Current subscription and storage status |
| POST | `/api/subscription/subscribe` | Start payment |
| GET | `/api/subscription/payment-history` | User payment history |

Important admin routes:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/admin/dashboard` | Analytics/statistics |
| GET | `/api/admin/users` | Paginated users |
| GET | `/api/admin/users/{user}` | Full user detail |
| PUT | `/api/admin/users/{user}` | Update user |
| DELETE | `/api/admin/users/{user}` | Delete non-admin user |
| GET | `/api/admin/notes` | All notes |
| DELETE | `/api/admin/notes/{note}` | Delete any note |
| GET | `/api/admin/payments` | Payment records |
| GET | `/api/admin/plans` | Subscription plans |
| POST | `/api/admin/plans` | Create plan |
| PUT | `/api/admin/plans/{plan}` | Update plan |
| DELETE | `/api/admin/plans/{plan}` | Soft-disable plan |
| GET | `/api/admin/settings` | Read settings |
| PUT | `/api/admin/settings` | Update settings |
| POST | `/api/admin/settings/smtp/test` | Send SMTP test email |
| GET | `/api/admin/shared-notes` | All shared notes |
| GET | `/api/admin/friendships` | All friendships |
| GET | `/api/admin/activity-logs` | Activity logs |

### 6.2 `AuthController.php`

Responsible for accounts and profile.

Methods:

| Method | What It Does |
| --- | --- |
| `register` | Validates name, username, email, and confirmed password. Creates a user, optionally marks email verified, creates Sanctum token, returns user and token. |
| `login` | Accepts `login` and `password`. The `login` value can be username or email. Checks password using Laravel Hash. Blocks inactive users. Returns token. |
| `logout` | Deletes the current Sanctum token. |
| `me` | Returns authenticated user plus counts: notes, friends, shared notes, files, storage used, storage limit. |
| `updateProfile` | Updates name and/or username with validation. |
| `changePassword` | Checks current password and saves new hashed password. |

Teacher explanation:

Passwords are never stored as plain text. Laravel hashes them. After login, the frontend stores the Sanctum token and sends it in the `Authorization` header for future API requests.

### 6.3 `NoteController.php`

Responsible for creating, reading, updating, deleting, archiving, pinning, sharing by code, versions, and AI summaries.

Methods:

| Method | What It Does |
| --- | --- |
| `index` | Lists active non-trashed and non-archived notes for current user. Supports `search`, `color`, and pagination. |
| `store` | Creates a note. Saves `plain_text` by stripping HTML from content. Creates first `NoteVersion`. |
| `show` | Checks `canView`. Loads shares, files, and owner. Returns permission as `owner`, `view`, `edit`, or `none`. |
| `update` | Checks `canEdit`. Updates title/content/color/pin/archive. Creates a new `NoteVersion` if content changes. |
| `destroy` | Owner-only soft delete: sets `is_trashed` and `trashed_at`. |
| `restore` | Owner-only restore from trash. |
| `permanentDelete` | Owner-only delete from database. |
| `togglePin` | Owner-only pin/unpin. |
| `toggleArchive` | Owner-only archive/unarchive. |
| `archived` | Lists archived notes. |
| `trashed` | Lists trashed notes. |
| `versions` | Lists note versions if user can view. |
| `getShareCode` | Returns existing code or generates one. |
| `regenerateShareCode` | Replaces old share code with a new unique code. |
| `redeemShareCode` | Accepts 8-character code. Creates a `note_shares` row with `view` permission. |
| `aiSummary` | Sends note plain text to `DeepSeekService`, saves returned summary. |

Permission logic is in the `Note` model:

- Owner can view and edit.
- Shared users can view.
- Shared users can edit only if `note_shares.permission = edit`.

### 6.4 `NoteShareController.php`

Responsible for friend-based note sharing.

Methods:

| Method | What It Does |
| --- | --- |
| `sharedWithMe` | Lists notes shared with current user. |
| `share` | Owner shares a note with another user. Requires the target user to be a friend. Permission must be `view` or `edit`. |
| `updatePermission` | Owner changes collaborator permission. |
| `unshare` | Owner removes collaborator. |
| `collaborators` | Lists users who have access to the note. |

Teacher explanation:

The app uses a pivot table called `note_shares` to connect notes and users. This is how one note can be shared with many users.

### 6.5 `FriendController.php`

Responsible for friend requests.

Methods:

| Method | What It Does |
| --- | --- |
| `index` | Returns accepted friends for current user. |
| `pendingRequests` | Returns received and sent pending requests. |
| `sendRequest` | Sends request by username. Prevents self-add, duplicate request, and duplicate friendship. |
| `acceptRequest` | Receiver accepts pending request. |
| `rejectRequest` | Receiver rejects request. |
| `removeFriend` | Deletes accepted friendship between two users. |
| `searchUsers` | Searches active users by username or name. |

Friendship is stored with:

- `sender_id`
- `receiver_id`
- `status`: `pending`, `accepted`, `rejected`, or `blocked`

### 6.6 `FileController.php`

Responsible for file upload, download, and delete.

Methods:

| Method | What It Does |
| --- | --- |
| `index` | Lists current user's files. |
| `upload` | Validates file size up to 50 MB. Optionally attaches file to a note. Checks note edit permission and user storage limit. Uploads through `R2StorageService`. |
| `download` | Allows owner or note viewers to download. Returns temporary URL. |
| `serve` | Serves local signed file content. |
| `destroy` | Owner-only delete. Also decreases `storage_used`. |

Important behavior:

If Cloudflare R2 credentials are configured, files use the `r2` disk. If not, the project falls back to Laravel public local storage. This makes the project easier to demo locally.

### 6.7 `SubscriptionController.php`

Responsible for plans, payments, and subscriptions.

Methods:

| Method | What It Does |
| --- | --- |
| `plans` | Returns active subscription plans. |
| `mySubscription` | Returns premium status, active subscription, and storage use. |
| `subscribe` | Starts API Nepal payment for selected plan. Creates pending `payments` row. |
| `handleIPN` | Receives payment callback. Validates signature. Marks payment success/failed. Creates subscription on success. |
| `paymentHistory` | Lists user's payment records. |

Payment validation:

`ApiNepalPaymentService` builds an HMAC SHA-256 signature using amount plus identifier and the secret key. The backend only activates premium if the callback signature matches.

### 6.8 `AdminController.php`

Responsible for the admin panel.

Methods:

| Method | What It Does |
| --- | --- |
| `dashboard` | Returns total users, premium users, notes, shared notes, friendships, files, storage, revenue, monthly users, monthly revenue, and chart data. |
| `users` | Lists users with filters for search, premium, and role. |
| `userDetail` | Shows user with notes, files, payments, subscriptions, friends, shared notes, and activity. |
| `updateUser` | Admin can update profile, role, active status, premium status, and storage limit. |
| `deleteUser` | Deletes non-admin user. |
| `notes` | Lists all notes. |
| `deleteNote` | Deletes any note. |
| `payments` | Lists payments with optional status filter. |
| `plans` | Lists subscription plans. |
| `createPlan` | Creates plan. |
| `updatePlan` | Updates plan. |
| `deletePlan` | Sets `is_active` false instead of deleting. |
| `getSettings` | Reads settings, optionally by group. |
| `updateSettings` | Saves key-value settings. |
| `testSmtp` | Sends a test email using current mail config. |
| `sharedNotes` | Lists all note sharing records. |
| `friendships` | Lists all friendships. |
| `activityLogs` | Lists activity logs. |

### 6.9 Middleware

`IsAdmin.php`

- Checks if request has a logged-in user.
- Calls `$request->user()->isAdmin()`.
- If false, returns HTTP 403.

`IsPremium.php`

- Checks if request has a logged-in user.
- Calls `$request->user()->isPremium()`.
- If false, returns HTTP 403.
- This middleware is registered but not currently used on routes.

### 6.10 Services

`DeepSeekService.php`

- Reads `deepseek_api_key` from `site_settings`.
- Calls `https://api.deepseek.com/chat/completions`.
- Uses model `deepseek-chat`.
- Asks for a concise 2-4 sentence summary.
- Returns summary text or `null`.

`R2StorageService.php`

- Uploads files either to Cloudflare R2 or local public disk.
- Generates unique stored filename using UUID.
- Stores local files with an internal `local:` key prefix.
- Generates public or temporary signed URLs.
- Deletes files.
- Downloads files through Laravel response.

`ApiNepalPaymentService.php`

- Reads API Nepal public key, secret key, and mode from `site_settings` or config.
- Initiates payment using test or live API Nepal URL.
- Builds callback, success, and cancel URLs.
- Validates IPN callback signatures.
- Can also check payment status by transaction number.

### 6.11 Models

`User.php`

- Represents `users`.
- Uses Sanctum API tokens.
- Relationships: notes, files, payments, subscriptions, activity logs, sent/received friend requests, shared notes, active subscription.
- Helper methods:
  - `isAdmin()`
  - `isPremium()`
  - `hasStorageSpace($bytes)`
  - `friends()`
  - `isFriendWith($user)`

`Note.php`

- Represents `notes`.
- Auto-generates a unique 8-character share code when creating.
- Relationships: owner user, shares, files, versions, shared users.
- Permission helpers:
  - `canView($user)`
  - `canEdit($user)`

`Friendship.php`

- Represents friend request/friendship records.
- Links sender and receiver users.

`NoteShare.php`

- Represents note sharing permission.
- Links note, sharer, and recipient.

`File.php`

- Represents uploaded file metadata.
- Links file to user and optionally to note.

`Payment.php`

- Represents API Nepal payment transaction.
- Casts `gateway_response` JSON to array.
- Links user and subscription plan.

`Subscription.php`

- Represents active/past subscription.
- Links user, plan, and payment.
- Casts start/end dates and `is_active`.

`SubscriptionPlan.php`

- Represents premium plan.
- Includes price, currency, duration, storage limit, file sharing flag, and active flag.

`SiteSetting.php`

- Key-value settings table.
- Has helpers:
  - `get($key, $default)`
  - `set($key, $value, $type, $group)`
- Converts boolean, integer, and JSON values.

`NoteVersion.php`

- Stores edit history for a note.
- Each update to content creates a new version.

`ActivityLog.php`

- Intended to store user actions for admin analytics.
- Has fields for user, action, subject, and metadata.

## 7. Database Documentation

The database is designed using Laravel migrations, so it can be created with `php artisan migrate`.

Important note:

- The actual local `.env` used by this copy appears to point to MySQL on `127.0.0.1:3304` with database `notexa`.
- The project also contains `database/database.sqlite` and `.env.example` uses SQLite.
- For presentation, explain that Laravel migrations define the schema, and the app can run on MySQL for production/demo or SQLite for local simple setup depending on `.env`.

### 7.1 Entity Relationship Summary

```text
users 1--many notes
users 1--many files
users 1--many payments
users 1--many subscriptions
users 1--many activity_logs

users many--many users through friendships
notes many--many users through note_shares

notes 1--many files
notes 1--many note_versions
subscription_plans 1--many payments
subscription_plans 1--many subscriptions
payments 1--1 subscriptions
```

### 7.2 `users`

Stores registered accounts.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `name` | string | Full name |
| `username` | string unique | Unique username used for login/friend requests |
| `email` | string unique | Email address |
| `email_verified_at` | timestamp nullable | Email verification time |
| `password` | string | Hashed password |
| `avatar` | string nullable | Avatar path/URL |
| `role` | enum | `user` or `admin` |
| `is_premium` | boolean | Premium status |
| `premium_expires_at` | timestamp nullable | Premium expiry |
| `storage_used` | big integer | Used storage in bytes |
| `storage_limit` | big integer | Storage limit in bytes, default 50 MB |
| `is_active` | boolean | Admin can deactivate account |
| `remember_token` | string nullable | Laravel remember token |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

### 7.3 `password_reset_tokens`

Default Laravel password reset table.

| Column | Type | Purpose |
| --- | --- | --- |
| `email` | string primary | User email |
| `token` | string | Reset token |
| `created_at` | timestamp nullable | Token creation time |

### 7.4 `personal_access_tokens`

Sanctum token table.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `tokenable_type`, `tokenable_id` | morphs | Owner model, normally User |
| `name` | string | Token name |
| `token` | string unique | Hashed API token |
| `abilities` | text nullable | Token abilities |
| `last_used_at` | timestamp nullable | Last token use |
| `expires_at` | timestamp nullable | Expiration |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

### 7.5 `notes`

Stores user notes.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `user_id` | foreign key | Owner user |
| `title` | string | Note title |
| `content` | long text nullable | HTML content from TipTap or Flutter editor |
| `plain_text` | text nullable | Searchable stripped text |
| `color` | string(7) | Hex note color |
| `is_pinned` | boolean | Whether note is pinned |
| `is_archived` | boolean | Whether note is archived |
| `is_trashed` | boolean | Soft trash flag |
| `share_code` | string unique nullable | Share code |
| `ai_summary` | text nullable | DeepSeek summary |
| `trashed_at` | timestamp nullable | Trash time |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

Index:

- `user_id`, `is_trashed`, `is_archived` for faster user note listing.

### 7.6 `friendships`

Stores friend requests and accepted friends.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `sender_id` | foreign key users | Request sender |
| `receiver_id` | foreign key users | Request receiver |
| `status` | enum | `pending`, `accepted`, `rejected`, `blocked` |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

Unique constraint:

- `sender_id`, `receiver_id`

### 7.7 `note_shares`

Stores note collaboration permission.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `note_id` | foreign key notes | Shared note |
| `shared_by` | foreign key users | Owner/sharer |
| `shared_with` | foreign key users | Recipient |
| `permission` | enum | `view` or `edit` |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

Unique constraint:

- `note_id`, `shared_with`

This prevents duplicate sharing rows for the same user and note.

### 7.8 `files`

Stores uploaded file metadata.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `user_id` | foreign key users | Uploader |
| `note_id` | nullable foreign key notes | Attached note |
| `original_name` | string | Original filename |
| `stored_name` | string | UUID-based stored filename |
| `path` | string | Storage path |
| `mime_type` | string | File MIME type |
| `size` | big integer | File size in bytes |
| `r2_key` | string | R2 key or local key |
| `r2_url` | string nullable | Public/temporary URL |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

### 7.9 `subscription_plans`

Stores premium plan options.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `name` | string | Plan name |
| `description` | text nullable | Plan description |
| `price` | decimal(10,2) | Price |
| `currency` | string(4) | Usually NPR |
| `duration_days` | integer | Subscription length |
| `storage_limit` | big integer | Storage limit in bytes |
| `file_sharing_enabled` | boolean | File sharing allowed |
| `is_active` | boolean | Plan visible/usable |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

### 7.10 `payments`

Stores payment transactions.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `user_id` | foreign key users | Paying user |
| `plan_id` | foreign key subscription_plans | Purchased plan |
| `identifier` | string unique | API Nepal identifier |
| `trx_number` | string nullable | Gateway transaction number |
| `amount` | decimal(10,2) | Paid amount |
| `currency` | string(4) | Currency |
| `status` | enum | `pending`, `success`, `failed`, `cancelled` |
| `gateway_response` | json nullable | Raw gateway response |
| `payment_method` | string nullable | Payment method |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

### 7.11 `subscriptions`

Stores premium subscriptions.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `user_id` | foreign key users | Subscriber |
| `plan_id` | foreign key subscription_plans | Plan |
| `payment_id` | foreign key payments | Payment |
| `starts_at` | timestamp | Start date |
| `expires_at` | timestamp | End date |
| `is_active` | boolean | Active subscription flag |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

### 7.12 `site_settings`

Stores admin-configurable settings.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `key` | string unique | Setting name |
| `value` | long text nullable | Setting value |
| `type` | string | `string`, `boolean`, `integer`, `json`, `text`, etc. |
| `group` | string | `general`, `smtp`, `payment`, `storage`, `ai`, etc. |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

Examples from seeder:

- `site_name`
- `site_description`
- `email_verification_enabled`
- `apinepal_public_key`
- `apinepal_secret_key`
- `r2_access_key`
- `r2_bucket`
- `deepseek_api_key`
- `ai_enabled`

### 7.13 `note_versions`

Stores edit history.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `note_id` | foreign key notes | Note |
| `user_id` | foreign key users | Editor |
| `content` | long text | Version content |
| `version_number` | integer | Sequential version number |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

Index:

- `note_id`, `version_number`

### 7.14 `activity_logs`

Stores action logs.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | big integer | Primary key |
| `user_id` | foreign key users | User who did action |
| `action` | string | Action name |
| `subject_type` | string nullable | Related model type |
| `subject_id` | unsigned big integer nullable | Related model ID |
| `metadata` | json nullable | Extra data |
| `created_at`, `updated_at` | timestamps | Laravel timestamps |

### 7.15 `sessions`

Laravel session table.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | string primary | Session ID |
| `user_id` | foreign key nullable | User |
| `ip_address` | string nullable | IP |
| `user_agent` | text nullable | Browser/device |
| `payload` | long text | Session data |
| `last_activity` | integer | Timestamp for last activity |

## 8. Seeder Documentation

`database/seeders/DatabaseSeeder.php` creates initial project data.

Created admin:

```text
Name: Admin
Username: admin
Email: admin@notexa.com
Password: password123
Role: admin
```

Created plans:

| Plan | Price | Duration | Storage |
| --- | --- | --- | --- |
| Premium Monthly | NPR 199 | 30 days | 5 GB |
| Premium Yearly | NPR 1899 | 365 days | 5 GB |

Created settings:

- General site name, logo, description, about page.
- Email verification and SMTP settings.
- Privacy policy and terms content.
- API Nepal payment settings.
- Cloudflare R2 storage settings.
- DeepSeek AI settings.

## 9. Next.js Frontend Documentation

### 9.1 Frontend Folder Structure

```text
frontend
  src/
    app/
      page.tsx
      about/page.tsx
      auth/login/page.tsx
      auth/register/page.tsx
      dashboard/layout.tsx
      dashboard/notes/page.tsx
      dashboard/notes/[id]/page.tsx
      dashboard/shared/page.tsx
      dashboard/friends/page.tsx
      dashboard/files/page.tsx
      dashboard/subscription/page.tsx
      dashboard/settings/page.tsx
      admin/layout.tsx
      admin/dashboard/page.tsx
      admin/users/page.tsx
      admin/notes/page.tsx
      admin/payments/page.tsx
      admin/settings/page.tsx
      globals.css
      layout.tsx
    components/
      editor/NoteEditor.tsx
      layout/AuthProvider.tsx
      layout/Header.tsx
      layout/Footer.tsx
    contexts/
      authStore.ts
    services/
      api.ts
```

### 9.2 `src/services/api.ts`

This is the central API client for the web frontend.

Important features:

- Uses Axios.
- Base URL comes from `NEXT_PUBLIC_API_URL`.
- Default value is `http://localhost:8000/api`.
- Adds JSON headers.
- Adds `Authorization: Bearer <token>` from `localStorage`.
- If a protected request returns 401, it removes local auth and redirects to `/auth/login`.

It exports grouped API objects:

| Export | Purpose |
| --- | --- |
| `authApi` | Register, login, logout, profile, password |
| `notesApi` | Notes CRUD, trash, archive, pin, versions, share code, AI, collaborators |
| `friendsApi` | Friends list, requests, accept/reject/remove/search |
| `filesApi` | File list/upload/download/delete |
| `subscriptionApi` | Plans, my subscription, subscribe, payment history |
| `adminApi` | Admin dashboard/users/notes/payments/plans/settings/logs |
| `publicApi` | Public settings |

### 9.3 `src/contexts/authStore.ts`

Uses Zustand for web auth state.

State:

- `user`
- `stats`
- `token`
- `isLoading`
- `isAuthenticated`

Actions:

| Action | Purpose |
| --- | --- |
| `setAuth(user, token)` | Save token/user in localStorage and update state |
| `setUser(user)` | Update user after profile changes |
| `fetchMe()` | Calls `/me` to refresh user and stats |
| `logout()` | Calls `/logout`, clears localStorage |
| `initialize()` | Reads token/user from localStorage when app starts |

Teacher explanation:

Because browser refresh clears React memory, the token is saved in localStorage. On app startup, `AuthProvider` calls `initialize()` to restore login state.

### 9.4 Layout and Shared Components

`src/app/layout.tsx`

- Root layout for the web app.
- Loads global CSS and Google fonts.
- Wraps the app with `AuthProvider`.
- Adds `react-hot-toast` toaster.

`src/components/layout/AuthProvider.tsx`

- Client component.
- Runs `initialize()` from Zustand once after page load.

`src/components/layout/Header.tsx`

- Landing page navigation.
- Shows dashboard button if logged in.
- Shows login/register if not logged in.
- Has mobile menu.

`src/components/layout/Footer.tsx`

- Site footer with product/legal links.

`src/components/editor/NoteEditor.tsx`

- TipTap rich text editor.
- Extensions include:
  - StarterKit
  - Placeholder
  - Highlight
  - TaskList and TaskItem
  - Image
  - Link
  - Underline
  - TextAlign
- Emits HTML through `onChange`.
- Supports bold, italic, underline, strike, highlight, headings, bullet list, ordered list, task list, quote, inline code, code block, divider, alignment, image URL, link URL, undo, and redo.
- Can be readonly using `editable={false}`.

### 9.5 Web Pages

| File | Route | Purpose |
| --- | --- | --- |
| `src/app/page.tsx` | `/` | Landing page with project marketing, features, pricing, CTA |
| `src/app/about/page.tsx` | `/about` | About/team/project info |
| `src/app/auth/login/page.tsx` | `/auth/login` | Login form |
| `src/app/auth/register/page.tsx` | `/auth/register` | Register form |
| `src/app/dashboard/layout.tsx` | `/dashboard/*` | Protected user layout with sidebar and redeem share code modal |
| `src/app/dashboard/notes/page.tsx` | `/dashboard/notes` | User notes list, search, create, pin/archive/trash |
| `src/app/dashboard/notes/[id]/page.tsx` | `/dashboard/notes/:id` | Full note editor, autosave, share, AI summary, files |
| `src/app/dashboard/shared/page.tsx` | `/dashboard/shared` | Notes shared with current user |
| `src/app/dashboard/friends/page.tsx` | `/dashboard/friends` | Friend list and requests |
| `src/app/dashboard/files/page.tsx` | `/dashboard/files` | File manager |
| `src/app/dashboard/subscription/page.tsx` | `/dashboard/subscription` | Premium plans, current subscription, payment history |
| `src/app/dashboard/settings/page.tsx` | `/dashboard/settings` | Profile and password update |
| `src/app/admin/layout.tsx` | `/admin/*` | Admin-only layout |
| `src/app/admin/dashboard/page.tsx` | `/admin/dashboard` | Admin analytics cards/charts data |
| `src/app/admin/users/page.tsx` | `/admin/users` | User management and user detail modal |
| `src/app/admin/notes/page.tsx` | `/admin/notes` | Admin note listing and delete |
| `src/app/admin/payments/page.tsx` | `/admin/payments` | Payment records and status filter |
| `src/app/admin/settings/page.tsx` | `/admin/settings` | General, SMTP, payment, storage, AI settings |

### 9.6 Important Web Flows

Login:

```text
LoginPage form
  -> authApi.login()
  -> Laravel /api/login
  -> useAuthStore.setAuth(user, token)
  -> localStorage notexa_token and notexa_user
  -> redirect to /dashboard/notes
```

Create note:

```text
NotesPage create modal
  -> notesApi.create({ title, color })
  -> Laravel creates note and version
  -> redirect to /dashboard/notes/{id}
```

Edit note:

```text
NoteDetailPage loads note with notesApi.get(id)
  -> NoteEditor returns HTML on every change
  -> autosave calls notesApi.update(id, { title, content })
  -> Laravel checks canEdit()
  -> Laravel saves content and version
```

Share with friend:

```text
Open share modal
  -> friendsApi.list()
  -> notesApi.collaborators(noteId)
  -> notesApi.getShareCode(noteId)
  -> owner selects friend and permission
  -> notesApi.share(noteId, { user_id, permission })
```

Redeem code:

```text
Dashboard sidebar modal
  -> user enters 8-character code
  -> notesApi.redeemCode(code)
  -> Laravel creates note_shares row
```

File upload:

```text
File input selection
  -> filesApi.upload(file, optional noteId)
  -> Axios sends multipart/form-data
  -> Laravel checks storage and permission
  -> R2/local storage receives file
```

Admin settings:

```text
Admin settings page
  -> adminApi.getSettings()
  -> admin edits values
  -> adminApi.updateSettings(settings array)
  -> Laravel stores key-value records in site_settings
```

## 10. Flutter App Documentation

### 10.1 Flutter Folder Structure

```text
notexa_app
  lib/
    main.dart
    services/
      api_service.dart
      auth_service.dart
      error_handler.dart
      local_storage.dart
    screens/
      auth/
        login_screen.dart
        register_screen.dart
      dashboard/
        dashboard_screen.dart
      notes/
        notes_list_screen.dart
        note_editor_screen.dart
      shared/
        shared_screen.dart
      friends/
        friends_screen.dart
      files/
        files_screen.dart
        pdf_viewer_screen.dart
      settings/
        settings_screen.dart
```

### 10.2 `main.dart`

Main Flutter entry point.

Important features:

- Uses `runZonedGuarded` for crash/error handling.
- Calls `WidgetsFlutterBinding.ensureInitialized()`.
- Installs `AppErrorHandler`.
- Wraps the app in `ChangeNotifierProvider(create: (_) => AuthService())`.
- Uses Material 3 theme.
- Uses Google Fonts Outfit.
- Uses `DashboardScreen` as home.

Teacher explanation:

Flutter uses widgets. The whole app starts from `main()`, creates a provider for authentication, then shows the dashboard. Depending on auth state, the dashboard shows either logged-in screens or limited screens.

### 10.3 `services/api_service.dart`

Central HTTP client for Flutter.

Base URL:

```text
http://127.0.0.1:8000/api
```

Important features:

- Stores token in SharedPreferences under `notexa_token`.
- Adds JSON headers.
- Adds Bearer token for protected requests.
- Supports:
  - `get`
  - `post`
  - `put`
  - `delete`
  - `patch`
  - `uploadFile`
- Converts server errors into `ApiException`.
- Handles timeout, invalid response, network error, validation errors.

### 10.4 `services/auth_service.dart`

Flutter auth state manager using `ChangeNotifier`.

State:

- `_user`
- `_stats`
- `_isLoading`
- `_isAuthenticated`

Methods:

| Method | Purpose |
| --- | --- |
| `_initialize` | Reads token/user from SharedPreferences when app opens |
| `register` | Calls `/register`, saves token/user |
| `login` | Calls `/login`, saves token/user |
| `logout` | Calls `/logout`, clears token/user |
| `fetchMe` | Calls `/me`, refreshes profile/stats |
| `updateProfile` | Calls `/profile`, saves updated user |

### 10.5 `services/local_storage.dart`

Provides offline/local note storage.

Important features:

- Stores notes in SharedPreferences key `notexa_local_notes`.
- Local draft IDs are negative numbers.
- Saves dirty notes with `_dirty = true`.
- Saves sync action as `_sync_action = create` or `update`.
- Converts HTML to plain text for local search.
- Syncs dirty notes to Laravel when online.
- Uploads local attachments after syncing note.
- Merges cloud notes with local dirty notes.

Teacher explanation:

This is why Flutter can create and edit drafts even when the backend is temporarily unavailable. Local notes are later synced to the server.

### 10.6 `services/error_handler.dart`

Central Flutter error handling.

Important features:

- Sets `FlutterError.onError`.
- Handles platform dispatcher errors.
- Shows SnackBar messages.
- Shows AlertDialog when needed.
- Converts technical errors into user-friendly messages.

### 10.7 Flutter Screens

| File | Purpose |
| --- | --- |
| `login_screen.dart` | Login form using `AuthService.login`, then navigates to dashboard |
| `register_screen.dart` | Registration form using `AuthService.register`, then navigates to dashboard |
| `dashboard_screen.dart` | Bottom navigation. Logged-in users see Notes, Shared, Friends, Files, Settings. Guests see Notes and Cloud/Settings flow. |
| `notes_list_screen.dart` | Lists notes, searches notes, creates note, redeems share code, uploads files, opens editor |
| `note_editor_screen.dart` | Mobile note editor with save, local draft handling, pin/color, AI summary, attachment upload, PDF preview, share sheet, collaborator management |
| `shared_screen.dart` | Lists notes shared with the user and opens editor |
| `friends_screen.dart` | Lists friends, pending requests, sends requests, accepts/rejects/removes friends |
| `files_screen.dart` | Lists files, uploads file, downloads/opens file, deletes file |
| `pdf_viewer_screen.dart` | Opens local or network PDF using Syncfusion PDF Viewer |
| `settings_screen.dart` | Shows profile/login/register actions and changes password |

### 10.8 Flutter Data Flow

Login:

```text
LoginScreen
  -> AuthService.login()
  -> ApiService.post('/login')
  -> Laravel returns token/user
  -> token saved to SharedPreferences
  -> DashboardScreen shown
```

Load notes:

```text
NotesListScreen
  -> ApiService.get('/notes')
  -> LocalNoteStorage.syncFromCloud()
  -> local and cloud notes displayed
```

Offline draft:

```text
User creates note while offline
  -> LocalNoteStorage.createDraft()
  -> note saved with negative local ID and _dirty true
  -> later LocalNoteStorage.syncDirtyNotes()
  -> creates note on Laravel
  -> replaces local negative ID with server ID
```

Attach file:

```text
User picks file
  -> if note exists on server, ApiService.uploadFile('/files/upload', path, noteId)
  -> if note is local draft, file path is stored locally
  -> after note sync, local file uploads with server note ID
```

## 11. Authentication and Authorization

Authentication means "Who are you?"

Authorization means "What are you allowed to do?"

### Authentication

Notexa uses Laravel Sanctum token authentication.

Register/login returns:

```json
{
  "status": "success",
  "user": {},
  "token": "token string"
}
```

Frontend/mobile then send:

```text
Authorization: Bearer <token>
```

Laravel Sanctum finds the user from the token and makes it available as:

```php
$request->user()
```

### Authorization

Authorization checks happen in:

- Middleware:
  - `is_admin`
  - `is_premium`
- Model methods:
  - `Note::canView($user)`
  - `Note::canEdit($user)`
  - `User::isFriendWith($user)`
- Controller checks:
  - Owner-only actions check `note.user_id === current user id`.

Examples:

- Only admin users can access `/api/admin/*`.
- Only note owners can delete/regenerate share codes.
- Shared users with `view` can open a note but cannot edit.
- Shared users with `edit` can update note content.
- Notes can only be shared directly with accepted friends.

## 12. Important Feature Workflows

### 12.1 Note Creation

```text
Frontend/mobile sends title, content, color.
Laravel validates input.
Laravel creates notes row.
Note model auto-generates share_code.
Laravel creates note_versions row version 1.
Response returns created note.
```

### 12.2 Note Editing

```text
User edits note.
Frontend/mobile sends PUT /api/notes/{id}.
Laravel checks canEdit().
Laravel updates title/content/color.
Laravel updates plain_text if content changed.
Laravel creates next note_versions row.
```

### 12.3 Trash and Restore

Delete does not immediately remove the row. It sets:

```text
is_trashed = true
trashed_at = current time
```

Restore sets:

```text
is_trashed = false
trashed_at = null
```

Permanent delete removes the row.

### 12.4 Share Code

Every note has a unique share code generated by `Note::generateUniqueShareCode()`.

Flow:

```text
Owner gets code.
Recipient enters code.
Laravel finds note by share_code.
Laravel prevents owner redeeming own note.
Laravel prevents duplicate sharing.
Laravel creates note_shares row with view permission.
```

### 12.5 Friend-Based Sharing

```text
Owner selects friend.
Owner selects permission view/edit.
Laravel checks the target user is accepted friend.
Laravel creates or updates note_shares row.
```

### 12.6 AI Summary

```text
User clicks AI summary.
Laravel reads note plain_text.
If text is too short, returns error.
DeepSeekService reads deepseek_api_key from site_settings.
Laravel sends prompt to DeepSeek API.
Summary is saved in notes.ai_summary.
Summary is returned to frontend/mobile.
```

### 12.7 File Upload

```text
User picks file.
Frontend/mobile sends multipart/form-data to /api/files/upload.
Laravel validates file and optional note_id.
Laravel checks note edit permission if attached to note.
Laravel checks storage limit.
R2StorageService stores file in R2 or local public disk.
files row is created.
users.storage_used is increased.
```

### 12.8 Subscription Payment

```text
User chooses plan.
Laravel creates API Nepal initiate request.
Gateway returns redirect_url.
Frontend redirects user to payment page.
API Nepal calls /api/subscription/ipn after payment.
Laravel validates HMAC signature.
If success:
  payment.status = success
  old active subscriptions disabled
  new subscription created
  user.is_premium = true
  user.storage_limit = plan.storage_limit
If failed:
  payment.status = failed
```

## 13. Environment and Run Instructions

### 13.1 Backend

From:

```text
backend/notexa
```

Install dependencies:

```bash
composer install
```

Create environment:

```bash
copy .env.example .env
php artisan key:generate
```

Choose database in `.env`.

For SQLite:

```text
DB_CONNECTION=sqlite
```

For MySQL:

```text
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=notexa
DB_USERNAME=your_user
DB_PASSWORD=your_password
```

Run migrations and seed data:

```bash
php artisan migrate --seed
```

Start API:

```bash
php artisan serve
```

Expected backend URL:

```text
http://localhost:8000
```

### 13.2 Next.js Frontend

From:

```text
frontend
```

Install dependencies:

```bash
npm install
```

Set `.env.local`:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Start dev server:

```bash
npm run dev
```

Expected frontend URL:

```text
http://localhost:3000
```

### 13.3 Flutter App

From:

```text
notexa_app
```

Install dependencies:

```bash
flutter pub get
```

Run app:

```bash
flutter run
```

Important:

`ApiService.baseUrl` is currently:

```text
http://127.0.0.1:8000/api
```

For Android emulator, if needed, this often becomes:

```text
http://10.0.2.2:8000/api
```

For a real phone, use your computer LAN IP, for example:

```text
http://192.168.1.5:8000/api
```

## 14. How To Explain The Project To Teacher

Short explanation:

Notexa is a collaborative note-taking application. We built one Laravel REST API backend and connected it to two clients: a Next.js web app and a Flutter app. The backend manages users, notes, sharing, friends, files, subscriptions, payments, AI summaries, and admin settings. The database stores all permanent information, and both clients communicate with the backend using JSON API requests.

More technical explanation:

The project follows a REST API architecture. Laravel works as the server and exposes endpoints like `/api/login`, `/api/notes`, `/api/friends`, and `/api/files/upload`. The Next.js frontend uses Axios to call those endpoints, and the Flutter app uses the Dart `http` package. Laravel Sanctum provides token-based authentication. Eloquent ORM maps PHP models like `User`, `Note`, and `File` to database tables. Admin functionality is protected by custom middleware named `is_admin`.

Database explanation:

The database schema is managed through Laravel migrations. Important tables are `users`, `notes`, `friendships`, `note_shares`, `files`, `payments`, `subscriptions`, `subscription_plans`, `site_settings`, and `note_versions`. Relationships are handled with foreign keys and Eloquent relationships. For example, one user has many notes, and notes can be shared with many users through `note_shares`.

Security explanation:

The project uses hashed passwords, Sanctum tokens, protected routes, controller validation, Eloquent ORM, and permission checks. Users cannot access another user's private notes because `Note::canView()` and `Note::canEdit()` are checked before showing or updating notes.

## 15. Suggested Demo Flow

1. Start backend with `php artisan serve`.
2. Start frontend with `npm run dev`.
3. Open the web app.
4. Register a normal user.
5. Create a note.
6. Edit note using rich text editor.
7. Show auto-save.
8. Show share code.
9. Register/login as another user.
10. Redeem share code.
11. Add friend by username.
12. Share note with friend using view/edit permission.
13. Upload a file.
14. Generate AI summary if DeepSeek key is configured.
15. Login as admin.
16. Show dashboard analytics, users, notes, payments, and settings.
17. Open Flutter app and show it uses the same backend data.

## 16. Common Viva Questions and Answers

### Q1. What is the main objective of Notexa?

To provide a collaborative note-taking system where users can create notes, share with friends or share codes, upload files, and manage notes from both web and mobile apps.

### Q2. Why did you use Laravel?

Laravel provides routing, controllers, validation, Eloquent ORM, migrations, middleware, and Sanctum authentication. These features make it suitable for building a secure REST API quickly.

### Q3. Why did you use Next.js?

Next.js is a React framework. It gives a structured file-based routing system, reusable components, TypeScript support, and good performance for web applications.

### Q4. Why did you use Flutter?

Flutter lets us build a mobile app from one Dart codebase. The same app can run on Android, iOS, desktop, and web with platform-specific builds.

### Q5. What is REST API?

REST API is a way for clients to communicate with a server using HTTP methods like GET, POST, PUT, PATCH, and DELETE. In Notexa, both the web frontend and Flutter app call Laravel REST endpoints.

### Q6. How does login work?

The user sends username/email and password to `/api/login`. Laravel checks the password hash. If valid, Sanctum creates a token. The frontend stores the token and sends it in future requests.

### Q7. How do you protect routes?

User routes use `auth:sanctum`. Admin routes use `auth:sanctum` plus `is_admin`. Note access also checks owner/share permissions.

### Q8. How do users share notes?

There are two ways. First, a note owner can share directly with an accepted friend using `note_shares`. Second, a user can redeem a unique 8-character share code.

### Q9. How is rich text saved?

The editor produces HTML content. Laravel saves that HTML in `notes.content` and also saves stripped plain text in `notes.plain_text` for searching.

### Q10. How does version history work?

When a note is created, version 1 is saved in `note_versions`. When content is updated, a new version number is created.

### Q11. How does file upload work?

The frontend/mobile sends multipart form data. Laravel validates the file, checks storage limits, stores the file using R2 or local storage, creates a `files` row, and increases `users.storage_used`.

### Q12. How does AI summary work?

Laravel sends note text to the DeepSeek API using `DeepSeekService`. The response summary is saved in the `ai_summary` column and returned to the frontend.

### Q13. How does payment work?

A user selects a plan. Laravel asks API Nepal to create a payment. After payment, API Nepal calls the IPN endpoint. Laravel validates the signature and activates subscription if successful.

### Q14. What is Eloquent ORM?

Eloquent maps database tables to PHP classes. Instead of writing raw SQL, the project uses models like `User::create()` or `$user->notes()`.

### Q15. What is middleware?

Middleware runs before controllers. In this project, `is_admin` checks whether the logged-in user has admin role.

### Q16. What is the difference between authentication and authorization?

Authentication checks identity: who is logged in. Authorization checks permission: what that user can access or change.

### Q17. How does Flutter support offline drafts?

Flutter stores local notes in SharedPreferences using `LocalNoteStorage`. Dirty local notes are later synced to Laravel when possible.

### Q18. What are the main database relationships?

One user has many notes. Notes can be shared with many users through `note_shares`. Users can be friends with other users through `friendships`. Notes have many files and many versions.

### Q19. How can admin configure the project?

Admin settings are saved in `site_settings`. Admin can configure site information, SMTP, payment keys, R2 storage keys, and DeepSeek API key.

### Q20. What is the biggest technical achievement?

The project uses one Laravel API to support both a web app and a Flutter app, with token authentication, database relationships, sharing permissions, file uploads, subscription handling, and offline mobile drafts.

## 17. File-by-File Quick Reference

### Backend

| File | Role |
| --- | --- |
| `routes/api.php` | Defines all API routes |
| `bootstrap/app.php` | Registers routes and middleware aliases |
| `config/cors.php` | Allows frontend/mobile API access |
| `config/filesystems.php` | Defines local and Cloudflare R2 disks |
| `config/services.php` | Defines API Nepal keys |
| `app/Http/Controllers/Api/AuthController.php` | Auth/profile/password |
| `app/Http/Controllers/Api/NoteController.php` | Notes, versions, share codes, AI |
| `app/Http/Controllers/Api/NoteShareController.php` | Direct note sharing |
| `app/Http/Controllers/Api/FriendController.php` | Friends and requests |
| `app/Http/Controllers/Api/FileController.php` | Upload/download/delete files |
| `app/Http/Controllers/Api/SubscriptionController.php` | Plans, payments, subscriptions |
| `app/Http/Controllers/Admin/AdminController.php` | Admin panel API |
| `app/Http/Middleware/IsAdmin.php` | Admin-only route guard |
| `app/Http/Middleware/IsPremium.php` | Premium-only route guard |
| `app/Models/User.php` | User model and relationships |
| `app/Models/Note.php` | Note model and permissions |
| `app/Models/Friendship.php` | Friendship model |
| `app/Models/NoteShare.php` | Note share model |
| `app/Models/File.php` | File metadata model |
| `app/Models/Payment.php` | Payment model |
| `app/Models/Subscription.php` | Subscription model |
| `app/Models/SubscriptionPlan.php` | Plan model |
| `app/Models/SiteSetting.php` | Admin setting model |
| `app/Models/NoteVersion.php` | Note history model |
| `app/Models/ActivityLog.php` | Activity log model |
| `app/Services/DeepSeekService.php` | AI summary service |
| `app/Services/R2StorageService.php` | File storage service |
| `app/Services/ApiNepalPaymentService.php` | Payment gateway service |
| `database/migrations/*` | Database schema |
| `database/seeders/DatabaseSeeder.php` | Initial admin, plans, settings |

### Frontend

| File | Role |
| --- | --- |
| `src/services/api.ts` | Axios API client |
| `src/contexts/authStore.ts` | Zustand auth store |
| `src/components/layout/AuthProvider.tsx` | Initializes auth state |
| `src/components/layout/Header.tsx` | Public navigation |
| `src/components/layout/Footer.tsx` | Public footer |
| `src/components/editor/NoteEditor.tsx` | TipTap rich text editor |
| `src/app/layout.tsx` | Root web layout |
| `src/app/page.tsx` | Homepage |
| `src/app/about/page.tsx` | About page |
| `src/app/auth/login/page.tsx` | Login page |
| `src/app/auth/register/page.tsx` | Register page |
| `src/app/dashboard/layout.tsx` | User dashboard shell |
| `src/app/dashboard/notes/page.tsx` | Notes list |
| `src/app/dashboard/notes/[id]/page.tsx` | Note editor/detail |
| `src/app/dashboard/shared/page.tsx` | Shared notes |
| `src/app/dashboard/friends/page.tsx` | Friends |
| `src/app/dashboard/files/page.tsx` | Files |
| `src/app/dashboard/subscription/page.tsx` | Subscriptions |
| `src/app/dashboard/settings/page.tsx` | Profile/password |
| `src/app/admin/layout.tsx` | Admin shell |
| `src/app/admin/dashboard/page.tsx` | Admin dashboard |
| `src/app/admin/users/page.tsx` | Admin users |
| `src/app/admin/notes/page.tsx` | Admin notes |
| `src/app/admin/payments/page.tsx` | Admin payments |
| `src/app/admin/settings/page.tsx` | Admin settings |

### Flutter

| File | Role |
| --- | --- |
| `lib/main.dart` | Flutter entry point, theme, provider |
| `lib/services/api_service.dart` | HTTP API client |
| `lib/services/auth_service.dart` | Auth state |
| `lib/services/error_handler.dart` | Error handling |
| `lib/services/local_storage.dart` | Offline notes and sync |
| `lib/screens/auth/login_screen.dart` | Login UI |
| `lib/screens/auth/register_screen.dart` | Register UI |
| `lib/screens/dashboard/dashboard_screen.dart` | Bottom navigation |
| `lib/screens/notes/notes_list_screen.dart` | Notes list |
| `lib/screens/notes/note_editor_screen.dart` | Editor, sharing, AI, attachments |
| `lib/screens/shared/shared_screen.dart` | Shared notes |
| `lib/screens/friends/friends_screen.dart` | Friends and requests |
| `lib/screens/files/files_screen.dart` | File manager |
| `lib/screens/files/pdf_viewer_screen.dart` | PDF preview |
| `lib/screens/settings/settings_screen.dart` | Settings/password |

## 18. One-Minute Presentation Script

Good morning sir/ma'am. Our project is Notexa, a collaborative note-taking platform. It has a Laravel REST API backend, a Next.js web frontend, a Flutter app, and a relational database. Users can register, log in, create rich text notes, share notes with friends or share codes, upload files, generate AI summaries, and manage subscriptions. Admins can manage users, notes, payments, plans, and site settings.

The backend uses Laravel Sanctum for token authentication and Eloquent ORM for database operations. The Next.js frontend uses Axios to call the API and Zustand to store login state. The Flutter app uses the same API with the Dart http package and stores offline drafts in SharedPreferences. The database is built with Laravel migrations and includes tables for users, notes, friendships, note shares, files, subscriptions, payments, settings, and note versions.

## 19. Best Things To Show In Code During Viva

If the teacher asks to show code, open these files in this order:

1. `backend/notexa/routes/api.php`
   - Shows all backend endpoints.

2. `backend/notexa/app/Http/Controllers/Api/AuthController.php`
   - Shows login/register/token logic.

3. `backend/notexa/app/Http/Controllers/Api/NoteController.php`
   - Shows core feature logic.

4. `backend/notexa/app/Models/Note.php`
   - Shows share code generation and permission checks.

5. `backend/notexa/database/migrations/2024_01_01_000004_create_notes_table.php`
   - Shows note database schema.

6. `frontend/src/services/api.ts`
   - Shows how frontend talks to Laravel.

7. `frontend/src/contexts/authStore.ts`
   - Shows web auth state and localStorage.

8. `frontend/src/components/editor/NoteEditor.tsx`
   - Shows rich text editor.

9. `notexa_app/lib/services/api_service.dart`
   - Shows Flutter API calls.

10. `notexa_app/lib/services/local_storage.dart`
   - Shows offline note storage and sync.

## 20. Important Correction Compared To Older Notes

Some older project notes may say Laravel 12 and Next.js 14. The actual current project manifests say:

```text
Laravel framework: ^13.0
Next.js: ^16.2.4
React: ^19.1.0
```

Use the versions above when presenting this copy of the project.
