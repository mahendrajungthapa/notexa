# Database Beginner Guide for Notexa

## What The Database Does

The database is the permanent storage of Notexa. It stores users, notes, friends, shared notes, uploaded files, subscriptions, payments, settings, and note versions.

The frontend and Flutter app do not directly access the database. They call Laravel API, and Laravel uses Eloquent ORM to read/write database tables.

## Database Type

The project supports Laravel database configuration through `.env`.

The copied project has:

- SQLite file: `backend/notexa/database/database.sqlite`
- Laravel migrations for all tables
- Local `.env` may use MySQL depending on setup

For college explanation, say:

The schema is database-independent because Laravel migrations define the tables. It can run on SQLite for simple local demos or MySQL for a more realistic setup.

## What Is A Migration

A migration is PHP code that creates or changes database tables.

Example:

```php
Schema::create('notes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->string('title');
    $table->longText('content')->nullable();
    $table->timestamps();
});
```

Run migrations:

```bash
php artisan migrate
```

Run migrations with sample default data:

```bash
php artisan migrate --seed
```

## Main Tables

| Table | Purpose |
| --- | --- |
| `users` | Registered users and admins |
| `notes` | User notes |
| `friendships` | Friend requests and accepted friends |
| `note_shares` | Notes shared with other users |
| `files` | Uploaded file metadata |
| `subscription_plans` | Premium plans |
| `payments` | Payment transactions |
| `subscriptions` | Active and old subscriptions |
| `site_settings` | Admin configurable settings |
| `note_versions` | Note edit history |
| `activity_logs` | User activity records |
| `personal_access_tokens` | Laravel Sanctum login tokens |
| `password_reset_tokens` | Password reset tokens |
| `sessions` | Laravel session data |

## Important Relationships

```text
users 1 -> many notes
users 1 -> many files
users 1 -> many payments
users 1 -> many subscriptions
notes 1 -> many files
notes 1 -> many note_versions
notes many -> many users through note_shares
users many -> many users through friendships
subscription_plans 1 -> many payments
subscription_plans 1 -> many subscriptions
```

## Core Table Explanations

### `users`

Stores account data.

Important columns:

- `name`
- `username`
- `email`
- `password`
- `role`
- `is_premium`
- `storage_used`
- `storage_limit`
- `is_active`

### `notes`

Stores notes.

Important columns:

- `user_id`: owner
- `title`: note title
- `content`: HTML note body
- `plain_text`: searchable text
- `color`: card color
- `is_pinned`: pin flag
- `is_archived`: archive flag
- `is_trashed`: trash flag
- `share_code`: unique code
- `ai_summary`: AI summary

### `friendships`

Stores friend request state.

Important columns:

- `sender_id`
- `receiver_id`
- `status`: pending, accepted, rejected, blocked

### `note_shares`

Stores note sharing permission.

Important columns:

- `note_id`
- `shared_by`
- `shared_with`
- `permission`: view or edit

### `files`

Stores file metadata, not necessarily the actual file bytes.

Important columns:

- `user_id`
- `note_id`
- `original_name`
- `stored_name`
- `mime_type`
- `size`
- `r2_key`
- `r2_url`

### `payments` and `subscriptions`

Payments record transactions. Subscriptions record active premium access.

Payment success creates a subscription and updates the user as premium.

## Seeder

File:

```text
database/seeders/DatabaseSeeder.php
```

Creates default admin:

```text
username: admin
email: admin@notexa.com
password: password123
```

Creates default plans:

- Premium Monthly
- Premium Yearly

Creates default site settings:

- site name
- about content
- SMTP placeholders
- API Nepal placeholders
- R2 storage placeholders
- DeepSeek AI placeholders

## Teacher Explanation

The database is designed using Laravel migrations. Eloquent models represent each table, and relationships connect users, notes, files, payments, and sharing. The database stores all permanent project data while Laravel controls access and validation.

