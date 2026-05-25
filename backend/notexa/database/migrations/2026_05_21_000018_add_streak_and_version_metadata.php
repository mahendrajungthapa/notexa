<?php
/* Study streaks and version metadata - persists daily focus streaks and edit summaries */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'streak_count')) {
                $table->unsignedInteger('streak_count')->default(0)->after('is_active');
            }
            if (!Schema::hasColumn('users', 'last_streak_date')) {
                $table->date('last_streak_date')->nullable()->after('streak_count');
            }
        });

        Schema::table('note_versions', function (Blueprint $table) {
            if (!Schema::hasColumn('note_versions', 'change_summary')) {
                $table->string('change_summary', 500)->nullable()->after('content');
            }
            if (!Schema::hasColumn('note_versions', 'restored_from_version_id')) {
                $table->unsignedBigInteger('restored_from_version_id')
                    ->nullable()
                    ->after('change_summary');
            }
        });
    }

    public function down(): void
    {
        Schema::table('note_versions', function (Blueprint $table) {
            if (Schema::hasColumn('note_versions', 'restored_from_version_id')) {
                $table->dropColumn('restored_from_version_id');
            }
            if (Schema::hasColumn('note_versions', 'change_summary')) {
                $table->dropColumn('change_summary');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'last_streak_date')) {
                $table->dropColumn('last_streak_date');
            }
            if (Schema::hasColumn('users', 'streak_count')) {
                $table->dropColumn('streak_count');
            }
        });
    }
};
