<?php
/* Note Versions - edit history tracking for each note content change */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('note_versions')) {
            return;
        }

        Schema::create('note_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('note_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->longText('content');
            $table->integer('version_number');
            $table->timestamps();
            $table->index(['note_id', 'version_number']);
        });
    }
    public function down(): void { Schema::dropIfExists('note_versions'); }
};
