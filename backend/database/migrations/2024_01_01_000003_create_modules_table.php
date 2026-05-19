<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained('promotions')->onDelete('restrict');
            $table->string('name', 100);
            $table->date('module_date_debut');
            $table->date('module_date_fin');
            $table->enum('status', ['Not Started', 'In Progress', 'Completed', 'Holiday'])->default('Not Started');
            $table->tinyInteger('module_order');

            $table->index('promotion_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modules');
    }
};
