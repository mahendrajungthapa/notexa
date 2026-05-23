<?php
/* Files - metadata for uploaded files stored in Cloudflare R2 cloud storage */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('note_id')->nullable()->constrained()->onDelete('set null');
            $table->string('original_name');
            $table->string('stored_name');
            $table->string('path');
            $table->string('mime_type');
            $table->bigInteger('size');
            $table->string('r2_key');
            $table->string('r2_url')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('files'); }
};
