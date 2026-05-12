<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\HealthController;

Route::prefix('v1')->group(function () {
    Route::get('health', [HealthController::class, 'index']);
});
