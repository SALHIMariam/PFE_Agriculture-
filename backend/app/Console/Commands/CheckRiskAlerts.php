<?php

namespace App\Console\Commands;

use App\Models\Analysis;
use App\Models\RiskAlertState;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\RiskForecastService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckRiskAlerts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'risk:check-alerts';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = "Vérifie le risque à 7 jours de chaque farmer actif et envoie une alerte early-warning si le seuil est franchi.";

    /** informative < urgent, used to detect a level escalation. */
    private const LEVEL_RANK = [
        'informative' => 1,
        'urgent' => 2,
    ];

    /** Re-notify at the same (or lower) level only after this many hours. */
    private const RENOTIFY_COOLDOWN_HOURS = 72;

    public function handle(RiskForecastService $riskForecastService, NotificationService $notificationService): int
    {
        $farmers = $this->activeFarmersWithRecentDisease();

        $checked = 0;
        $notified = 0;

        foreach ($farmers as $farmer) {
            $checked++;

            $forecast = $riskForecastService->getForecastForUser($farmer);

            if (! $forecast) {
                continue;
            }

            $riskScore = $forecast['days'][7]['risk_score'] ?? null;

            if ($riskScore === null) {
                continue;
            }

            $level = $this->levelFor($riskScore);

            if ($level === null) {
                continue; // < 40 : aucune notification
            }

            if (! $this->shouldNotify($farmer, $forecast, $level)) {
                continue;
            }

            $notificationService->notifyRiskAlert($farmer, $forecast, $level, $riskScore);

            RiskAlertState::updateOrCreate(
                [
                    'user_id' => $farmer->id,
                    'disease' => $forecast['disease'],
                    'governorate' => $forecast['governorate'],
                ],
                [
                    'last_notified_level' => $level,
                    'last_notified_at' => now(),
                ],
            );

            $notified++;
        }

        $summary = "{$checked} agriculteurs vérifiés, {$notified} notifications envoyées.";
        $this->info($summary);
        Log::info('CheckRiskAlerts: '.$summary);

        return self::SUCCESS;
    }

    private function levelFor(int $riskScore): ?string
    {
        return match (true) {
            $riskScore >= 70 => 'urgent',
            $riskScore >= 40 => 'informative',
            default => null,
        };
    }

    /**
     * @param  array{disease: string, governorate: string}  $forecast
     */
    private function shouldNotify(User $farmer, array $forecast, string $level): bool
    {
        $state = RiskAlertState::where('user_id', $farmer->id)
            ->where('disease', $forecast['disease'])
            ->where('governorate', $forecast['governorate'])
            ->first();

        if (! $state) {
            return true;
        }

        $increased = self::LEVEL_RANK[$level] > self::LEVEL_RANK[$state->last_notified_level];

        if ($increased) {
            return true;
        }

        return $state->last_notified_at->diffInHours(now()) >= self::RENOTIFY_COOLDOWN_HOURS;
    }

    /**
     * Active farmers with a governorate and at least one non-healthy
     * analysis in the last 30 days — everyone else has nothing to forecast.
     *
     * @return \Illuminate\Support\Collection<int, User>
     */
    private function activeFarmersWithRecentDisease()
    {
        $farmerIds = Analysis::query()
            ->join('users', 'users.id', '=', 'analyses.user_id')
            ->where('users.is_active', true)
            ->whereNotNull('users.governorate')
            ->where('analyses.predicted_class', 'not like', '%healthy%')
            ->where('analyses.created_at', '>=', now()->subDays(30))
            ->distinct()
            ->pluck('users.id');

        return User::role('farmer')->whereIn('id', $farmerIds)->get();
    }
}
