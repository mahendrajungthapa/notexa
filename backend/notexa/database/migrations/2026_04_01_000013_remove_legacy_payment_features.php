<?php

/* Legacy cleanup - remove old billing tables and user flags from upgraded databases */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        foreach (['subscriptions', 'payments', 'subscription_plans'] as $table) {
            if (Schema::hasTable($table)) {
                Schema::drop($table);
            }
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'is_premium')) {
                $table->dropColumn('is_premium');
            }
            if (Schema::hasColumn('users', 'premium_expires_at')) {
                $table->dropColumn('premium_expires_at');
            }
        });
    }

    public function down(): void {
        // Billing was intentionally removed from the product surface.
    }
};
