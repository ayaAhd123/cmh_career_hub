<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            "ALTER TABLE candidates MODIFY category ENUM('Excellent', 'Bien', 'Good', 'Passable', 'Critique', 'Critical') NOT NULL DEFAULT 'Critical'"
        );

        DB::table('candidates')->where('category', 'Bien')->update(['category' => 'Good']);
        DB::table('candidates')->where('category', 'Critique')->update(['category' => 'Critical']);

        DB::statement(
            "ALTER TABLE candidates MODIFY category ENUM('Excellent', 'Good', 'Passable', 'Critical') NOT NULL DEFAULT 'Critical'"
        );
    }

    public function down(): void
    {
        DB::statement(
            "ALTER TABLE candidates MODIFY category ENUM('Excellent', 'Bien', 'Good', 'Passable', 'Critique', 'Critical') NOT NULL DEFAULT 'Critique'"
        );

        DB::table('candidates')->where('category', 'Good')->update(['category' => 'Bien']);
        DB::table('candidates')->where('category', 'Critical')->update(['category' => 'Critique']);

        DB::statement(
            "ALTER TABLE candidates MODIFY category ENUM('Excellent', 'Bien', 'Passable', 'Critique') NOT NULL DEFAULT 'Critique'"
        );
    }
};
