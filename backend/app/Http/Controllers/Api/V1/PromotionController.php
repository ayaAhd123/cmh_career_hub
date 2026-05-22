<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PromotionController extends Controller
{
    /**
     * Display a listing of the promotions.
     */
    public function index()
    {
        $promotions = Promotion::orderBy('created_at', 'desc')->get();

        return response()->json(
            $promotions->map(fn($p) => $this->formatPromotion($p))
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
    public function destroy(Promotion $promotion)
    {
        $promotion->delete();
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
            'archived'  => $p->status === 'Archived',
            'createdAt' => $p->created_at->toISOString(),
            'dbId'      => $p->id,
        ];
    }
}
