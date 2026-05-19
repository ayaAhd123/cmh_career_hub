<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('company_name', 100);
            $table->integer('default_duration_days')->default(25);
            $table->integer('modules_per_promo')->default(5);
            $table->decimal('passing_threshold', 4, 2)->default(10.00);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
