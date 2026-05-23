<?php
/* Payments - transaction records from API Nepal payment gateway */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('plan_id')->constrained('subscription_plans')->onDelete('cascade');
            $table->string('identifier')->unique();
            $table->string('trx_number')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 4)->default('NPR');
            $table->enum('status', ['pending', 'success', 'failed', 'cancelled'])->default('pending');
            $table->json('gateway_response')->nullable();
            $table->string('payment_method')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('payments'); }
};
