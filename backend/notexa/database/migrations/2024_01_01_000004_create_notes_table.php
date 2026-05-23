<?php
/* Notes Table - user notes with rich HTML content, share codes, and AI summaries */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->longText('content')->nullable();
            $table->text('plain_text')->nullable();
            $table->string('color', 7)->default('#ffffff');
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_archived')->default(false);
            $table->boolean('is_trashed')->default(false);
            $table->string('share_code', 12)->unique()->nullable();
            $table->text('ai_summary')->nullable();
            $table->timestamp('trashed_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'is_trashed', 'is_archived']);
        });
    }
    public function down(): void { Schema::dropIfExists('notes'); }
};
