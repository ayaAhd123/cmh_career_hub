<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\Promotion;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class PassRateBaselineService
{
    private const CACHE_DAYS = 30;

    public function refreshPromotion(Promotion $promotion): void
    {
        $eligible = $promotion->candidates()
            ->where('state', '!=', 'Archived')
            ->with(['skills', 'moduleGrades'])
            ->get();

        if ($eligible->count() < 3) {
            return;
        }

        Cache::put(
            $this->cacheKey($promotion->promo_code),
            CandidateScoreService::passRate($eligible),
            now()->addDays(self::CACHE_DAYS),
        );
    }

    /** @param Collection<int, Promotion> $promotions */
    public function refreshGlobal(Collection $promotions): void
    {
        $candidates = Candidate::query()
            ->where('state', '!=', 'Archived')
            ->whereIn('promotion_id', $promotions->pluck('id'))
            ->with(['skills', 'moduleGrades'])
            ->get();

        if ($candidates->count() < 3) {
            return;
        }

        Cache::put(
            $this->cacheKey('global'),
            CandidateScoreService::passRate($candidates),
            now()->addDays(self::CACHE_DAYS),
        );
    }

    /** @param Collection<int, Promotion> $promotions */
    public function refreshAll(Collection $promotions): void
    {
        foreach ($promotions as $promotion) {
            $this->refreshPromotion($promotion);
        }

        $this->refreshGlobal($promotions);
    }

    /** Seed baselines above current rates so drop alerts can fire in demos. */
    public function primeDemoBaselines(Collection $promotions): void
    {
        foreach ($promotions as $promotion) {
            $eligible = $promotion->candidates()
                ->where('state', '!=', 'Archived')
                ->with(['skills', 'moduleGrades'])
                ->get();

            if ($eligible->count() < 3) {
                continue;
            }

            $current = CandidateScoreService::passRate($eligible);
            Cache::put(
                $this->cacheKey($promotion->promo_code),
                min(95, $current + 12),
                now()->addDays(self::CACHE_DAYS),
            );
        }

        $all = Candidate::query()
            ->where('state', '!=', 'Archived')
            ->whereIn('promotion_id', $promotions->pluck('id'))
            ->with(['skills', 'moduleGrades'])
            ->get();

        if ($all->count() >= 3) {
            $globalCurrent = CandidateScoreService::passRate($all);
            Cache::put(
                $this->cacheKey('global'),
                min(95, $globalCurrent + 10),
                now()->addDays(self::CACHE_DAYS),
            );
        }
    }

    public function cacheKey(string $scope): string
    {
        return "careerhub_pass_rate:{$scope}";
    }
}
