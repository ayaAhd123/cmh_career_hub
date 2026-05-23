<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserReminderState;
use Illuminate\Support\Collection;

class ReminderStateService
{
    /** @return Collection<string, UserReminderState> */
    public function statesForUser(int $userId): Collection
    {
        return UserReminderState::query()
            ->where('user_id', $userId)
            ->get()
            ->keyBy('reminder_id');
    }

    /** @param array<int, array<string, mixed>> $reminders */
    public function applyUserState(int $userId, array $reminders): array
    {
        $states = $this->statesForUser($userId);
        $now = now();

        $visible = collect($reminders)->filter(function (array $reminder) use ($states, $now) {
            $state = $states->get($reminder['id']);

            if ($state?->status === 'dismissed') {
                return false;
            }

            if ($state?->status === 'snoozed' && $state->snoozed_until?->isFuture()) {
                return false;
            }

            return true;
        })->map(function (array $reminder) use ($states) {
            $state = $states->get($reminder['id']);
            $reminder['isRead'] = $state !== null && in_array($state->status, ['read', 'dismissed'], true);

            return $reminder;
        })->values();

        $ids = $visible->pluck('id')->all();
        $unreadCount = $visible->filter(fn (array $r) => ! $r['isRead'])->count();

        return [
            'reminders' => $visible->all(),
            'total' => $visible->count(),
            'unreadCount' => $unreadCount,
            'allCount' => count($reminders),
        ];
    }

    public function markRead(User $user, string $reminderId): void
    {
        $this->upsertState($user->id, $reminderId, 'read');
    }

    /** @param list<string> $reminderIds */
    public function markAllRead(User $user, array $reminderIds): void
    {
        foreach ($reminderIds as $reminderId) {
            $this->upsertState($user->id, $reminderId, 'read');
        }
    }

    public function dismiss(User $user, string $reminderId): void
    {
        $this->upsertState($user->id, $reminderId, 'dismissed');
    }

    public function snooze(User $user, string $reminderId, int $hours = 24): void
    {
        UserReminderState::updateOrCreate(
            [
                'user_id' => $user->id,
                'reminder_id' => $reminderId,
            ],
            [
                'status' => 'snoozed',
                'snoozed_until' => now()->addHours($hours),
            ],
        );
    }

    private function upsertState(int $userId, string $reminderId, string $status): void
    {
        UserReminderState::updateOrCreate(
            [
                'user_id' => $userId,
                'reminder_id' => $reminderId,
            ],
            [
                'status' => $status,
                'snoozed_until' => null,
            ],
        );
    }
}
