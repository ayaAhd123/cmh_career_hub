<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->string('target_type', 50);
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('action_type', 50);
            $table->text('description');
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
            $table->index('target_type');
            $table->index('action_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
