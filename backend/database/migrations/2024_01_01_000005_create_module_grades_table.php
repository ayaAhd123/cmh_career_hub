<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('module_grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained('candidates')->onDelete('restrict');
            $table->foreignId('module_id')->constrained('modules')->onDelete('restrict');
            $table->decimal('score', 4, 2);
            $table->timestamps();

            $table->unique(['candidate_id', 'module_id']);
            $table->index('candidate_id');
            $table->index('module_id');
        });

        DB::statement('ALTER TABLE module_grades ADD CONSTRAINT check_score CHECK (score >= 0 AND score <= 20)');
    }

    public function down(): void
    {
        Schema::dropIfExists('module_grades');
    }
};
