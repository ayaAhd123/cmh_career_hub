<?php

$frontendOrigins = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('FRONTEND_URLS', 'http://localhost:5173,http://127.0.0.1:5173'))
)));

$isProduction = env('APP_ENV') === 'production';

// Local/dev: permissive origins so Vite proxy and varied ports keep working.
$allowedOrigins = $isProduction ? $frontendOrigins : ['*'];

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => $allowedOrigins,
    'allowed_origins_patterns' => $isProduction
        ? []
        : ['#^https://.*\.app\.github\.dev$#'],
    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
