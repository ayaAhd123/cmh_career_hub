<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\AiController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\PromotionController;

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

        // Custom Promotion endpoints
        Route::get('promotions/archived/list', [PromotionController::class, 'archived']);
        Route::post('promotions/{promotion}/archive', [PromotionController::class, 'archive']);
        Route::post('promotions/{promotion}/restore', [PromotionController::class, 'restore'])->withTrashed();
        Route::delete('promotions/{promotion}/force-delete', [PromotionController::class, 'forceDelete'])->withTrashed();

        // Promotions CRUD
        Route::apiResource('promotions', PromotionController::class);
    });
});
