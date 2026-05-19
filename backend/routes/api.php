<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\AiController;

Route::prefix('v1')->group(function () {
    Route::get('health', [HealthController::class, 'index']);
    Route::post('ai/analyze', [AiController::class, 'analyze']);
});
