<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\Promotion;

class PromotionExportService
{
    public function __construct(
        private readonly CandidateFormatter $formatter
    ) {}

    public function exportData(Promotion $promotion): array
    {
        $candidates = Candidate::query()
            ->with([
                'promotion.modules' => fn ($q) => $q->orderBy('module_order'),
                'skills',
                'moduleGrades',
                'promotion',
            ])
            ->where('promotion_id', $promotion->id)
            ->where('state', '!=', 'Archived')
            ->get()
            ->sort(fn (Candidate $a, Candidate $b) => CandidateScoreService::overallAverage($b) <=> CandidateScoreService::overallAverage($a))
            ->values();

        return [
            'candidates' => $candidates
                ->map(fn (Candidate $c) => $this->formatter->formatDetail($c))
                ->all(),
        ];
    }
}
