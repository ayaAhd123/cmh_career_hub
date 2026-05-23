<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\Promotion;
use Illuminate\Support\Collection;

class CandidateQueryService
{
    public function __construct(
        private readonly CandidateFormatter $formatter
    ) {}

    public function list(array $filters): array
    {
        $candidates = $this->baseQuery()->get();
        $filtered = $this->applyFilters($candidates, $filters);
        $sorted = $this->applySort($filtered, $filters['sort'] ?? 'avg_desc');

        return [
            'data' => $sorted->map(fn (Candidate $c) => $this->formatter->formatListItem($c))->values()->all(),
            'meta' => [
                'total' => $sorted->count(),
            ],
        ];
    }

    public function exportRows(array $filters): Collection
    {
        $candidates = $this->baseQuery()->get();
        $filtered = $this->applyFilters($candidates, $filters);
        $sorted = $this->applySort($filtered, $filters['sort'] ?? 'avg_desc');

        return $sorted->map(fn (Candidate $c) => $this->formatter->formatExportRow($c));
    }

    private function baseQuery()
    {
        return Candidate::query()
            ->with([
                'promotion',
                'skills',
                'moduleGrades',
                'promotion.modules' => fn ($q) => $q->orderBy('module_order'),
            ])
            ->where('state', '!=', 'Archived');
    }

    private function applyFilters(Collection $candidates, array $filters): Collection
    {
        $result = $candidates;

        if (! empty($filters['q'])) {
            $q = mb_strtolower(trim($filters['q']));
            $result = $result->filter(function (Candidate $candidate) use ($q) {
                $name = mb_strtolower("{$candidate->first_name} {$candidate->last_name}");

                return str_contains($name, $q)
                    || str_contains(mb_strtolower($candidate->email), $q)
                    || str_contains(mb_strtolower($candidate->phone), $q);
            });
        }

        if (! empty($filters['status']) && $filters['status'] !== 'All') {
            $result = $result->where('state', $filters['status']);
        }

        if (! empty($filters['gender']) && $filters['gender'] !== 'All') {
            $result = $result->where('gender', $filters['gender']);
        }

        if (! empty($filters['education_level']) && $filters['education_level'] !== 'All') {
            $result = $result->where('education_level', $filters['education_level']);
        }

        if (! empty($filters['promotion_id']) && $filters['promotion_id'] !== 'All') {
            if ($filters['promotion_id'] === 'none') {
                $result = $result->whereNull('promotion_id');
            } else {
                $promotionId = $this->resolvePromotionId($filters['promotion_id']);
                if ($promotionId) {
                    $result = $result->where('promotion_id', $promotionId);
                }
            }
        }

        if (! empty($filters['category']) && $filters['category'] !== 'All') {
            $result = $result->filter(function (Candidate $candidate) use ($filters) {
                $avg = CandidateScoreService::overallAverage($candidate);

                return CandidateScoreService::matchesCategory($avg, $filters['category']);
            });
        }

        return $result->values();
    }

    private function applySort(Collection $candidates, string $sort): Collection
    {
        return $candidates->sort(function (Candidate $a, Candidate $b) use ($sort) {
            return match ($sort) {
                'avg_asc' => CandidateScoreService::overallAverage($a) <=> CandidateScoreService::overallAverage($b),
                'name_asc' => strcasecmp("{$a->first_name} {$a->last_name}", "{$b->first_name} {$b->last_name}"),
                'name_desc' => strcasecmp("{$b->first_name} {$b->last_name}", "{$a->first_name} {$a->last_name}"),
                'date_asc' => $a->recruitment_date <=> $b->recruitment_date,
                'date_desc' => $b->recruitment_date <=> $a->recruitment_date,
                default => CandidateScoreService::overallAverage($b) <=> CandidateScoreService::overallAverage($a),
            };
        })->values();
    }

    public function resolvePromotionId(string $promotionRef): ?int
    {
        if (ctype_digit($promotionRef)) {
            return (int) $promotionRef;
        }

        return Promotion::query()
            ->where('promo_code', $promotionRef)
            ->value('id');
    }
}
