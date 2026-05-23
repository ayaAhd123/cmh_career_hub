<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\RemindersService;

class RemindersController extends Controller
{
    public function __construct(
        private readonly RemindersService $remindersService,
    ) {}

    public function index()
    {
        return response()->json($this->remindersService->list());
    }
}
