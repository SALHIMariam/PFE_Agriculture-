<?php

use App\Http\Controllers\Api\Admin\AnalysisController as AdminAnalysisController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AnalysisController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\CopilotController;
use App\Http\Controllers\Api\ExpertAnalysisController;
use App\Http\Controllers\Api\ExpertAnalyticsController;
use App\Http\Controllers\Api\ExpertIntelligenceController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\HeatmapController;
use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RiskController;
use App\Http\Controllers\Api\WeatherController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes publiques
|--------------------------------------------------------------------------
*/
Route::middleware('throttle:6,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    // Réinitialisation du mot de passe (lien envoyé par email)
    Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
    Route::post('/reset-password',  [PasswordResetController::class, 'resetPassword']);
});

/*
|--------------------------------------------------------------------------
| Routes authentifiées (auth:sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Profil
    Route::get('/profile',                [ProfileController::class, 'show']);
    Route::put('/profile',                [ProfileController::class, 'update']);
    Route::put('/profile/password',       [ProfileController::class, 'updatePassword']);
    Route::put('/profile/force-password', [ProfileController::class, 'forcePasswordChange']);
    Route::post('/profile/avatar',        [ProfileController::class, 'updateAvatar']);
    Route::put('/user/notification-preferences', [ProfileController::class, 'updateNotificationPreferences']);
    Route::put('/user/preferences',       [ProfileController::class, 'updatePreferences']);

    // Analyses
    Route::post('/analyses',                      [AnalysisController::class, 'store']);
    Route::get('/analyses',                       [AnalysisController::class, 'index']);
    Route::get('/analyses/latest',                [AnalysisController::class, 'latest']);
    Route::get('/analyses/{analysis}',             [AnalysisController::class, 'show']);
    Route::get('/analyses/{analysis}/messages',    [AnalysisController::class, 'messages']);
    Route::post('/analyses/{analysis}/messages',   [AnalysisController::class, 'addMessage']);
    Route::patch('/analyses/{analysis}/messages/{message}',  [AnalysisController::class, 'updateMessage']);
    Route::delete('/analyses/{analysis}/messages/{message}', [AnalysisController::class, 'deleteMessage']);
    Route::delete('/analyses/{analysis}',          [AnalysisController::class, 'destroy']);

    // Validation experte (rôles expert et admin uniquement)
    Route::middleware('role:expert,admin')->group(function () {
        Route::patch('/analyses/{analysis}/validate', [AnalysisController::class, 'validate']);
        Route::patch('/analyses/{analysis}/validate-cnn', [AnalysisController::class, 'validateCnn']);
        Route::patch('/analyses/{analysis}/validate-recommendation', [AnalysisController::class, 'validateRecommendation']);
        Route::get('/expert/analyses', [ExpertAnalysisController::class, 'index']);
    });

    // Heatmap des maladies (toutes les données déjà filtrées / agrégées par gouvernorat)
    Route::get('/heatmap/points',   [HeatmapController::class, 'points']);
    Route::get('/heatmap/ranking',  [HeatmapController::class, 'ranking']);
    Route::get('/heatmap/timeline', [HeatmapController::class, 'timeline']);
    Route::get('/heatmap/alerts',   [HeatmapController::class, 'alerts']);
    Route::get('/governorates/{governorate}/summary', [HeatmapController::class, 'summary']);

    // Actualités / veille IA
    Route::get('/news',          [NewsController::class, 'index']);
    Route::get('/news/trending', [NewsController::class, 'trending']);

    // Statistiques (Farmer)
    Route::get('/stats/overview', [StatsController::class, 'overview']);
    Route::get('/stats/farmer-dashboard', [StatsController::class, 'farmerDashboard']);
    Route::get('/stats/analyses', [StatsController::class, 'analyses']);
    Route::get('/stats/ai-summary', [StatsController::class, 'aiSummary']);
    Route::get('/stats/regional-map', [StatsController::class, 'regionalMap']);
    Route::get('/stats/disease-distribution', [StatsController::class, 'diseaseDistribution']);
    Route::get('/stats/analyses-per-day', [StatsController::class, 'analysesPerDay']);
    Route::get('/stats/crop-diversity', [StatsController::class, 'cropDiversity']);

    // Prévision de risque de propagation (farmer + admin, scope adapté selon rôle)
    Route::get('/stats/risk-evolution', [RiskController::class, 'riskEvolution']);

    // Météo actuelle du gouvernorat de l'utilisateur connecté
    Route::get('/weather/current', [WeatherController::class, 'current']);

    // Prévision de risque (Farmer)
    Route::middleware('role:farmer')->group(function () {
        Route::get('/risk-forecast', [RiskController::class, 'forecast']);
        Route::get('/risk-forecast/calendar', [RiskController::class, 'calendar']);
        Route::get('/risk-forecast/diseases', [RiskController::class, 'regionDiseases']);
    });

    // Smart Calendar (rôles expert et admin uniquement)
    Route::middleware('role:expert,admin')->prefix('calendar')->group(function () {
        Route::get('/events', [CalendarController::class, 'getEvents']);
        Route::get('/day-stats', [CalendarController::class, 'getDayStats']);
        Route::post('/notes', [CalendarController::class, 'storeNote']);
        Route::delete('/notes/{note}', [CalendarController::class, 'deleteNote']);
    });

    // Assistant AI (rôles expert et admin uniquement)
    Route::middleware('role:expert,admin')->prefix('copilot')->group(function () {
        Route::get('/queue',               [CopilotController::class, 'queue']);
        Route::get('/prepare/{analysis}',  [CopilotController::class, 'prepare']);
        Route::get('/batches',             [CopilotController::class, 'batches']);
        Route::post('/{analysis}/respond', [CopilotController::class, 'respond']);
        Route::post('/{analysis}/revise',  [CopilotController::class, 'revise']);
        Route::get('/stats',               [CopilotController::class, 'stats']);
        Route::get('/daily-stats',         [CopilotController::class, 'dailyStats']);
    });

    // Statistiques Globales / Expert Analytics (rôles expert et admin uniquement)
    Route::middleware('role:expert,admin')->prefix('expert-analytics')->group(function () {
        Route::get('/combined',              [ExpertAnalyticsController::class, 'combined']);
        Route::get('/overview',              [ExpertAnalyticsController::class, 'overview']);
        Route::get('/agreement',             [ExpertAnalyticsController::class, 'agreement']);
        Route::get('/corrections',           [ExpertAnalyticsController::class, 'corrections']);
        Route::get('/workload',              [ExpertAnalyticsController::class, 'workload']);
        Route::get('/response-time',         [ExpertAnalyticsController::class, 'responseTime']);
        Route::get('/disease-validation',    [ExpertAnalyticsController::class, 'diseaseValidation']);
        Route::get('/confidence-correction', [ExpertAnalyticsController::class, 'confidenceCorrection']);
        Route::get('/contribution',          [ExpertAnalyticsController::class, 'contribution']);
    });

    // Statistiques Globales — Layer 2 : Intelligent Analytics (rôles expert et admin uniquement)
    Route::middleware('role:expert,admin')->prefix('expert-intelligence')->group(function () {
        Route::get('/overview',               [ExpertIntelligenceController::class, 'overview']);
        Route::get('/reliability-matrix',     [ExpertIntelligenceController::class, 'reliabilityMatrix']);
        Route::get('/overconfidence',         [ExpertIntelligenceController::class, 'overconfidence']);
        Route::get('/calibration',            [ExpertIntelligenceController::class, 'calibration']);
        Route::get('/disease-weakness',       [ExpertIntelligenceController::class, 'diseaseWeakness']);
        Route::get('/attention-queue',        [ExpertIntelligenceController::class, 'attentionQueue']);
        Route::get('/learning-opportunities', [ExpertIntelligenceController::class, 'learningOpportunities']);
        Route::get('/insights',               [ExpertIntelligenceController::class, 'insights']);
    });

    // Meetings / Google Meet (visible aux experts et admin, gestion admin uniquement)
    Route::middleware('role:expert,admin')->prefix('meetings')->group(function () {
        Route::get('/', [MeetingController::class, 'index']);

        Route::middleware('role:admin')->group(function () {
            Route::get('/experts', [MeetingController::class, 'experts']);
            Route::post('/', [MeetingController::class, 'store']);
            Route::post('/{meeting}/send', [MeetingController::class, 'send']);
            Route::delete('/{meeting}', [MeetingController::class, 'destroy']);
        });
    });

    // Notifications in-app
    Route::get('/notifications',                [NotificationController::class, 'index']);
    Route::patch('/notifications/read-all',      [NotificationController::class, 'markAllAsRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::delete('/notifications/{notification}',     [NotificationController::class, 'destroy']);

    /*
    |----------------------------------------------------------------------
    | Routes admin (role:admin)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::patch('users/{user}/status', [UserController::class, 'toggleStatus']);
        Route::get('risk-top', [RiskController::class, 'adminTop']);
    });

    // Ouvert à admin ET expert (page /dashboard/analyses côté front, et les
    // 3 stats de /dashboard) : lecture seule, aucune gestion de compte, et
    // l'expert a déjà accès à des données équivalentes/plus larges via
    // ExpertAnalysisController — pas de fuite de privilège, contrairement à
    // users CRUD ci-dessus.
    Route::middleware('role:admin,expert')->prefix('admin')->group(function () {
        Route::get('analyses', [AdminAnalysisController::class, 'index']);
        Route::get('stats', [AdminDashboardController::class, 'stats']);
        Route::get('analyses-monthly', [AdminDashboardController::class, 'analysesMonthly']);
        Route::get('top-diseases', [AdminDashboardController::class, 'topDiseases']);
    });

    // Google Calendar / Meet (admin uniquement)
    Route::middleware('role:admin')->prefix('google')->group(function () {
        Route::get('/auth-url', [GoogleAuthController::class, 'authUrl']);
        Route::get('/status', [GoogleAuthController::class, 'status']);
        Route::delete('/disconnect', [GoogleAuthController::class, 'disconnect']);
    });
});
