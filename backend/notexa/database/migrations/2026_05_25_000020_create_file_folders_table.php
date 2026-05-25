<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('file_folders')) {
            Schema::create('file_folders', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('parent_id')->nullable()->constrained('file_folders')->onDelete('cascade');
                $table->string('name', 120);
                $table->timestamps();
            });
        }

        if (Schema::hasTable('files') && !Schema::hasColumn('files', 'folder_id')) {
            Schema::table('files', function (Blueprint $table) {
                $table->foreignId('folder_id')->nullable()->after('note_id')->constrained('file_folders')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('files') && Schema::hasColumn('files', 'folder_id')) {
            Schema::table('files', function (Blueprint $table) {
                $table->dropConstrainedForeignId('folder_id');
            });
        }

        Schema::dropIfExists('file_folders');
    }
};
