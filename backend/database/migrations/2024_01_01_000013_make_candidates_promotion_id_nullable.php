<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            $table->dropForeign(['promotion_id']);
        });

        Schema::table('candidates', function (Blueprint $table) {
            $table->unsignedBigInteger('promotion_id')->nullable()->change();
            $table->foreign('promotion_id')->references('id')->on('promotions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            $table->dropForeign(['promotion_id']);
        });

        Schema::table('candidates', function (Blueprint $table) {
            $table->unsignedBigInteger('promotion_id')->nullable(false)->change();
            $table->foreign('promotion_id')->references('id')->on('promotions')->restrictOnDelete();
        });
    }
};
