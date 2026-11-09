<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    /*
     | The Vite dev server (vite.config.ts) is configured for port 5173 but can
     | fall back to 5174/5175… when that port is taken. List every local origin
     | the SPA might be served from so cross-origin writes (which trigger a CORS
     | preflight) aren't silently blocked. Keep this in sync with
     | SANCTUM_STATEFUL_DOMAINS.
     */
    'allowed_origins' => array_values(array_unique(array_filter([
        env('FRONTEND_URL'),
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
    ]))),

    // Any localhost / 127.0.0.1 port while developing locally.
    'allowed_origins_patterns' => env('APP_ENV') === 'local'
        ? ['#^http://(localhost|127\.0\.0\.1):\d+$#']
        : [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400, // cache CORS preflight for 24h — eliminates duplicate OPTIONS requests

    'supports_credentials' => true,

];
