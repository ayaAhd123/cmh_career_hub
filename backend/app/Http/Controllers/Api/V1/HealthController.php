<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function index(): JsonResponse
    {
        if (config('app.env') === 'production') {
            return response()->json(['status' => 'ok']);
        }

        return response()->json([
            'status' => 'ok',
            'environment' => config('app.env'),
            'version' => app()->version(),
        ]);
    }
}
