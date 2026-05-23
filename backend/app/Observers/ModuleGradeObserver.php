<?php

namespace App\Observers;

use App\Models\ModuleGrade;
use App\Models\Promotion;
use App\Services\PassRateBaselineService;

class ModuleGradeObserver
{
    public function saved(ModuleGrade $grade): void
    {
        $candidate = $grade->candidate()->with('promotion')->first();
        if (! $candidate) {
            return;
        }

        $candidate->recalculateOverallAvg();
        $this->refreshPassRateBaselines($candidate->promotion_id);
    }

    public function deleted(ModuleGrade $grade): void
    {
        $candidate = $grade->candidate()->with('promotion')->first();
        if (! $candidate) {
            return;
        }

        $candidate->recalculateOverallAvg();
        $this->refreshPassRateBaselines($candidate->promotion_id);
    }

    private function refreshPassRateBaselines(?int $promotionId): void
    {
        if (! $promotionId) {
            return;
        }

        $baseline = app(PassRateBaselineService::class);
        $promotion = Promotion::query()->find($promotionId);

        if ($promotion) {
            $baseline->refreshPromotion($promotion);
        }

        $promotions = Promotion::query()
            ->where('status', '!=', 'Archived')
            ->whereNull('deleted_at')
            ->get();

        $baseline->refreshGlobal($promotions);
    }
}
