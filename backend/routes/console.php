<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// withoutOverlapping : une collecte peut durer plusieurs minutes (résolution
// des liens Google News + métadonnées des articles) ; on n'en lance jamais
// deux en parallèle (doublons, double charge sur les sites sources).
Schedule::command('news:ingest')->everyThirtyMinutes()->withoutOverlapping();
Schedule::command('risk:check-alerts')->dailyAt('06:00');
Schedule::command('meetings:send-reminders')->everyMinute();
