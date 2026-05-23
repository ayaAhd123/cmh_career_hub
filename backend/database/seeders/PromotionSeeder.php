<?php

namespace Database\Seeders;

use App\Models\Promotion;
use Illuminate\Database\Seeder;

class PromotionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Promotion::updateOrCreate(
            ['promo_code' => 'SPRING2026'],
            [
                'name' => 'Spring Recruitment Campaign',
                'start_date' => now()->subDays(1)->toDateString(),
                'end_date' => now()->addDays(30)->toDateString(),
                'status' => 'Active',
            ]
        );

        Promotion::updateOrCreate(
            ['promo_code' => 'WEBDEV2024'],
            [
                'name' => 'Web Dev Bootcamp 2024',
                'start_date' => now()->subDays(60)->toDateString(),
                'end_date' => now()->subDays(25)->toDateString(),
                'status' => 'Completed',
            ]
        );

        Promotion::updateOrCreate(
            ['promo_code' => 'DATAQ3'],
            [
                'name' => 'Data Analysis Q3',
                'start_date' => now()->subDays(30)->toDateString(),
                'end_date' => now()->addDays(5)->toDateString(),
                'status' => 'Active',
            ]
        );

        Promotion::updateOrCreate(
            ['promo_code' => 'MARKSPRINT'],
            [
                'name' => 'Marketing Sprint',
                'start_date' => now()->subDays(20)->toDateString(),
                'end_date' => now()->addDays(15)->toDateString(),
                'status' => 'Active',
            ]
        );
    }
}

