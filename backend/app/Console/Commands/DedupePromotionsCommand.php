<?php

namespace App\Console\Commands;

use App\Models\Candidate;
use App\Models\Promotion;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DedupePromotionsCommand extends Command
{
    protected $signature = 'promotions:dedupe
        {--dry-run : Show what would be removed without changing the database}';

    protected $description = 'Remove duplicate promotions (same name), keep one per name and merge candidates';

    /** Seeded promo codes always win when present in a duplicate group. */
    private const PREFERRED_CODES = [
        'SPRING2026',
        'WEBDEV2024',
        'DATAQ3',
        'MARKSPRINT',
        'UIUXMASTER',
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $promotions = Promotion::withCount('candidates')->orderBy('id')->get();

        if ($promotions->isEmpty()) {
            $this->info('No promotions found.');
            return self::SUCCESS;
        }

        $groups = $promotions->groupBy(fn (Promotion $p) => $this->normalizeName($p->name));

        $removed = 0;
        $mergedCandidates = 0;

        foreach ($groups as $name => $group) {
            if ($group->count() < 2) {
                continue;
            }

            $keeper = $this->pickKeeper($group);
            $duplicates = $group->where('id', '!=', $keeper->id);

            $this->line('');
            $this->info("Duplicate: \"{$name}\" ({$group->count()} rows) → keep {$keeper->promo_code} (#{$keeper->id})");

            foreach ($duplicates as $dup) {
                $candidateCount = $dup->candidates_count;
                $this->line("  - remove {$dup->promo_code} (#{$dup->id}), candidates: {$candidateCount}");

                if ($dryRun) {
                    $removed++;
                    $mergedCandidates += $candidateCount;
                    continue;
                }

                DB::transaction(function () use ($keeper, $dup, &$mergedCandidates) {
                    $candidates = Candidate::withTrashed()
                        ->where('promotion_id', $dup->id)
                        ->get();

                    foreach ($candidates as $candidate) {
                        $emailTaken = Candidate::withTrashed()
                            ->where('promotion_id', $keeper->id)
                            ->where('email', $candidate->email)
                            ->where('id', '!=', $candidate->id)
                            ->exists();

                        if ($emailTaken) {
                            $candidate->forceDelete();
                        } else {
                            $candidate->promotion_id = $keeper->id;
                            $candidate->save();
                            $mergedCandidates++;
                        }
                    }

                    $dup->forceDelete();
                });

                $removed++;
            }
        }

        $remaining = Promotion::count();

        $this->line('');
        if ($dryRun) {
            $this->warn("Dry run: would remove {$removed} duplicate promotion(s), merge ~{$mergedCandidates} candidate row(s).");
            $this->info("Current total: {$promotions->count()} → would become ~" . ($promotions->count() - $removed));
        } else {
            $this->info("Removed {$removed} duplicate promotion(s). Merged {$mergedCandidates} candidate(s).");
            $this->info("Promotions remaining: {$remaining}");
        }

        return self::SUCCESS;
    }

    private function normalizeName(string $name): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', $name) ?? $name));
    }

    private function pickKeeper(\Illuminate\Support\Collection $group): Promotion
    {
        foreach (self::PREFERRED_CODES as $code) {
            $match = $group->firstWhere('promo_code', $code);
            if ($match) {
                return $match;
            }
        }

        return $group->sort(function (Promotion $a, Promotion $b) {
            if ($a->candidates_count !== $b->candidates_count) {
                return $b->candidates_count <=> $a->candidates_count;
            }

            return $a->id <=> $b->id;
        })->first();
    }
}
