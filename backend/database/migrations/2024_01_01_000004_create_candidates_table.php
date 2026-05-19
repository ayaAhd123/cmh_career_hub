<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained('promotions')->onDelete('restrict');
            $table->string('first_name', 50);
            $table->string('last_name', 50);
            $table->string('email', 100)->unique();
            $table->string('phone', 20);
            $table->date('recruitment_date');
            $table->enum('education_level', ['Bac', 'Bac+2', 'Bac+3', 'Bac+4', 'Bac+5', 'Bac+8']);
            $table->string('diploma_specialty', 100)->nullable();
            $table->decimal('diploma_average', 4, 2)->nullable();
            $table->enum('state', ['Active', 'Graduated', 'Dismissed', 'Terminated', 'Archived'])->default('Active');
            $table->decimal('overall_avg', 4, 2)->default(0.00);
            $table->enum('category', ['Excellent', 'Bien', 'Passable', 'Critique'])->default('Critique');
            $table->timestamps();
            $table->softDeletes();

            $table->index('promotion_id');
            $table->index('state');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidates');
    }
};
