<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSettingSeeder extends Seeder
{
    public function run(): void
    {
        SystemSetting::query()->firstOrCreate([], [
            'company_name' => 'Cloud Marketing Hub',
            'default_duration_days' => 25,
            'modules_per_promo' => 5,
            'passing_threshold' => 10.00,
        ]);
    }
}
