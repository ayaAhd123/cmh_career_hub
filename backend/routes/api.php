<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\AiController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\PromotionController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\CandidateController;
use App\Http\Controllers\Api\V1\RemindersController;

Route::prefix('v1')->group(function () {
    Route::get('health', [HealthController::class, 'index']);
    Route::post('ai/analyze', [AiController::class, 'analyze']);

    // Auth
    Route::post('auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::put('auth/profile', [AuthController::class, 'updateProfile']);
        Route::post('auth/change-password', [AuthController::class, 'changePassword']);

        Route::get('dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('reminders', [RemindersController::class, 'index']);

        Route::get('candidates/export', [CandidateController::class, 'export']);
        Route::apiResource('candidates', CandidateController::class)->only(['index', 'update', 'destroy']);

        // Custom Promotion endpoints
        Route::get('promotions/{promotion}/stats', [PromotionController::class, 'stats']);
        Route::get('promotions/archived/list', [PromotionController::class, 'archived']);
        Route::post('promotions/{promotion}/archive', [PromotionController::class, 'archive']);
        Route::post('promotions/{promotion}/restore', [PromotionController::class, 'restore'])->withTrashed();
        Route::delete('promotions/{promotion}/force-delete', [PromotionController::class, 'forceDelete'])->withTrashed();

        // Promotions CRUD
        Route::apiResource('promotions', PromotionController::class);
    });
});
