<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ReminderStateService;
use App\Services\RemindersService;
use Illuminate\Http\Request;

class RemindersController extends Controller
{
    public function __construct(
        private readonly RemindersService $remindersService,
        private readonly ReminderStateService $reminderStateService,
    ) {}

    public function index(Request $request)
    {
        return response()->json(
            $this->remindersService->list($request->user())
        );
    }

    public function markRead(Request $request, string $reminderId)
    {
        $this->reminderStateService->markRead($request->user(), $reminderId);

        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|string|max:120',
        ]);

        $this->reminderStateService->markAllRead($request->user(), $validated['ids']);

        return response()->json(['ok' => true]);
    }

    public function dismiss(Request $request, string $reminderId)
    {
        $this->reminderStateService->dismiss($request->user(), $reminderId);

        return response()->json(['ok' => true]);
    }

    public function snooze(Request $request, string $reminderId)
    {
        $validated = $request->validate([
            'hours' => 'nullable|integer|min:1|max:168',
        ]);

        $this->reminderStateService->snooze(
            $request->user(),
            $reminderId,
            $validated['hours'] ?? 24,
        );

        return response()->json(['ok' => true]);
    }
}
