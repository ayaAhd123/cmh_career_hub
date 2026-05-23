<?php

namespace App\Services;

use App\Models\Module;
use App\Models\Promotion;

class PromotionModuleService
{
    private const MODULE_NAMES = [
        'Notions en Email Marketing',
        "Composants de l'Email",
        'CPA (Cost Per Action)',
        "Authentification de l'Email",
        "Délivrabilité de l'Email",
    ];

    public function ensureDefaultModules(Promotion $promotion): void
    {
        if ($promotion->modules()->exists()) {
            return;
        }

        $start = $promotion->start_date->copy();

        foreach (self::MODULE_NAMES as $index => $name) {
            Module::create([
                'promotion_id' => $promotion->id,
                'name' => $name,
                'module_date_debut' => $start->copy()->addDays($index * 7)->toDateString(),
                'module_date_fin' => $start->copy()->addDays(($index * 7) + 4)->toDateString(),
                'status' => $index === 0 ? 'In Progress' : 'Not Started',
                'module_order' => $index + 1,
            ]);
        }
    }
}
