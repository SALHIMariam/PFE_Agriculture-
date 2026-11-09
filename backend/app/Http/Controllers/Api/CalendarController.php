<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Analysis;
use App\Models\AnalysisMessage;
use App\Models\CalendarNote;
use App\Models\RiskAlertState;
use App\Services\NotificationService;
use App\Services\RiskRankingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class CalendarController extends Controller
{
    private const EVENTS_CACHE_TTL_MINUTES = 3;

    public function __construct(
        private readonly RiskRankingService $riskRankingService,
        private readonly NotificationService $notificationService,
    ) {
    }

    /**
     * GET /api/calendar/events?year=&month=
     *
     * Agrège les événements de 5 sources sur le mois demandé. Le résultat ne
     * dépend pas de l'utilisateur (même vue pour tout expert/admin) donc il
     * est mis en cache 3 min, partagé entre tous — storeNote()/deleteNote()
     * invalident le cache du mois concerné pour rester à jour immédiatement.
     */
    public function getEvents(Request $request): JsonResponse
    {
        $year = (int) $request->query('year', now()->year);
        $month = (int) $request->query('month', now()->month);

        if ($month < 1 || $month > 12 || $year < 2000 || $year > 2100) {
            $year = now()->year;
            $month = now()->month;
        }

        $payload = Cache::remember(
            self::eventsCacheKey($year, $month),
            now()->addMinutes(self::EVENTS_CACHE_TTL_MINUTES),
            fn () => $this->buildEventsPayload($year, $month),
        );

        return response()->json($payload);
    }

    private static function eventsCacheKey(int $year, int $month): string
    {
        return "calendar_events:{$year}:{$month}";
    }

    private function buildEventsPayload(int $year, int $month): array
    {
        $start = Carbon::create($year, $month, 1)->startOfDay();
        $end = (clone $start)->endOfMonth()->endOfDay();

        $events = [];

        // ─── SOURCE 1 : Analyses soumises par les farmers (1 synthèse/jour) ─
        // Regroupé par jour (comme les questions farmers ci-dessous) : une
        // seule carte "N analyse(s)" par jour au lieu d'une carte par
        // analyse — un mois chargé pouvait produire 800+ événements sinon
        // (aucun code frontend ne lit meta.analysis_id individuellement, le
        // détail complet reste disponible via /day-stats au clic sur le jour).
        $analyses = Analysis::whereBetween('created_at', [$start, $end])
            ->where('status', 'done')
            ->get(['id', 'validation_status', 'created_at']);

        $analysesByDay = $analyses->groupBy(fn ($a) => $a->created_at->format('Y-m-d'));

        foreach ($analysesByDay as $day => $dayAnalyses) {
            $pending = $dayAnalyses->where('validation_status', 'pending')->count();

            $events[] = [
                'type' => 'analysis',
                'id' => "analysis_{$day}",
                'date' => $day,
                'title' => '🌿 '.$dayAnalyses->count().' analyse(s) soumises',
                'subtitle' => $pending > 0 ? "{$pending} en attente de validation" : 'Toutes traitées',
                'color' => '#2196F3',
                'icon' => '🌿',
                'meta' => [
                    'count' => $dayAnalyses->count(),
                    'pending' => $pending,
                ],
            ];
        }

        // ─── SOURCE 2 : Validations expert (CNN + reco), 1 synthèse/jour ───
        $validatedAnalyses = Analysis::where(function ($q) use ($start, $end) {
            $q->whereBetween('cnn_validated_at', [$start, $end])
                ->orWhereBetween('reco_validated_at', [$start, $end]);
        })->get(['id', 'cnn_validated_at', 'cnn_validation_status', 'reco_validated_at', 'reco_validation_status']);

        $validationsByDay = [];
        $validationCount = 0;

        foreach ($validatedAnalyses as $a) {
            foreach ([
                ['at' => $a->cnn_validated_at, 'status' => $a->cnn_validation_status],
                ['at' => $a->reco_validated_at, 'status' => $a->reco_validation_status],
            ] as $v) {
                if ($v['at'] && $v['at']->between($start, $end)) {
                    $validationCount++;
                    $day = $v['at']->format('Y-m-d');
                    $validationsByDay[$day]['validated'] = ($validationsByDay[$day]['validated'] ?? 0) + ($v['status'] === 'validated' ? 1 : 0);
                    $validationsByDay[$day]['rejected'] = ($validationsByDay[$day]['rejected'] ?? 0) + ($v['status'] === 'rejected' ? 1 : 0);
                }
            }
        }

        foreach ($validationsByDay as $day => $counts) {
            $validated = $counts['validated'] ?? 0;
            $rejected = $counts['rejected'] ?? 0;
            $total = $validated + $rejected;

            $events[] = [
                'type' => 'validation',
                'id' => "validation_{$day}",
                'date' => $day,
                'title' => '👨‍🔬 '.$total.' validation(s)',
                'subtitle' => "{$validated} validées · {$rejected} rejetées",
                'color' => $rejected > $validated ? '#FF5722' : '#4CAF50',
                'icon' => '👨‍🔬',
                'meta' => [
                    'count' => $total,
                    'validated' => $validated,
                    'rejected' => $rejected,
                ],
            ];
        }

        // ─── SOURCE 3 : Alertes de risque AI ──────────────────────────────
        $riskEventCount = 0;
        $urgentStates = collect();

        if (Schema::hasTable('risk_alert_states')) {
            $urgentStates = RiskAlertState::whereBetween('last_notified_at', [$start, $end])
                ->where('last_notified_level', 'urgent')
                ->get();
        }

        if ($urgentStates->isNotEmpty()) {
            foreach ($urgentStates as $state) {
                $diseaseShort = str_contains($state->disease, '__')
                    ? Str::after($state->disease, '__')
                    : $state->disease;
                $crop = Str::contains($state->disease, '__')
                    ? Str::before($state->disease, '__')
                    : ($state->disease);
                $date = $state->last_notified_at->format('Y-m-d');

                $riskEventCount++;
                $events[] = [
                    'type' => 'risk_alert',
                    'id' => "risk_{$state->disease}_{$state->governorate}_{$date}",
                    'date' => $date,
                    'title' => "🚨 Risque élevé — {$crop} {$diseaseShort}",
                    'subtitle' => "📍 {$state->governorate}",
                    'color' => '#F44336',
                    'icon' => '🚨',
                    'meta' => [
                        'disease' => $state->disease,
                        'crop' => $crop,
                        'governorate' => $state->governorate,
                        'risk_score' => null,
                        'risk_level' => 'urgent',
                        'top_factors' => [],
                    ],
                ];
            }
        } else {
            // Repli : pas d'alerte notifiée → on projette le classement de
            // risque du service sur ses 7 prochains jours de prévision, une
            // synthèse par jour. getTopRisksWithForecast() relit le cache 6h
            // que le service vient de peupler : aucun appel FastAPI en plus.
            try {
                $ranked = $this->riskRankingService->getTopRisksWithForecast(10);
            } catch (\Throwable) {
                $ranked = [];
            }

            $startStr = $start->toDateString();
            $endStr = $end->toDateString();
            $zonesByDate = [];

            foreach ($ranked as $risk) {
                foreach ($risk['days'] as $day) {
                    if (($day['risk_score'] ?? null) === null) {
                        continue;
                    }

                    $d = $day['date'];
                    if ($d < $startStr || $d > $endStr) {
                        continue;
                    }

                    $zonesByDate[$d][] = [
                        'governorate' => $risk['governorate'],
                        'crop' => $risk['crop'],
                        'disease' => $risk['disease'],
                        'disease_short' => str_contains($risk['disease'], '__')
                            ? Str::after($risk['disease'], '__')
                            : $risk['disease'],
                        'risk_score' => $day['risk_score'],
                        'risk_level' => $day['risk_level'] ?? null,
                    ];
                }
            }

            ksort($zonesByDate);

            foreach ($zonesByDate as $d => $zones) {
                usort($zones, fn ($a, $b) => $b['risk_score'] <=> $a['risk_score']);

                $maxScore = $zones[0]['risk_score'];
                $topZone = $zones[0]['governorate'];
                $count = count($zones);

                $riskEventCount++;
                $events[] = [
                    'type' => 'risk_alert',
                    'id' => "risk_{$d}",
                    'date' => $d,
                    'title' => "🚨 {$count} zone(s) à risque",
                    'subtitle' => "Pic {$maxScore}% · {$topZone}",
                    'color' => $maxScore >= 70 ? '#F44336' : '#FF9800',
                    'icon' => '🚨',
                    'meta' => [
                        'day' => $d,
                        'zone_count' => $count,
                        'max_score' => $maxScore,
                        'zones' => array_slice($zones, 0, 12),
                    ],
                ];
            }
        }

        // ─── SOURCE 4 : Questions farmers (1 synthèse par jour) ────────────
        $farmerMessages = AnalysisMessage::whereBetween('created_at', [$start, $end])
            ->whereHas('user', fn ($q) => $q->role('farmer'))
            ->with(['user', 'analysis.user'])
            ->get();

        $messagesByDay = $farmerMessages->groupBy(fn ($m) => $m->created_at->format('Y-m-d'));

        foreach ($messagesByDay as $day => $dayMessages) {
            $unanswered = $dayMessages->filter(
                fn ($m) => ! $this->hasExpertReply($m->analysis_id, $m->created_at)
            )->count();

            $events[] = [
                'type' => 'farmer_question',
                'id' => "questions_{$day}",
                'date' => $day,
                'title' => '💬 '.$dayMessages->count().' question(s) farmer',
                'subtitle' => "{$unanswered} sans réponse",
                'color' => '#9C27B0',
                'icon' => '💬',
                'meta' => [
                    'count' => $dayMessages->count(),
                    'messages' => $dayMessages->take(20)->map(fn ($m) => [
                        'analysis_id' => $m->analysis_id,
                        'farmer_name' => $m->user->full_name ?? null,
                        'message_preview' => Str::limit((string) $m->message, 50),
                    ])->values(),
                ],
            ];
        }

        // ─── SOURCE 5 : Notes manuelles admin/expert ──────────────────────
        $notes = CalendarNote::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->with('user')
            ->get();

        foreach ($notes as $note) {
            $content = (string) $note->content;
            $role = $note->user?->getRoleNames()->first() ?? '—';

            $events[] = [
                'type' => 'note',
                'id' => "note_{$note->id}",
                'date' => $note->date->format('Y-m-d'),
                'title' => Str::limit($content, 50),
                'subtitle' => 'Par : '.($note->user->full_name ?? '—')." ({$role})",
                'color' => $note->color,
                'icon' => '📝',
                'meta' => [
                    'note_id' => $note->id,
                    'full_content' => $content,
                    'author_id' => $note->user_id,
                    'author_name' => $note->user->full_name ?? null,
                ],
            ];
        }

        // Tri par date ASC (ordre stable pour les événements du même jour).
        usort($events, fn ($a, $b) => $a['date'] <=> $b['date']);

        $pendingValidations = Analysis::whereBetween('created_at', [$start, $end])
            ->where('validation_status', 'pending')
            ->count();

        return [
            'events' => $events,
            'summary' => [
                'total_analyses' => $analyses->count(),
                'total_validations' => $validationCount,
                'total_risk_alerts' => $riskEventCount,
                'total_questions' => $farmerMessages->count(),
                'total_notes' => $notes->count(),
                'pending_validations' => $pendingValidations,
            ],
        ];
    }

    /**
     * GET /api/calendar/day-stats?date=YYYY-MM-DD
     */
    public function getDayStats(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
        ]);

        $day = Carbon::parse($validated['date']);
        $start = $day->copy()->startOfDay();
        $end = $day->copy()->endOfDay();

        // ── Analyses ──
        $dayAnalyses = Analysis::whereBetween('created_at', [$start, $end])
            ->where('status', 'done')
            ->get(['id', 'predicted_class', 'validation_status', 'reco_validation_status']);

        $healthy = $dayAnalyses->filter(
            fn ($a) => $a->predicted_class && str_contains(strtolower($a->predicted_class), 'healthy')
        )->count();

        $analyses = [
            'total' => $dayAnalyses->count(),
            'diseases_detected' => $dayAnalyses->count() - $healthy,
            'healthy' => $healthy,
            'pending_validation' => $dayAnalyses->where('validation_status', 'pending')->count(),
        ];

        // ── Validations ──
        $validationAnalyses = Analysis::where(function ($q) use ($start, $end) {
            $q->whereBetween('cnn_validated_at', [$start, $end])
                ->orWhereBetween('reco_validated_at', [$start, $end]);
        })->get(['id', 'cnn_validated_at', 'cnn_validation_status', 'reco_validated_at', 'reco_validation_status']);

        $vTotal = $vOk = $vRej = 0;
        foreach ($validationAnalyses as $a) {
            foreach ([
                ['at' => $a->cnn_validated_at, 'status' => $a->cnn_validation_status],
                ['at' => $a->reco_validated_at, 'status' => $a->reco_validation_status],
            ] as $v) {
                if ($v['at'] && $v['at']->between($start, $end)) {
                    $vTotal++;
                    if ($v['status'] === 'validated') {
                        $vOk++;
                    } elseif ($v['status'] === 'rejected') {
                        $vRej++;
                    }
                }
            }
        }

        // ── Alertes de risque ──
        $riskAlerts = ['total' => 0, 'urgent' => 0, 'high_risk_zones' => []];

        if (Schema::hasTable('risk_alert_states')) {
            $rows = RiskAlertState::whereBetween('last_notified_at', [$start, $end])->get();
            $riskAlerts['total'] = $rows->count();
            $riskAlerts['urgent'] = $rows->where('last_notified_level', 'urgent')->count();
            $riskAlerts['high_risk_zones'] = $rows->map(fn ($r) => [
                'governorate' => $r->governorate,
                'disease' => $r->disease,
                'risk_score' => null,
            ])->values();
        }

        if ($riskAlerts['total'] === 0 && $day->isToday()) {
            try {
                $top = $this->riskRankingService->getTopRisks(5);
            } catch (\Throwable) {
                $top = [];
            }
            $riskAlerts['total'] = count($top);
            $riskAlerts['urgent'] = collect($top)->where('risk_score', '>=', 70)->count();
            $riskAlerts['high_risk_zones'] = collect($top)->map(fn ($r) => [
                'governorate' => $r['governorate'],
                'disease' => $r['disease'],
                'risk_score' => $r['risk_score'] ?? null,
            ])->values();
        }

        // ── Questions ──
        $qMessages = AnalysisMessage::whereBetween('created_at', [$start, $end])
            ->whereHas('user', fn ($q) => $q->role('farmer'))
            ->with('analysis:id,reco_validation_status')
            ->get();

        $qUnanswered = $qInProgress = $qResolved = 0;
        foreach ($qMessages as $m) {
            $resolved = $m->analysis && $m->analysis->reco_validation_status === 'validated';
            if ($resolved) {
                $qResolved++;
            } elseif (! $this->hasExpertReply($m->analysis_id, $m->created_at)) {
                $qUnanswered++;
            } else {
                $qInProgress++;
            }
        }

        return response()->json([
            'date' => $day->format('Y-m-d'),
            'analyses' => $analyses,
            'validations' => [
                'total' => $vTotal,
                'validated' => $vOk,
                'rejected' => $vRej,
            ],
            'risk_alerts' => $riskAlerts,
            'questions' => [
                'total' => $qMessages->count(),
                'unanswered' => $qUnanswered,
                'in_progress' => $qInProgress,
                'resolved' => $qResolved,
            ],
        ]);
    }

    /**
     * POST /api/calendar/notes
     */
    public function storeNote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date', 'after_or_equal:'.now()->subDays(30)->toDateString()],
            'content' => ['required', 'string', 'min:3', 'max:500'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $note = CalendarNote::create([
            'user_id' => $request->user()->id,
            'date' => $data['date'],
            'content' => $data['content'],
            'color' => $data['color'] ?? '#4CAF50',
        ]);

        $this->notificationService->notifyCalendarNote($note, $request->user());

        Cache::forget(self::eventsCacheKey($note->date->year, $note->date->month));

        return response()->json([
            'note' => [
                'id' => $note->id,
                'date' => $note->date->format('Y-m-d'),
                'content' => $note->content,
                'color' => $note->color,
                'author' => $request->user()->full_name,
            ],
        ], 201);
    }

    /**
     * DELETE /api/calendar/notes/{note}
     */
    public function deleteNote(Request $request, CalendarNote $note): JsonResponse
    {
        $user = $request->user();

        if ($note->user_id !== $user->id && ! $user->hasRole('admin')) {
            return response()->json([
                'message' => 'Vous ne pouvez supprimer que vos propres notes.',
            ], 403);
        }

        $noteDate = $note->date;
        $note->delete();

        Cache::forget(self::eventsCacheKey($noteDate->year, $noteDate->month));

        return response()->json(['message' => 'Note supprimée.']);
    }

    /**
     * Un message farmer est « répondu » si un expert/admin a écrit dans la
     * même analyse après lui.
     */
    private function hasExpertReply(int $analysisId, Carbon $after): bool
    {
        return AnalysisMessage::where('analysis_id', $analysisId)
            ->where('created_at', '>', $after)
            ->whereHas('user', fn ($q) => $q->role(['expert', 'admin']))
            ->exists();
    }
}
