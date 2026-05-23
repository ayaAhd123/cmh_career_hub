<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use App\Services\PromotionStatsService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

class PromotionController extends Controller
{
    public function __construct(
        private readonly PromotionStatsService $statsService
    ) {}

    /**
     * Display a listing of the promotions.
     */
    public function index(Request $request)
    {
        $query = Promotion::query()->orderByDesc('created_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $term = '%' . addcslashes($search, '%_\\') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('promo_code', 'like', $term);
            });
        }

        return response()->json(
            $query->get()->map(fn ($p) => $this->formatPromotion($p))
        );
    }

    /**
     * List archived / soft-deleted promotions (for restore).
     */
    public function archived(Request $request)
    {
        $query = Promotion::onlyTrashed()->orderByDesc('deleted_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $term = '%' . addcslashes($search, '%_\\') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('promo_code', 'like', $term);
            });
        }

        return response()->json(
            $query->get()->map(fn ($p) => $this->formatPromotion($p))
        );
    }

    /**
     * Store a newly created promotion.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'status'     => 'required|in:Active,Pending,Completed,Archived',
        ]);

        // Auto-generate promo_code like PROMO-2026-001
        $year = date('Y');
        $count = Promotion::withTrashed()
            ->where('promo_code', 'like', "PROMO-{$year}-%")
            ->count();
        $next = str_pad($count + 1, 3, '0', STR_PAD_LEFT);
        $validated['promo_code'] = "PROMO-{$year}-{$next}";

        $promotion = Promotion::create($validated);

        return response()->json($this->formatPromotion($promotion), 201);
    }

    /**
     * Display the specified promotion.
     */
    public function show(Promotion $promotion)
    {
        return response()->json($this->formatPromotion($promotion));
    }

    public function stats(Promotion $promotion)
    {
        return response()->json($this->statsService->getStats($promotion));
    }

    /**
     * Update the specified promotion.
     */
    public function update(Request $request, Promotion $promotion)
    {
        $validated = $request->validate([
            'name'       => 'sometimes|required|string|max:255',
            'start_date' => 'sometimes|required|date',
            'end_date'   => 'sometimes|required|date|after_or_equal:start_date',
            'status'     => 'sometimes|required|in:Active,Pending,Completed,Archived',
        ]);

        $promotion->update($validated);

        return response()->json($this->formatPromotion($promotion->fresh()));
    }

    /**
     * Remove the specified promotion (soft delete).
     */
    /**
     * Remove the specified promotion (soft delete).
     */
    public function destroy(Promotion $promotion)
    {
        // Soft delete only — linked candidates stay in the database for restore.
        $promotion->delete();

        return response()->noContent();
    }

    /**
     * Restore a soft-deleted promotion and its visibility in the active list.
     */
    public function restore(Promotion $promotion)
    {
        if (! $promotion->trashed()) {
            return response()->json(['message' => 'Promotion is not deleted.'], 400);
        }

        $promotion->restore();
        $promotion->status = 'Active';
        $promotion->save();

        return response()->json($this->formatPromotion($promotion->fresh()));
    }

    /**
     * Archive (soft delete) a promotion with double validation.
     *
     * The request must include `confirm_one` and `confirm_two` set to true.
     */
    public function archive(Request $request, Promotion $promotion)
    {
        $validator = Validator::make($request->all(), [
            'confirm_one' => ['required', 'accepted'],
            'confirm_two' => ['required', 'accepted'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Double confirmation required for archiving.'], 422);
        }

        // Mark as archived and soft delete
        $promotion->status = 'Archived';
        $promotion->save();
        $promotion->delete();

        return response()->noContent();
    }

    /**
     * Permanently delete a promotion that has been archived, with double validation.
     *
     * The request must include `confirm_one` and `confirm_two` set to true.
     */
    public function forceDelete(Request $request, Promotion $promotion)
    {
        $validator = Validator::make($request->all(), [
            'confirm_one' => ['required', 'accepted'],
            'confirm_two' => ['required', 'accepted'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Double confirmation required for permanent deletion.'], 422);
        }

        if (! $promotion->trashed()) {
            return response()->json(['message' => 'Promotion must be archived before permanent deletion.'], 400);
        }

        $promotion->forceDelete();

        return response()->noContent();
    }

    /**
     * Format a promotion for the frontend.
     * Maps snake_case DB fields to camelCase frontend fields.
     */
    private function formatPromotion(Promotion $p): array
    {
        return [
            'id'        => $p->promo_code,
            'name'      => $p->name,
            'startDate' => $p->start_date->format('Y-m-d'),
            'endDate'   => $p->end_date->format('Y-m-d'),
            'status'    => $p->status,
            'archived'  => $p->trashed() || $p->status === 'Archived',
            'createdAt' => $p->created_at->toISOString(),
            'dbId'      => $p->id,
        ];
    }

    

}
