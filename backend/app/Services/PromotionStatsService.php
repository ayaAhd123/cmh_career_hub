<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\Promotion;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PromotionStatsService
{
    private const SCORE_RANGES = [
        ['name' => '0-1', 'min' => 0, 'max' => 1],
        ['name' => '1-2', 'min' => 1, 'max' => 2],
        ['name' => '2-3', 'min' => 2, 'max' => 3],
        ['name' => '3-4', 'min' => 3, 'max' => 4],
        ['name' => '4-5', 'min' => 4, 'max' => 5.01],
    ];

    private const AGE_BUCKETS = ['19-25', '26-30', '31-40', '41+', 'Not provided'];

    public function getStats(Promotion $promotion): array
    {
        $candidates = Candidate::query()
            ->with(['skills', 'moduleGrades', 'promotion'])
            ->where('promotion_id', $promotion->id)
            ->where('state', '!=', 'Archived')
            ->get();

        return [
            'promotion' => [
                'id' => $promotion->promo_code,
                'name' => $promotion->name,
                'startDate' => $promotion->start_date->format('Y-m-d'),
                'endDate' => $promotion->end_date->format('Y-m-d'),
                'status' => $this->promotionStatus($promotion),
                'archived' => $promotion->trashed() || $promotion->status === 'Archived',
            ],
            'progress' => $this->promotionProgress($promotion),
            'kpis' => $this->buildKpis($candidates),
            'categoryDistribution' => $this->buildCategoryDistribution($candidates),
            'scoreDistribution' => $this->buildScoreDistribution($candidates),
            'topPerformers' => $this->buildTopPerformers($candidates),
            'demographics' => [
                'gender' => $this->buildGenderBreakdown($candidates),
                'education' => $this->buildEducationBreakdown($candidates),
                'age' => $this->buildAgeBreakdown($candidates),
            ],
        ];
    }

    private function buildKpis(Collection $candidates): array
    {
        $atRisk = $candidates->filter(function (Candidate $candidate) {
            $avg = CandidateScoreService::overallAverage($candidate);

            return in_array(CandidateScoreService::categoryFor($avg), ['Passable', 'Critical'], true);
        })->count();

        return [
            'totalCandidates' => $candidates->count(),
            'passRate' => CandidateScoreService::passRate($candidates),
            'avgScore' => round(CandidateScoreService::globalAverage($candidates), 2),
            'atRisk' => $atRisk,
        ];
    }

    private function buildCategoryDistribution(Collection $candidates): array
    {
        $counts = [
            'Excellent' => 0,
            'Good' => 0,
            'Passable' => 0,
            'Critical' => 0,
        ];

        foreach ($candidates as $candidate) {
            $category = CandidateScoreService::categoryFor(
                CandidateScoreService::overallAverage($candidate)
            );
            $counts[$category]++;
        }

        return collect($counts)->map(fn (int $value, string $name) => [
            'name' => $name,
            'value' => $value,
        ])->values()->all();
    }

    private function buildScoreDistribution(Collection $candidates): array
    {
        return collect(self::SCORE_RANGES)->map(function (array $range) use ($candidates) {
            $count = $candidates->filter(function (Candidate $candidate) use ($range) {
                $avg = CandidateScoreService::overallAverage($candidate);

                return $avg >= $range['min'] && $avg < $range['max'];
            })->count();

            return [
                'name' => $range['name'],
                'count' => $count,
            ];
        })->all();
    }

    private function buildTopPerformers(Collection $candidates): array
    {
        return $candidates
            ->sortByDesc(fn (Candidate $candidate) => CandidateScoreService::overallAverage($candidate))
            ->take(3)
            ->map(function (Candidate $candidate) {
                $avg = CandidateScoreService::overallAverage($candidate);

                return [
                    'id' => (string) $candidate->id,
                    'firstName' => $candidate->first_name,
                    'lastName' => $candidate->last_name,
                    'avgScore' => $avg,
                    'category' => CandidateScoreService::categoryFor($avg),
                ];
            })
            ->values()
            ->all();
    }

    private function buildGenderBreakdown(Collection $candidates): array
    {
        $map = [];

        foreach ($candidates as $candidate) {
            $gender = $candidate->gender ?: 'Not provided';
            $map[$gender] ??= ['count' => 0, 'sum' => 0.0];
            $map[$gender]['count']++;
            $map[$gender]['sum'] += CandidateScoreService::overallAverage($candidate);
        }

        return collect($map)
            ->map(function (array $data, string $name) {
                return [
                    'name' => $name,
                    'value' => $data['count'],
                    'avg' => $data['count'] > 0
                        ? round($data['sum'] / $data['count'], 2)
                        : 0,
                ];
            })
            ->filter(fn (array $entry) => $entry['value'] > 0 && $entry['name'] !== 'Not provided')
            ->values()
            ->all();
    }

    private function buildEducationBreakdown(Collection $candidates): array
    {
        $map = [];

        foreach ($candidates as $candidate) {
            $level = $candidate->education_level ?: 'Not provided';
            $map[$level] ??= ['count' => 0, 'sum' => 0.0];
            $map[$level]['count']++;
            $map[$level]['sum'] += CandidateScoreService::overallAverage($candidate);
        }

        return collect($map)->map(function (array $data, string $name) {
            return [
                'name' => $name,
                'value' => $data['count'],
                'avg' => $data['count'] > 0
                    ? round($data['sum'] / $data['count'], 2)
                    : 0,
            ];
        })->values()->all();
    }

    private function buildAgeBreakdown(Collection $candidates): array
    {
        $map = collect(self::AGE_BUCKETS)->mapWithKeys(
            fn (string $bucket) => [$bucket => ['count' => 0, 'sum' => 0.0]]
        )->all();

        foreach ($candidates as $candidate) {
            $bucket = $this->ageBucket($candidate->age);
            $map[$bucket]['count']++;
            $map[$bucket]['sum'] += CandidateScoreService::overallAverage($candidate);
        }

        return collect($map)
            ->map(function (array $data, string $name) {
                return [
                    'name' => $name,
                    'value' => $data['count'],
                    'avg' => $data['count'] > 0
                        ? round($data['sum'] / $data['count'], 2)
                        : 0,
                ];
            })
            ->filter(fn (array $entry) => $entry['value'] > 0)
            ->values()
            ->all();
    }

    private function ageBucket(?int $age): string
    {
        if ($age === null) {
            return 'Not provided';
        }

        return match (true) {
            $age >= 19 && $age <= 25 => '19-25',
            $age >= 26 && $age <= 30 => '26-30',
            $age >= 31 && $age <= 40 => '31-40',
            default => '41+',
        };
    }

    private function promotionStatus(Promotion $promotion): string
    {
        if ($promotion->status === 'Archived' || $promotion->trashed()) {
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
}
