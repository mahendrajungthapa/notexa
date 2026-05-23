<?php

/* File Shares - direct file access granted from one user to an accepted friend */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('file_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('file_id')->constrained('files')->onDelete('cascade');
            $table->foreignId('shared_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('shared_with')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['file_id', 'shared_with']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('file_shares');
    }
};
