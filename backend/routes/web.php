<?php

use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

// Route::get avec closure remplacée par un contrôleur : les closures ne sont
// pas sérialisables et font échouer `route:cache` en production.
Route::get('/', [WelcomeController::class, 'index']);

Route::get('/auth/google', [GoogleAuthController::class, 'redirect'])
    ->name('google.auth');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])
    ->name('google.callback');
