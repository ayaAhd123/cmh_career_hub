<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidate_skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained('candidates')->onDelete('restrict');
            $table->enum('category', ['Discipline', 'Work Skills']);
            $table->string('skill_name', 50);
            $table->decimal('score', 3, 2);
            $table->timestamps();

            $table->unique(['candidate_id', 'skill_name']);
            $table->index('candidate_id');
            $table->index(['candidate_id', 'category']);
        });

        // Some DBs (SQLite) don't support ALTER TABLE ... ADD CONSTRAINT.
        try {
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement('ALTER TABLE candidate_skills ADD CONSTRAINT check_skill_score CHECK (score >= 0 AND score <= 5)');
            }
        } catch (\Throwable $e) {
            // ignore
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('candidate_skills');
    }
};
