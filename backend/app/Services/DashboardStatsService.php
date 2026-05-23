<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\Promotion;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class DashboardStatsService
{
    private const EDUCATION_ORDER = ['Bac+2', 'Bac+3', 'Bac+5', 'Bac+8'];
    private const AGE_BUCKETS = ['18-24', '25-30', '31-35', '36+'];

    public function getStats(string $timeRange, ?string $customStart, ?string $customEnd): array
    {
        $promotions = Promotion::query()
            ->where('status', '!=', 'Archived')
            ->orderByDesc('start_date')
            ->get();

        $candidates = Candidate::query()
            ->with(['skills', 'moduleGrades', 'promotion'])
            ->where('state', '!=', 'Archived')
            ->get();

        $filteredPromos = $promotions->filter(
            fn (Promotion $p) => $this->dateInRange($p->start_date, $timeRange, $customStart, $customEnd)
        )->values();

        $filteredCandidates = $candidates->filter(
            fn (Candidate $c) => $this->dateInRange($c->recruitment_date, $timeRange, $customStart, $customEnd)
        )->values();

        return [
            'kpis' => $this->buildKpis($filteredPromos, $filteredCandidates),
            'demographics' => $this->buildDemographics($filteredCandidates),
            'activePromotions' => $this->buildActivePromotions($filteredPromos, $candidates),
        ];
    }

    private function buildKpis(Collection $promotions, Collection $candidates): array
    {
        return [
            'totalPromos' => $promotions->count(),
            'activeCands' => $candidates->where('state', 'Active')->count(),
            'passRate' => CandidateScoreService::passRate($candidates),
            'globalAvg' => number_format(CandidateScoreService::globalAverage($candidates), 1, '.', ''),
            'turnover' => CandidateScoreService::turnoverRate($candidates),
        ];
    }

    private function buildDemographics(Collection $candidates): array
    {
        return [
            'education' => $this->buildEducationBreakdown($candidates),
            'gender' => $this->buildGenderBreakdown($candidates),
            'age' => $this->buildAgeBreakdown($candidates),
        ];
    }

    private function buildEducationBreakdown(Collection $candidates): array
    {
        $map = [];

        foreach ($candidates as $candidate) {
            $level = $candidate->education_level ?: 'Bac+2';
            $map[$level] ??= ['count' => 0, 'sum' => 0.0];
            $map[$level]['count']++;
            $map[$level]['sum'] += CandidateScoreService::overallAverage($candidate);
        }

        return collect(self::EDUCATION_ORDER)->map(function (string $level) use ($map) {
            $data = $map[$level] ?? ['count' => 0, 'sum' => 0.0];

            return [
                'level' => $level,
                'count' => $data['count'],
                'avg' => $data['count'] > 0
                    ? round($data['sum'] / $data['count'], 1)
                    : 0,
            ];
        })->values()->all();
    }

    private function buildGenderBreakdown(Collection $candidates): array
    {
        $map = [];

        foreach ($candidates as $candidate) {
            $gender = $candidate->gender ?: 'Other';
            $map[$gender] ??= ['count' => 0, 'sum' => 0.0];
            $map[$gender]['count']++;
            $map[$gender]['sum'] += CandidateScoreService::overallAverage($candidate);
        }

        return collect($map)->map(function (array $data, string $name) {
            return [
                'name' => $name,
                'value' => $data['count'],
                'avg' => $data['count'] > 0
                    ? round($data['sum'] / $data['count'], 1)
                    : 0,
            ];
        })->values()->all();
    }

    private function buildAgeBreakdown(Collection $candidates): array
    {
        $map = collect(self::AGE_BUCKETS)->mapWithKeys(
            fn (string $range) => [$range => ['count' => 0, 'sum' => 0.0]]
        )->all();

        foreach ($candidates as $candidate) {
            $age = $candidate->age;
            if ($age === null) {
                continue;
            }

            $range = match (true) {
                $age < 25 => '18-24',
                $age < 31 => '25-30',
                $age < 36 => '31-35',
                default => '36+',
            };

            $score = CandidateScoreService::overallAverage($candidate);
            $map[$range]['count']++;
            $map[$range]['sum'] += $score;
        }

        return collect($map)->map(function (array $data, string $range) {
            return [
                'range' => $range,
                'count' => $data['count'],
                'avg' => $data['count'] > 0
                    ? round($data['sum'] / $data['count'], 1)
                    : 0,
            ];
        })->values()->all();
    }

    private function buildActivePromotions(Collection $filteredPromos, Collection $allCandidates): array
    {
        return $filteredPromos
            ->filter(fn (Promotion $p) => $this->promotionStatus($p) === 'Active')
            ->sortByDesc(fn (Promotion $p) => $p->start_date)
            ->take(3)
            ->map(function (Promotion $promotion) use ($allCandidates) {
                $promoCandidates = $allCandidates->filter(
                    fn (Candidate $c) => $c->promotion_id === $promotion->id
                )->values();

                $progress = $this->promotionProgress($promotion);

                return [
                    'id' => $promotion->promo_code,
                    'name' => $promotion->name,
                    'startDate' => $promotion->start_date->format('Y-m-d'),
                    'endDate' => $promotion->end_date->format('Y-m-d'),
                    'status' => $this->promotionStatus($promotion),
                    'archived' => $promotion->status === 'Archived',
                    'progress' => $progress,
                    'candidateCount' => $promoCandidates->count(),
                    'passRate' => CandidateScoreService::passRate($promoCandidates),
                    'avgScore' => number_format(
                        CandidateScoreService::globalAverage($promoCandidates),
                        1,
                        '.',
                        ''
                    ),
                ];
            })
            ->values()
            ->all();
    }

    private function promotionStatus(Promotion $promotion): string
    {
        if ($promotion->status === 'Archived') {
            return 'Archived';
        }

        if ($promotion->end_date->lt(Carbon::today())) {
            return 'Completed';
        }

        return 'Active';
    }

    private function promotionProgress(Promotion $promotion): array
    {
        $totalWorking = 25;
        $total = 35;
        $start = $promotion->start_date->copy()->startOfDay();
        $today = Carbon::today();
        $elapsed = max(0, $start->diffInDays($today, false));
        $workingDone = min($totalWorking, (int) round(($elapsed / $total) * $totalWorking));
        $pct = min(100, (int) round(($workingDone / $totalWorking) * 100));

        return [
            'workingDone' => $workingDone,
            'totalWorking' => $totalWorking,
            'pct' => $pct,
        ];
    }

    private function dateInRange(
        Carbon $date,
        string $timeRange,
        ?string $customStart,
        ?string $customEnd
    ): bool {
        if ($timeRange === 'all') {
            return true;
        }

        $target = $date->copy()->startOfDay();
        $today = Carbon::today();

        return match ($timeRange) {
            'today' => $target->isSameDay($today),
            'yesterday' => $target->isSameDay($today->copy()->subDay()),
            'current_week' => $target->isSameWeek($today, Carbon::MONDAY),
            'last_week' => $target->isSameWeek($today->copy()->subWeek(), Carbon::MONDAY),
            'current_month' => $target->isSameMonth($today),
            'last_month' => $target->isSameMonth($today->copy()->subMonth()),
            'current_year' => $target->isSameYear($today),
            'last_year' => $target->isSameYear($today->copy()->subYear()),
            'custom' => $this->dateInCustomRange($target, $customStart, $customEnd),
            default => true,
        };
    }

    private function dateInCustomRange(Carbon $date, ?string $customStart, ?string $customEnd): bool
    {
        if ($customStart && $date->lt(Carbon::parse($customStart)->startOfDay())) {
            return false;
        }

        if ($customEnd && $date->gt(Carbon::parse($customEnd)->endOfDay())) {
            return false;
        }

        return true;
    }
}
