<?php

namespace App\Services;

use App\Models\Promotion;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class PassRateAlertService
{
    /** Minimum drop (percentage points) to trigger an unexpected-decline alert. */
    private const DROP_THRESHOLD = 8;

    /** Alert when pass rate falls below this without needing prior history. */
    private const LOW_PASS_RATE = 50;

    /** Minimum candidates before pass-rate alerts apply. */
    private const MIN_CANDIDATES = 3;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function promotionAlerts(Promotion $promotion, Collection $candidates): array
    {
        if (! in_array($promotion->status, ['Active', 'Pending'], true)) {
            return [];
        }

        $eligible = $candidates->where('state', '!=', 'Archived');

        if ($eligible->count() < self::MIN_CANDIDATES) {
            return [];
        }

        $current = CandidateScoreService::passRate($eligible);
        $previous = Cache::get($this->cacheKey($promotion->promo_code));
        $promoId = $promotion->promo_code;
        $items = [];

        if ($previous !== null && ($previous - $current) >= self::DROP_THRESHOLD) {
            $delta = $previous - $current;
            $items[] = $this->buildAlert(
                id: "{$promoId}-pass-drop",
                type: 'pass_rate_drop',
                priority: 1,
                title: "Success rate dropped — {$promotion->name}",
                description: "{$promoId} pass rate fell from {$previous}% to {$current}% (−{$delta} pts). Review recent evaluations and at-risk candidates.",
                timeLabel: "−{$delta}%",
                promotionId: $promoId,
            );
        } elseif ($current < self::LOW_PASS_RATE) {
            $items[] = $this->buildAlert(
                id: "{$promoId}-pass-low",
                type: 'low_pass_rate',
                priority: 2,
                title: "Low success rate — {$promotion->name}",
                description: "{$promoId} pass rate is {$current}% (below ".self::LOW_PASS_RATE."%). Check candidate performance and support needs.",
                timeLabel: "{$current}%",
                promotionId: $promoId,
            );
        }

        return $items;
    }

    /**
     * @param Collection<int, Promotion> $promotions
     * @return array<int, array<string, mixed>>
     */
    public function globalAlerts(Collection $promotions): array
    {
        $candidates = $promotions
            ->flatMap(fn (Promotion $p) => $p->candidates)
            ->where('state', '!=', 'Archived');

        if ($candidates->count() < self::MIN_CANDIDATES) {
            return [];
        }

        $current = CandidateScoreService::passRate($candidates);
        $previous = Cache::get($this->cacheKey('global'));
        $items = [];

        if ($previous !== null && ($previous - $current) >= self::DROP_THRESHOLD) {
            $delta = $previous - $current;
            $items[] = $this->buildAlert(
                id: 'global-pass-drop',
                type: 'pass_rate_drop',
                priority: 1,
                title: 'Overall success rate dropped',
                description: "Global pass rate fell from {$previous}% to {$current}% (−{$delta} pts) across active promotions.",
                timeLabel: "−{$delta}%",
                promotionId: null,
                link: ['to' => '/'],
            );
        } elseif ($current < self::LOW_PASS_RATE) {
            $items[] = $this->buildAlert(
                id: 'global-pass-low',
                type: 'low_pass_rate',
                priority: 2,
                title: 'Low overall success rate',
                description: "Global pass rate is {$current}% (below ".self::LOW_PASS_RATE."%). Review promotions with struggling candidates.",
                timeLabel: "{$current}%",
                promotionId: null,
                link: ['to' => '/'],
            );
        }

        return $items;
    }

    /** @return array<string, mixed> */
    private function buildAlert(
        string $id,
        string $type,
        int $priority,
        string $title,
        string $description,
        string $timeLabel,
        ?string $promotionId,
        ?array $link = null,
    ): array {
        return [
            'id' => $id,
            'type' => $type,
            'priority' => $priority,
            'title' => $title,
            'description' => $description,
            'timeLabel' => $timeLabel,
            'promotionId' => $promotionId,
            'icon' => 'trending',
            'link' => $link ?? ($promotionId ? [
                'to' => '/promotions/$id',
                'params' => ['id' => $promotionId],
                'search' => ['tab' => 'overview'],
            ] : ['to' => '/']),
        ];
    }

    private function cacheKey(string $scope): string
    {
        return app(PassRateBaselineService::class)->cacheKey($scope);
    }
}
