<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Google Gemini API
    |--------------------------------------------------------------------------
    | Add GOOGLE_API_KEY to backend/.env (never expose in the frontend).
    */
    'google_api_key' => env('GOOGLE_API_KEY'),
    'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
    'timeout' => (int) env('GEMINI_TIMEOUT', 60),
];
