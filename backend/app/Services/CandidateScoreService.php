<?php

namespace App\Services;

use App\Models\Candidate;

class CandidateScoreService
{
    public static function overallAverage(Candidate $candidate): float
    {
        $skills = $candidate->skills;

        $disciplineAvg = $skills->where('category', 'Discipline')->avg('score') ?? 0;
        $workAvg = $skills->where('category', 'Work Skills')->avg('score') ?? 0;
        $skillsAvg = ($disciplineAvg + $workAvg) / 2;

        $grades = $candidate->moduleGrades;
        $testsAvg = $grades->count() > 0 ? (float) $grades->avg('score') : 0;

        return round((($skillsAvg + ($testsAvg / 4)) / 2), 2);
    }

    public static function passRate(iterable $candidates): int
    {
        $active = collect($candidates)->filter(
            fn (Candidate $c) => $c->state !== 'Archived'
        );

        if ($active->isEmpty()) {
            return 0;
        }

        $passed = $active->filter(
            fn (Candidate $c) => self::overallAverage($c) >= 2.5
        )->count();

        return (int) round(($passed / $active->count()) * 100);
    }

    public static function turnoverRate(iterable $candidates): int
    {
        $active = collect($candidates)->filter(
            fn (Candidate $c) => $c->state !== 'Archived'
        );

        if ($active->isEmpty()) {
            return 0;
        }

        $out = $active->filter(
            fn (Candidate $c) => in_array($c->state, ['Dismissed', 'Terminated'], true)
        )->count();

        return (int) round(($out / $active->count()) * 100);
    }

    public static function globalAverage(iterable $candidates): float
    {
        $withScores = collect($candidates)->filter(
            fn (Candidate $c) => $c->state !== 'Archived' && $c->moduleGrades->isNotEmpty()
        );

        if ($withScores->isEmpty()) {
            return 0;
        }

        $sum = $withScores->sum(fn (Candidate $c) => self::overallAverage($c));

        return round($sum / $withScores->count(), 1);
    }

    public static function categoryFor(float $avg): string
    {
        return match (true) {
            $avg >= 4.0 => 'Excellent',
            $avg >= 3.5 => 'Good',
            $avg >= 2.5 => 'Passable',
            default => 'Critical',
        };
    }

    public static function matchesCategory(float $avg, string $category): bool
    {
        return self::categoryFor($avg) === $category;
    }
}
