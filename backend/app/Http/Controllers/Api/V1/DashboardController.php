<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DashboardStatsService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardStatsService $statsService
    ) {}

    public function stats(Request $request)
    {
        $validated = $request->validate([
            'timeRange' => 'nullable|in:all,today,yesterday,current_week,last_week,current_month,last_month,current_year,last_year,custom',
            'customStart' => 'nullable|date',
            'customEnd' => 'nullable|date|after_or_equal:customStart',
        ]);

        $stats = $this->statsService->getStats(
            $validated['timeRange'] ?? 'all',
            $validated['customStart'] ?? null,
            $validated['customEnd'] ?? null,
        );

        return response()->json($stats);
    }
}
