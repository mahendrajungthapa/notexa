<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use App\Models\User;
use Illuminate\Support\Str;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('notexa:create-admin {email : Admin email address} {password? : Admin password, minimum 8 characters} {--name=Admin : Admin display name} {--username= : Admin username}', function () {
    $email = Str::lower(trim((string) $this->argument('email')));
    $password = (string) ($this->argument('password') ?: $this->secret('Admin password'));
    $name = trim((string) $this->option('name')) ?: 'Admin';
    $requestedUsername = trim((string) $this->option('username'));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $this->error('Please provide a valid email address.');
        return 1;
    }

    if (strlen($password) < 8) {
        $this->error('Password must be at least 8 characters.');
        return 1;
    }

    $user = User::where('email', $email)->first();
    $baseUsername = $requestedUsername ?: ($user?->username ?: Str::before($email, '@'));
    $baseUsername = Str::of($baseUsername)->lower()->replaceMatches('/[^a-z0-9_-]/', '_')->trim('_')->limit(30, '')->toString() ?: 'admin';
    $username = $baseUsername;
    $suffix = 1;

    while (User::where('username', $username)->when($user, fn ($query) => $query->where('id', '!=', $user->id))->exists()) {
        $suffix += 1;
        $username = Str::limit($baseUsername, max(1, 30 - strlen((string) $suffix) - 1), '') . '_' . $suffix;
    }

    $user ??= new User();
    $user->forceFill([
        'name' => $name,
        'username' => $username,
        'email' => $email,
        'email_verified_at' => now(),
        'password' => $password,
        'role' => 'admin',
        'is_active' => true,
        'storage_limit' => max((int) ($user->storage_limit ?? 0), 52428800),
    ])->save();

    $this->info("Admin account ready: {$user->email}");
    $this->line("Username: {$user->username}");

    return 0;
})->purpose('Create or reset a Notexa admin account');

Artisan::command('notexa:fix-temp', function () {
    $tempDir = storage_path('app/php-temp');

    File::ensureDirectoryExists($tempDir, 0775, true);

    $this->info('Notexa PHP temp directory is ready:');
    $this->line($tempDir);
    $this->newLine();
    $this->line('If PHP still prints "Unable to create temporary file" before Laravel starts, set these PHP.ini values on the server:');
    $this->line("upload_tmp_dir={$tempDir}");
    $this->line("sys_temp_dir={$tempDir}");
    $this->newLine();
    $this->line('Then restart PHP-FPM/LiteSpeed/Apache from your hosting panel.');

    return 0;
})->purpose('Create the Notexa PHP temp directory and print the required PHP.ini values');
