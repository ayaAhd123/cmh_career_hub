<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\Promotion;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class RemindersService
{
    private const REMINDER_LIMIT = 30;

    public function __construct(
        private readonly PassRateAlertService $passRateAlerts,
        private readonly ReminderStateService $reminderStates,
    ) {}
    private const MIN_CANDIDATES = 5;
    private const ENDING_SOON_DAYS = 7;
    private const STARTING_SOON_DAYS = 7;
    private const EXPECTED_SKILL_COUNT = 10;

    /** @return array{reminders: array<int, array<string, mixed>>, total: int, unreadCount: int, allCount: int} */
    public function list(User $user): array
    {
        $now = Carbon::today();

        $promotions = Promotion::query()
            ->with([
                'modules',
                'candidates' => fn ($q) => $q
                    ->where('state', '!=', 'Archived')
                    ->with(['skills', 'moduleGrades']),
            ])
            ->where('status', '!=', 'Archived')
            ->whereNull('deleted_at')
            ->get();

        $unassigned = Candidate::query()
            ->with(['skills', 'moduleGrades'])
            ->whereNull('promotion_id')
            ->where('state', '!=', 'Archived')
            ->get();

        $items = [];

        foreach ($promotions as $promotion) {
            $items = array_merge($items, $this->promotionReminders($promotion, $now));
            $items = array_merge(
                $items,
                $this->passRateAlerts->promotionAlerts($promotion, $promotion->candidates),
            );
        }

        $items = array_merge($items, $this->passRateAlerts->globalAlerts($promotions));
        $items = array_merge($items, $this->unassignedReminders($unassigned));

        usort($items, fn (array $a, array $b) => $a['priority'] <=> $b['priority']
            ?: strcmp($a['timeLabel'], $b['timeLabel']));

        $allCount = count($items);
        $limited = array_slice($items, 0, self::REMINDER_LIMIT);
        $withState = $this->reminderStates->applyUserState($user->id, $limited);

        return [
            'reminders' => $withState['reminders'],
            'total' => $withState['total'],
            'unreadCount' => $withState['unreadCount'],
            'allCount' => $allCount,
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function promotionReminders(Promotion $promotion, Carbon $now): array
    {
        if (! in_array($promotion->status, ['Active', 'Pending'], true)) {
            return [];
        }

        $items = [];
        $promoId = $promotion->promo_code;
        $startIn = $now->diffInDays($promotion->start_date, false);
        $endIn = $now->diffInDays($promotion->end_date, false);
        $candidates = $promotion->candidates;
        $activeCandidates = $candidates->where('state', 'Active');
        $moduleCount = $promotion->modules->count();

        if ($endIn >= 0 && $endIn <= self::ENDING_SOON_DAYS) {
            $items[] = $this->makeReminder(
                id: "{$promoId}-ending",
                type: 'ending_soon',
                priority: $endIn <= 3 ? 1 : 2,
                title: "\"{$promotion->name}\" ends soon",
                description: $endIn === 0
                    ? "{$promoId} — last day today. Finalize evaluations and update candidate statuses."
                    : "{$promoId} — {$endIn} day(s) left. Finalize evaluations before closure.",
                timeLabel: $endIn === 0 ? 'Today' : "{$endIn}d left",
                promotionId: $promoId,
                icon: 'calendar',
                link: $this->promotionLink($promoId, 'overview'),
            );
        }

        if ($startIn > 0 && $startIn <= self::STARTING_SOON_DAYS) {
            $items[] = $this->makeReminder(
                id: "{$promoId}-starting",
                type: 'starting_soon',
                priority: 3,
                title: "\"{$promotion->name}\" starts soon",
                description: "{$promoId} — launches in {$startIn} day(s). Add candidates and prepare modules.",
                timeLabel: "In {$startIn}d",
                promotionId: $promoId,
                icon: 'calendar',
                link: $this->promotionLink($promoId, 'candidates'),
            );
        }

        if ($startIn <= 0 && $candidates->isEmpty()) {
            $items[] = $this->makeReminder(
                id: "{$promoId}-empty",
                type: 'empty_promotion',
                priority: 1,
                title: "Empty promotion — {$promotion->name}",
                description: "{$promoId} has no candidates. Add participants from the promotion page.",
                timeLabel: '0 candidates',
                promotionId: $promoId,
                icon: 'alert',
                link: $this->promotionLink($promoId, 'candidates'),
            );
        } elseif ($startIn <= 0 && $candidates->count() < self::MIN_CANDIDATES) {
            $items[] = $this->makeReminder(
                id: "{$promoId}-low",
                type: 'low_candidates',
                priority: 2,
                title: "Low headcount — {$promotion->name}",
                description: "Only {$candidates->count()} candidate(s) of ".self::MIN_CANDIDATES." recommended. Consider recruiting more.",
                timeLabel: "{$candidates->count()} cand.",
                promotionId: $promoId,
                icon: 'users',
                link: $this->promotionLink($promoId, 'candidates'),
            );
        }

        $criticalCount = $activeCandidates->filter(function (Candidate $candidate) {
            return CandidateScoreService::categoryFor(
                CandidateScoreService::overallAverage($candidate)
            ) === 'Critical';
        })->count();

        if ($criticalCount > 0 && $startIn <= 0 && $endIn >= 0) {
            $label = $criticalCount === 1 ? '1 critical candidate' : "{$criticalCount} critical candidates";
            $items[] = $this->makeReminder(
                id: "{$promoId}-critical",
                type: 'critical_candidates',
                priority: 2,
                title: "{$label} — {$promotion->name}",
                description: "Review at-risk candidates in {$promoId} (overall average below 2.5).",
                timeLabel: $label,
                promotionId: $promoId,
                icon: 'alert',
                link: [
                    'to' => '/candidates',
                    'search' => [
                        'promotion_id' => $promoId,
                        'category' => 'Critical',
                    ],
                ],
            );
        }

        $incompleteCount = $activeCandidates->filter(
            fn (Candidate $candidate) => $this->hasIncompleteEvaluation($candidate, $moduleCount)
        )->count();

        if ($incompleteCount > 0 && $startIn <= 0 && $endIn >= -self::ENDING_SOON_DAYS) {
            $label = $incompleteCount === 1 ? '1 incomplete evaluation' : "{$incompleteCount} incomplete evaluations";
            $items[] = $this->makeReminder(
                id: "{$promoId}-incomplete",
                type: 'incomplete_evaluations',
                priority: 2,
                title: "{$label} — {$promotion->name}",
                description: "Some active candidates are missing module scores or skill ratings in {$promoId}.",
                timeLabel: $label,
                promotionId: $promoId,
                icon: 'clipboard',
                link: [
                    'to' => '/candidates',
                    'search' => [
                        'promotion_id' => $promoId,
                        'status' => 'Active',
                    ],
                ],
            );
        }

        if ($endIn < 0 && $promotion->status === 'Active') {
            $activeCount = $activeCandidates->count();
            $items[] = $this->makeReminder(
                id: "{$promoId}-closure",
                type: 'closure_pending',
                priority: 1,
                title: "Promotion ended — {$promotion->name}",
                description: $activeCount > 0
                    ? "{$promoId} ended ".abs($endIn)." day(s) ago with {$activeCount} active candidate(s). Mark as Completed and update statuses."
                    : "{$promoId} ended ".abs($endIn)." day(s) ago. Mark the promotion as Completed.",
                timeLabel: abs($endIn).'d overdue',
                promotionId: $promoId,
                icon: 'alert',
                link: $this->promotionLink($promoId, 'overview'),
            );
        }

        return $items;
    }

    /** @param Collection<int, Candidate> $candidates @return array<int, array<string, mixed>> */
    private function unassignedReminders(Collection $candidates): array
    {
        if ($candidates->isEmpty()) {
            return [];
        }

        $count = $candidates->count();
        $label = $count === 1 ? '1 unassigned candidate' : "{$count} unassigned candidates";

        return [
            $this->makeReminder(
                id: 'unassigned-candidates',
                type: 'unassigned_candidates',
                priority: 2,
                title: $label,
                description: 'These candidates have no promotion assigned. Assign them from All Candidates.',
                timeLabel: $label,
                promotionId: null,
                icon: 'users',
                link: [
                    'to' => '/candidates',
                    'search' => ['promotion_id' => 'none'],
                ],
            ),
        ];
    }

    private function hasIncompleteEvaluation(Candidate $candidate, int $moduleCount): bool
    {
        $candidate->loadMissing(['skills', 'moduleGrades']);

        if ($moduleCount > 0 && $candidate->moduleGrades->count() < $moduleCount) {
            return true;
        }

        if ($candidate->moduleGrades->isNotEmpty() && $candidate->moduleGrades->every(fn ($g) => (float) $g->score <= 0)) {
            return true;
        }

        if ($candidate->skills->count() < self::EXPECTED_SKILL_COUNT) {
            return true;
        }

        if ($candidate->skills->isNotEmpty() && $candidate->skills->every(fn ($s) => (float) $s->score <= 0)) {
            return true;
        }

        return false;
    }

    /** @return array<string, mixed> */
    private function promotionLink(string $promoId, string $tab): array
    {
        return [
            'to' => '/promotions/$id',
            'params' => ['id' => $promoId],
            'search' => ['tab' => $tab],
        ];
    }

    /** @return array<string, mixed> */
    private function makeReminder(
        string $id,
        string $type,
        int $priority,
        string $title,
        string $description,
        string $timeLabel,
        ?string $promotionId,
        string $icon,
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
            'icon' => $icon,
            'link' => $link ?? ($promotionId ? [
                'to' => '/promotions/$id',
                'params' => ['id' => $promotionId],
            ] : [
                'to' => '/candidates',
            ]),
        ];
    }
}
