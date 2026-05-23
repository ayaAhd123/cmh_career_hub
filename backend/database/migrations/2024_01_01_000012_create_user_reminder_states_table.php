<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_reminder_states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('reminder_id', 120);
            $table->enum('status', ['read', 'dismissed', 'snoozed'])->default('read');
            $table->timestamp('snoozed_until')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'reminder_id']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_reminder_states');
    }
};
