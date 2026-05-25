<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private const OLD_DEFAULT_STORAGE_LIMIT = 52428800; // 50 MB

    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        DB::table('users')
            ->where('storage_limit', '<=', self::OLD_DEFAULT_STORAGE_LIMIT)
            ->update(['storage_limit' => User::DEFAULT_STORAGE_LIMIT]);
    }

    public function down(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        DB::table('users')
            ->where('storage_limit', User::DEFAULT_STORAGE_LIMIT)
            ->update(['storage_limit' => self::OLD_DEFAULT_STORAGE_LIMIT]);
    }
};
