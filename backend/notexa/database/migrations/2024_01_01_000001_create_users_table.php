<?php
/* Users Table - stores all registered accounts with profile data and storage tracking */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('username')->unique();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('avatar')->nullable();
            $table->enum('role', ['user', 'admin'])->default('user');
            $table->boolean('is_premium')->default(false);
            $table->timestamp('premium_expires_at')->nullable();
            $table->bigInteger('storage_used')->default(0);
            $table->bigInteger('storage_limit')->default(52428800);
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('users'); }
};
