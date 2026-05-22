<?php

namespace Database\Seeders;

use App\Models\Promotion;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PromotionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Promotion::factory()->create([
            'promo_code' => 'SPRING2026',
            'name' => 'Spring Recruitment Campaign',
            'start_date' => now()->subDays(1)->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'status' => 'Active',
        ]);
    }
}
?>
