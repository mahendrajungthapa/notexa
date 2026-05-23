# Laravel Beginner Guide for Notexa

## What Laravel Does

Laravel is the backend of Notexa. It receives requests from the Next.js website and Flutter app, checks permissions, talks to the database, and returns JSON responses.

In this project Laravel is used as a REST API, not a traditional Blade website.

## Current Version

- Laravel framework installed: `v13.6.0`
- PHP runtime checked locally: `8.4.20`
- Auth package: Laravel Sanctum `v4.3.1`

Laravel 13 is the latest major Laravel release for this project line. The project already uses the correct Laravel 13 dependency constraint: `laravel/framework: ^13.0`.

## Important Folders

```text
backend/notexa
  routes/api.php              API route list
  app/Http/Controllers        Request handlers
  app/Models                  Database table classes
  app/Services                Extra business logic
  app/Http/Middleware         Route guards
  database/migrations         Database table definitions
  database/seeders            Default data
  config                      App configuration
```

## Request Lifecycle

Example: user creates a note.

```text
Next.js or Flutter
  -> POST /api/notes
  -> routes/api.php
  -> auth:sanctum middleware
  -> NoteController@store
  -> Note model
  -> database notes table
  -> JSON response
```

## Routes

Routes are in `routes/api.php`.

Examples:

```php
Route::post('/login', [AuthController::class, 'login']);
Route::get('/notes', [NoteController::class, 'index']);
Route::post('/notes', [NoteController::class, 'store']);
```

Meaning:

- `POST /api/login` calls `AuthController@login`.
- `GET /api/notes` calls `NoteController@index`.
- `POST /api/notes` calls `NoteController@store`.

## Controllers

Controllers contain the logic for each API request.

Main controllers:

| Controller | Job |
| --- | --- |
| `AuthController` | Register, login, logout, profile, password |
| `NoteController` | Create, read, update, delete, archive, pin, share code, AI summary |
| `NoteShareController` | Share notes with friends |
| `FriendController` | Friend requests and friend list |
| `FileController` | Upload, download, delete files |
| `SubscriptionController` | Plans, payments, subscriptions |
| `AdminController` | Admin dashboard and management |

## Models

Models represent database tables.

Examples:

| Model | Table |
| --- | --- |
| `User` | `users` |
| `Note` | `notes` |
| `Friendship` | `friendships` |
| `NoteShare` | `note_shares` |
| `File` | `files` |
| `Payment` | `payments` |

Example relationship:

```php
public function notes()
{
    return $this->hasMany(Note::class);
}
```

This means one user can have many notes.

## Authentication

Notexa uses Laravel Sanctum.

Login flow:

```text
1. User sends login and password.
2. Laravel checks password hash.
3. Laravel creates Sanctum token.
4. Frontend stores token.
5. Future requests send Authorization: Bearer <token>.
```

Protected routes use:

```php
Route::middleware('auth:sanctum')->group(function () {
    // logged-in routes
});
```

## Authorization

Authorization means checking what a user can do.

Examples:

- Admin routes use `is_admin` middleware.
- Note owner can delete notes.
- Shared users can view notes.
- Shared users can edit only when permission is `edit`.

Important methods:

```php
$note->canView($user);
$note->canEdit($user);
$user->isAdmin();
$user->isPremium();
```

## Services

Services keep complex logic outside controllers.

| Service | Purpose |
| --- | --- |
| `DeepSeekService` | Calls AI API for note summaries |
| `R2StorageService` | Uploads/downloads files using Cloudflare R2 or local storage |
| `ApiNepalPaymentService` | Starts and validates payments |

## How To Run Laravel

```bash
cd backend/notexa
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Backend URL:

```text
http://localhost:8000
```

## Teacher Explanation

Laravel is the secure backend brain of Notexa. It provides API routes, validates input, authenticates users with Sanctum tokens, checks permissions, stores data through Eloquent ORM, and returns JSON to the web and mobile apps.

