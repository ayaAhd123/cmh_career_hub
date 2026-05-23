<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\Promotion;

class AiContextService
{
    public function build(): array
    {
        $candidates = Candidate::query()
            ->with([
                'promotion:id,promo_code,name',
                'skills:candidate_id,category,skill_name,score',
                'moduleGrades:candidate_id,module_id,score',
            ])
            ->where('state', '!=', 'Archived')
            ->get();

        $analytics = $this->buildAnalytics($candidates);

        return [
            'analytics' => $analytics,
            'promotions' => $this->buildPromotions(),
            'candidates' => $candidates
                ->take(80)
                ->map(fn (Candidate $c) => $this->slimCandidate($c))
                ->values()
                ->all(),
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Candidate>  $candidates
     * @return array<string, mixed>
     */
    private function buildAnalytics($candidates): array
    {
        $active = $candidates->where('state', 'Active');
        $graduated = $candidates->filter(
            fn (Candidate $c) => CandidateScoreService::isGraduate($c)
        );
        $terminated = $candidates->where('state', 'Terminated');
        $total = $candidates->count();

        $educationDistribution = [];
        $categoryDistribution = [];

        foreach ($candidates as $candidate) {
            $edu = $candidate->education_level ?? 'Unknown';
            $educationDistribution[$edu] = ($educationDistribution[$edu] ?? 0) + 1;
            $avg = CandidateScoreService::overallAverage($candidate);
            $category = CandidateScoreService::categoryFor($avg);
            $categoryDistribution[$category] = ($categoryDistribution[$category] ?? 0) + 1;
        }

        return [
            'total' => $total,
            'active' => $active->count(),
            'graduated' => $graduated->count(),
            'terminated' => $terminated->count(),
            'educationDistribution' => $educationDistribution,
            'categoryDistribution' => $categoryDistribution,
            'successRate' => $total > 0
                ? round(($graduated->count() / $total) * 100, 1)
                : 0,
            'terminationRate' => $total > 0
                ? round(($terminated->count() / $total) * 100, 1)
                : 0,
        ];
    }

    private function buildPromotions(): array
    {
        return Promotion::query()
            ->whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'promo_code', 'name', 'status'])
            ->map(fn (Promotion $p) => [
                'id' => $p->promo_code,
                'name' => $p->name,
                'status' => $p->status,
            ])
            ->all();
    }

    private function slimCandidate(Candidate $candidate): array
    {
        $avg = CandidateScoreService::overallAverage($candidate);

        return [
            'name' => trim("{$candidate->first_name} {$candidate->last_name}"),
            'status' => $candidate->state,
            'avgScore' => $avg,
            'category' => CandidateScoreService::categoryFor($avg),
            'promotion' => $candidate->promotion?->name,
            'education' => $candidate->education_level,
        ];
    }
}
