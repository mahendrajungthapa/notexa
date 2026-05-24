<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'email_verification_code_hash')) {
                $table->string('email_verification_code_hash')->nullable()->after('email_verified_at');
            }
            if (!Schema::hasColumn('users', 'email_verification_code_expires_at')) {
                $table->timestamp('email_verification_code_expires_at')->nullable()->after('email_verification_code_hash');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'email_verification_code_hash')) {
                $table->dropColumn('email_verification_code_hash');
            }
            if (Schema::hasColumn('users', 'email_verification_code_expires_at')) {
                $table->dropColumn('email_verification_code_expires_at');
            }
        });
    }
};
