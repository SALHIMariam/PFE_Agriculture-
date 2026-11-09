<?php

namespace Database\Seeders;

use App\Models\Meeting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seed complet et idempotent pour tester TOUTES les fonctionnalités de
 * l'application à l'échelle (dashboard admin, expert analytics + intelligence,
 * carte régionale / prévision de risque, heatmap, dashboard farmer, calendrier,
 * notifications, messagerie, historique de connexion).
 *
 * Complémentaire à DemoAnalysesSeeder (qui couvre les 24 gouvernorats avec
 * des comptes @agridetect.test génériques) : ce seeder crée des comptes
 * nommés (@agrinova.tn) avec des analyses remplissant TOUS les champs
 * Copilot/Expert Intelligence (draft_response, cnn/reco validation,
 * priority_level, safety_verdict...) que DemoAnalysesSeeder laisse à null.
 *
 * Idempotent : relancer ce seeder nettoie d'abord TOUTES les données
 * précédemment générées par lui (analyses, messages — via cascade FK —,
 * notifications, notes calendrier, historiques de connexion, états
 * d'alerte risque) avant de réinsérer, sans jamais toucher aux comptes
 * utilisateurs d'autres seeders/tests.
 *
 * Run: php artisan db:seed --class=TestDataSeeder
 */
class TestDataSeeder extends Seeder
{
    private const PASSWORD = 'password';

    /** Format Crop__disease (18 maladies + 6 variantes healthy, 6 cultures). */
    private const PREDICTED_CLASSES = [
        'Tomato__early_blight', 'Tomato__late_blight', 'Tomato__leaf_mold',
        'Tomato__septoria_leaf_spot', 'Tomato__spider_mites', 'Tomato__healthy',
        'Grape__black_rot', 'Grape__esca', 'Grape__leaf_blight', 'Grape__healthy',
        'Potato__early_blight', 'Potato__late_blight', 'Potato__healthy',
        'Apple__apple_scab', 'Apple__black_rot', 'Apple__cedar_apple_rust', 'Apple__healthy',
        'Corn__gray_leaf_spot', 'Corn__common_rust', 'Corn__northern_leaf_blight', 'Corn__healthy',
        'Wheat__brown_rust', 'Wheat__yellow_rust', 'Wheat__healthy',
    ];

    /**
     * 45 farmers, 24/24 gouvernorats couverts, plusieurs farmers dans les
     * zones critiques pour avoir un échantillon statistiquement stable.
     * Clés gouvernorat exactes = config('tunisia.governorates') — NB :
     * la clé réelle est 'Kebili' (sans accent), pas 'Kébili'.
     */
    private const FARMERS = [
        // === ZONES CRITIQUES (3 farmers chacune) ===
        ['name' => 'Bilel Ayari', 'governorate' => 'Sfax', 'is_active' => true],
        ['name' => 'Samir Boukhris', 'governorate' => 'Sfax', 'is_active' => true],
        ['name' => 'Nadia Karray', 'governorate' => 'Sfax', 'is_active' => true],

        ['name' => 'Rim Baccouche', 'governorate' => 'Kairouan', 'is_active' => true],
        ['name' => 'Lotfi Hammami', 'governorate' => 'Kairouan', 'is_active' => true],
        ['name' => 'Sonia Rezgui', 'governorate' => 'Kairouan', 'is_active' => true],

        ['name' => 'Olfa Zarrouk', 'governorate' => 'Sidi Bouzid', 'is_active' => true],
        ['name' => 'Ridha Bouzayeni', 'governorate' => 'Sidi Bouzid', 'is_active' => true],
        ['name' => 'Mouna Dridi', 'governorate' => 'Sidi Bouzid', 'is_active' => true],

        ['name' => 'Hamdi Ferchichi', 'governorate' => 'Kasserine', 'is_active' => true],
        ['name' => 'Anis Gharbi', 'governorate' => 'Kasserine', 'is_active' => true],
        ['name' => 'Rania Tlili', 'governorate' => 'Kasserine', 'is_active' => true],

        ['name' => 'Omar Bouazizi', 'governorate' => 'Jendouba', 'is_active' => true],
        ['name' => 'Hatem Romdhane', 'governorate' => 'Jendouba', 'is_active' => true],
        ['name' => 'Dalel Makni', 'governorate' => 'Jendouba', 'is_active' => true],

        // === ZONES À RISQUE ÉLEVÉ (2 farmers chacune) ===
        ['name' => 'Youssef Khelifi', 'governorate' => 'Nabeul', 'is_active' => true],
        ['name' => 'Abir Meddeb', 'governorate' => 'Nabeul', 'is_active' => true],

        ['name' => 'Amira Belhadj', 'governorate' => 'Sousse', 'is_active' => true],
        ['name' => 'Wael Gargouri', 'governorate' => 'Sousse', 'is_active' => true],

        ['name' => 'Ines Maalej', 'governorate' => 'Béja', 'is_active' => true],
        ['name' => 'Zied Chaieb', 'governorate' => 'Béja', 'is_active' => true],

        ['name' => 'Hiba Chebbi', 'governorate' => 'Le Kef', 'is_active' => true],
        ['name' => 'Ismail Rebhi', 'governorate' => 'Le Kef', 'is_active' => true],

        ['name' => 'Marwa Soltani', 'governorate' => 'Médenine', 'is_active' => true],
        ['name' => 'Habib Mnasri', 'governorate' => 'Médenine', 'is_active' => true],

        ['name' => 'Walid Brahem', 'governorate' => 'Gabès', 'is_active' => true],
        ['name' => 'Souad Fakhfakh', 'governorate' => 'Gabès', 'is_active' => true],

        // === ZONES MOYENNES (2 farmers chacune) ===
        ['name' => 'Kamel Dahmani', 'governorate' => 'Monastir', 'is_active' => true],
        ['name' => 'Najet Khlifi', 'governorate' => 'Monastir', 'is_active' => true],

        ['name' => 'Sana Ghanmi', 'governorate' => 'Mahdia', 'is_active' => true],
        ['name' => 'Fathi Saadi', 'governorate' => 'Mahdia', 'is_active' => true],

        ['name' => 'Tarek Mejri', 'governorate' => 'Siliana', 'is_active' => true],
        ['name' => 'Chiraz Ammar', 'governorate' => 'Siliana', 'is_active' => true],

        // === ZONES À FAIBLE RISQUE ===
        ['name' => 'Mohamed Ben Ali', 'governorate' => 'Tunis', 'is_active' => true],
        ['name' => 'Leila Kammoun', 'governorate' => 'Tunis', 'is_active' => true],
        ['name' => 'Fatma Gharbi', 'governorate' => 'Ariana', 'is_active' => true],
        ['name' => 'Ahmed Jebali', 'governorate' => 'Ben Arous', 'is_active' => true],
        ['name' => 'Salma Trabelsi', 'governorate' => 'Manouba', 'is_active' => true],
        ['name' => 'Nour Hamdi', 'governorate' => 'Zaghouan', 'is_active' => true],
        ['name' => 'Rami Sassi', 'governorate' => 'Bizerte', 'is_active' => true],

        // === GOUVERNORATS RESTANTS (couverture 24/24) ===
        ['name' => 'Ali Boussetta', 'governorate' => 'Tozeur', 'is_active' => true],
        ['name' => 'Fatma Boughanmi', 'governorate' => 'Kebili', 'is_active' => true],
        ['name' => 'Adel Haddad', 'governorate' => 'Gafsa', 'is_active' => true],
        ['name' => 'Samia Touil', 'governorate' => 'Tataouine', 'is_active' => true],

        // Farmer inactif pour tester le filtre is_active
        ['name' => 'Khaled Mansour', 'governorate' => 'Tozeur', 'is_active' => false],
    ];

    private const EXPERTS = [
        ['name' => 'Dr. Fares Trabelsi', 'email' => 'expert1@agrinova.tn', 'governorate' => 'Tunis'],
        ['name' => 'Dr. Amira Riahi', 'email' => 'expert2@agrinova.tn', 'governorate' => 'Sfax'],
        ['name' => 'Dr. Karim Bouzid', 'email' => 'expert3@agrinova.tn', 'governorate' => 'Sousse'],
        ['name' => 'Dr. Leila Mansouri', 'email' => 'expert4@agrinova.tn', 'governorate' => 'Nabeul'],
    ];

    /** % de cas malades (non-healthy) par gouvernorat — gradient critique → faible. */
    private const DISEASE_RATE_BY_GOVERNORATE = [
        // Critique (viseur : cases validées malades ≥ 150 sur le Heatmap réel)
        'Sfax' => 90, 'Kasserine' => 88,
        // Élevé (viseur : 80-149)
        'Kairouan' => 85, 'Sidi Bouzid' => 82,
        // Modéré (viseur : 30-79)
        'Jendouba' => 75, 'Béja' => 65, 'Gabès' => 60,
        // Faible (viseur : 1-29) — reste des gouvernorats, taux modéré à bas
        'Nabeul' => 55, 'Sousse' => 50, 'Le Kef' => 45, 'Médenine' => 40, 'Gafsa' => 40,
        'Monastir' => 35, 'Mahdia' => 35, 'Siliana' => 35, 'Tozeur' => 30, 'Kebili' => 25,
        'Tataouine' => 25, 'Zaghouan' => 20, 'Bizerte' => 18, 'Manouba' => 15,
        // Sain (0% garanti — zéro cas malade, jamais)
        'Tunis' => 0, 'Ariana' => 0, 'Ben Arous' => 0,
    ];
    private const DEFAULT_DISEASE_RATE = 30;

    /**
     * Nombre d'analyses par gouvernorat (somme ≈ 2100).
     *
     * IMPORTANT : le Heatmap réel (/dashboard/heatmap, HeatmapService::ranking())
     * classe les gouvernorats par NOMBRE ABSOLU de cas malades VALIDÉS (pas un
     * pourcentage) : Sain=0, Faible=1-29, Modéré=30-79, Élevé=80-149,
     * Critique=150+ (cf. Legend.tsx / HeatmapService.php:155-160). Comme
     * seedAnalyses() ne valide qu'environ 60% des analyses (weightedValidationStatus),
     * le volume ci-dessous est calibré pour que :
     *   total * (DISEASE_RATE/100) * 0.6 (= cas malades validés attendus)
     * atterrisse dans la bonne tranche pour CHAQUE gouvernorat, avec une marge
     * de ±2 écarts-types pour rester stable malgré l'aléatoire. C'est pourquoi
     * Sfax/Kasserine (Critique) et Kairouan/Sidi Bouzid (Élevé) ont des volumes
     * bien plus élevés que dans la version précédente de ce seeder — sans ce
     * volume, aucun gouvernorat ne peut statistiquement atteindre 80+ cas
     * malades validés, et les niveaux Élevé/Critique du Heatmap resteraient
     * vides quel que soit le taux de maladie choisi.
     */
    private const ANALYSES_PER_GOVERNORATE = [
        // Critique : 350*0.90*0.6≈189 / 340*0.88*0.6≈179 → solidement ≥150
        'Sfax' => 350, 'Kasserine' => 340,
        // Élevé : 230*0.85*0.6≈117 / 220*0.82*0.6≈108 → confortablement 80-149
        'Kairouan' => 230, 'Sidi Bouzid' => 220,
        // Modéré : 100*0.75*0.6=45 / 110*0.65*0.6≈43 / 115*0.60*0.6≈41 → 30-79
        'Jendouba' => 100, 'Béja' => 110, 'Gabès' => 115,
        // Faible : total*rate*0.6 largement <29 pour chacun
        'Nabeul' => 50, 'Sousse' => 50, 'Le Kef' => 50, 'Médenine' => 45, 'Gafsa' => 40,
        'Monastir' => 40, 'Mahdia' => 40, 'Siliana' => 40, 'Tozeur' => 35, 'Kebili' => 35,
        'Tataouine' => 30, 'Zaghouan' => 30, 'Bizerte' => 30, 'Manouba' => 30,
        // Sain : taux 0% → 0 cas malade garanti quel que soit le volume
        'Tunis' => 50, 'Ariana' => 40, 'Ben Arous' => 30,
    ];

    /** Volumétrie croissante sur 6 mois (poids relatifs, pas des totaux garantis). */
    private const MONTHLY_WEIGHTS = [8, 12, 18, 22, 30, 55];

    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        DB::transaction(function () {
            $this->cleanPreviousRun();

            $admin = $this->seedAdmin();
            $expertIds = $this->seedExperts();
            $farmersByGovernorate = $this->seedFarmers();
            $analysisIds = $this->seedAnalyses($farmersByGovernorate, $expertIds);
            $this->seedAnalysisMessages($analysisIds);
            $this->seedMeetings($admin->id, $expertIds);
            $this->seedNotifications($farmersByGovernorate, $expertIds, $analysisIds);
            $this->seedRiskAlertStates($farmersByGovernorate);
            $this->seedCalendarNotes($farmersByGovernorate);
            $this->seedLoginHistories($farmersByGovernorate, $expertIds);
        });

        // NewsDemoSeeder gère déjà ~50 actualités réalistes avec upsert
        // idempotent par url — pas besoin d'en recréer de moins bonnes ici.
        $this->call(NewsDemoSeeder::class);

        Cache::flush();

        $this->command?->info('TestDataSeeder terminé. Cache vidé (stats dashboard recalculées au prochain chargement).');
    }

    /**
     * Nettoyage pour relances idempotentes : supprime toutes les données
     * précédemment générées par CE seeder (comptes @agrinova.tn), jamais les
     * comptes/données d'autres seeders ou de vrais utilisateurs.
     *
     * analysis_messages n'est pas nettoyé explicitement : sa FK analysis_id
     * est en cascadeOnDelete (migration 2026_08_05_000001), donc supprimer
     * les analyses supprime automatiquement leurs messages.
     */
    private function cleanPreviousRun(): void
    {
        $testUserIds = User::where('email', 'like', '%@agrinova.tn')->pluck('id')->toArray();

        if (empty($testUserIds)) {
            return;
        }

        DB::table('analyses')->whereIn('user_id', $testUserIds)->delete();
        DB::table('notifications')->whereIn('user_id', $testUserIds)->delete();
        DB::table('calendar_notes')->whereIn('user_id', $testUserIds)->delete();
        DB::table('login_histories')->whereIn('user_id', $testUserIds)->delete();
        DB::table('risk_alert_states')->whereIn('user_id', $testUserIds)->delete();

        $this->command?->info('Nettoyage des anciennes données TestDataSeeder terminé.');
    }

    private function seedAdmin(): User
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@agrinova.tn'],
            [
                'name' => 'Admin AgriNova',
                'password' => Hash::make(self::PASSWORD),
                'governorate' => 'Tunis',
                'is_active' => true,
                'must_change_password' => false,
            ]
        );

        if (! $admin->hasRole('admin')) {
            $admin->assignRole('admin');
        }

        return $admin;
    }

    /** @return int[] */
    private function seedExperts(): array
    {
        $ids = [];

        foreach (self::EXPERTS as $expert) {
            $user = User::updateOrCreate(
                ['email' => $expert['email']],
                [
                    'name' => $expert['name'],
                    'password' => Hash::make(self::PASSWORD),
                    'governorate' => $expert['governorate'],
                    'is_active' => true,
                    'must_change_password' => false,
                ]
            );

            if (! $user->hasRole('expert')) {
                $user->assignRole('expert');
            }

            $ids[] = $user->id;
        }

        return $ids;
    }

    /** @return array<string,int[]> gouvernorat => [farmer_ids] */
    private function seedFarmers(): array
    {
        $byGovernorate = [];

        foreach (self::FARMERS as $i => $farmer) {
            $email = 'farmer'.($i + 1).'@agrinova.tn';

            $user = User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $farmer['name'],
                    'password' => Hash::make(self::PASSWORD),
                    'governorate' => $farmer['governorate'],
                    'farm' => "Ferme {$farmer['name']}",
                    'is_active' => $farmer['is_active'],
                    'must_change_password' => false,
                ]
            );

            if (! $user->hasRole('farmer')) {
                $user->assignRole('farmer');
            }

            $byGovernorate[$farmer['governorate']][] = $user->id;
        }

        return $byGovernorate;
    }

    /**
     * @param  array<string,int[]>  $farmersByGovernorate
     * @param  int[]  $expertIds
     * @return int[] identifiants des analyses insérées (pour messages/notifications)
     */
    private function seedAnalyses(array $farmersByGovernorate, array $expertIds): array
    {
        $now = now();
        $rows = [];
        $expertCursor = 0;

        foreach (self::ANALYSES_PER_GOVERNORATE as $governorate => $count) {
            $farmerIds = $farmersByGovernorate[$governorate] ?? [];
            if (empty($farmerIds)) {
                $this->command?->warn("Pas de farmer pour {$governorate} — skip.");
                continue;
            }

            $diseaseRate = self::DISEASE_RATE_BY_GOVERNORATE[$governorate] ?? self::DEFAULT_DISEASE_RATE;

            for ($i = 0; $i < $count; $i++) {
                $farmerId = $farmerIds[$i % count($farmerIds)];
                $expertId = $expertIds[$expertCursor % count($expertIds)];
                $expertCursor++;

                $predictedClass = $this->pickPredictedClass($diseaseRate);
                $createdAt = $this->randomDateInWeightedMonth($now);
                $validationStatus = $this->weightedValidationStatus();
                $confidence = round(random_int(550, 990) / 1000, 4);

                $rows[] = $this->buildAnalysisRow(
                    $farmerId,
                    $expertId,
                    $predictedClass,
                    $confidence,
                    $createdAt,
                    $validationStatus
                );
            }
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('analyses')->insert($chunk);
        }

        $this->command?->info('Seeded '.count($rows).' analyses de test (@agrinova.tn).');

        $allFarmerIds = collect($farmersByGovernorate)->flatten()->all();

        return DB::table('analyses')->whereIn('user_id', $allFarmerIds)->pluck('id')->all();
    }

    private function pickPredictedClass(int $diseaseRatePct): string
    {
        $healthy = array_values(array_filter(self::PREDICTED_CLASSES, fn ($c) => str_ends_with($c, '__healthy')));
        $diseased = array_values(array_filter(self::PREDICTED_CLASSES, fn ($c) => ! str_ends_with($c, '__healthy')));

        return random_int(1, 100) <= $diseaseRatePct
            ? $diseased[array_rand($diseased)]
            : $healthy[array_rand($healthy)];
    }

    private function randomDateInWeightedMonth(Carbon $now): Carbon
    {
        $totalWeight = array_sum(self::MONTHLY_WEIGHTS);
        $roll = random_int(1, $totalWeight);
        $cumulative = 0;
        $monthsAgo = 5;

        foreach (self::MONTHLY_WEIGHTS as $i => $weight) {
            $cumulative += $weight;
            if ($roll <= $cumulative) {
                $monthsAgo = 5 - $i;
                break;
            }
        }

        $monthStart = $now->copy()->subMonths($monthsAgo)->startOfMonth();
        $daysInMonth = $monthStart->daysInMonth;
        $maxDay = $monthsAgo === 0 ? min($now->day, $daysInMonth) : $daysInMonth;

        return $monthStart->copy()
            ->addDays(random_int(0, max(0, $maxDay - 1)))
            ->addMinutes(random_int(0, 1439));
    }

    private function weightedValidationStatus(): string
    {
        $roll = random_int(1, 100);

        return match (true) {
            $roll <= 60 => 'validated',
            $roll <= 75 => 'rejected',
            default => 'pending',
        };
    }

    /** @return array<string,mixed> */
    private function buildAnalysisRow(
        int $farmerId,
        int $expertId,
        string $predictedClass,
        float $confidence,
        Carbon $createdAt,
        string $validationStatus
    ): array {
        $crop = Str::before($predictedClass, '__');
        $disease = Str::after($predictedClass, '__');

        $base = [
            'user_id' => $farmerId,
            'image_path' => 'seed/analyses/'.Str::uuid().'.jpg',
            'gradcam_path' => 'seed/gradcam/'.Str::uuid().'.jpg',
            'predicted_class' => $predictedClass,
            'crop' => $crop,
            'confidence' => $confidence,
            'top_k' => json_encode([
                ['class' => $predictedClass, 'confidence' => $confidence],
                ['class' => $this->randomOtherClass($predictedClass), 'confidence' => round($confidence * 0.3, 4)],
                ['class' => $this->randomOtherClass($predictedClass), 'confidence' => round($confidence * 0.1, 4)],
            ]),
            'status' => 'done',
            'inference_ms' => random_int(80, 350),
            'error_message' => null,
            'confidence_score' => (int) round($confidence * 100),
            'temperature' => random_int(15, 42),
            'humidity' => random_int(30, 85),
            'rainfall' => round(random_int(0, 50) / 10, 1),
            'wind_speed' => round(random_int(5, 35) / 10, 1),
            'weather_fetched_at' => $createdAt,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ];

        return match ($validationStatus) {
            'validated' => $base + $this->validatedFields($expertId, $createdAt, $disease),
            'rejected' => $base + $this->rejectedFields($expertId, $createdAt, $disease),
            default => $base + $this->pendingFields($disease),
        };
    }

    private function randomOtherClass(string $exclude): string
    {
        do {
            $pick = self::PREDICTED_CLASSES[array_rand(self::PREDICTED_CLASSES)];
        } while ($pick === $exclude);

        return $pick;
    }

    /** @return array<string,mixed> */
    private function validatedFields(int $expertId, Carbon $createdAt, string $disease): array
    {
        $expertValidatedAt = $createdAt->copy()->addHours(random_int(1, 72));
        $edited = random_int(1, 100) <= 25;
        $isDiseased = $disease !== 'healthy';

        $comments = [
            'Diagnostic confirmé. Traitement recommandé : fongicide cuivrique.',
            'Infection bien identifiée par le modèle. Appliquer un traitement préventif.',
            'Bonne détection. Surveiller les parcelles voisines.',
            'Confirmé. Retirer les feuilles infectées immédiatement.',
            'Précision excellente du modèle sur ce cas.',
        ];

        $diseaseLabel = str_replace('_', ' ', $disease);

        // Distribution de sévérité : un cas validé malade n'est pas toujours
        // "ok" — ~20% dangereux, ~32% incertain, ~48% ok parmi les malades.
        $safetyVerdict = ! $isDiseased
            ? 'ok'
            : (random_int(1, 100) <= 20 ? 'dangerous' : (random_int(1, 100) <= 40 ? 'uncertain' : 'ok'));

        return [
            'expert_id' => $expertId,
            'expert_validated_at' => $expertValidatedAt,
            'validation_status' => 'validated',
            'expert_comment' => $comments[array_rand($comments)],
            'cnn_validation_status' => 'validated',
            'cnn_expert_id' => $expertId,
            'cnn_validated_at' => $expertValidatedAt,
            'cnn_expert_comment' => 'Carte de chaleur cohérente avec le diagnostic.',
            'reco_validation_status' => random_int(1, 100) <= 80 ? 'validated' : 'pending',
            'reco_expert_id' => $expertId,
            'reco_validated_at' => $expertValidatedAt,
            'reco_expert_comment' => 'Recommandation appropriée.',
            'draft_response' => "Votre plante présente des signes de {$diseaseLabel}. Nous recommandons un traitement adapté.",
            'expert_edited_response' => $edited,
            'expert_response' => "Diagnostic confirmé : {$diseaseLabel}. Traitement : fongicide adapté, retrait des parties atteintes.",
            'priority_score' => null,
            'priority_level' => null,
            'safety_verdict' => $safetyVerdict,
            'responded_at' => $expertValidatedAt,
        ];
    }

    /** @return array<string,mixed> */
    private function rejectedFields(int $expertId, Carbon $createdAt, string $disease): array
    {
        $expertValidatedAt = $createdAt->copy()->addHours(random_int(1, 72));

        $comments = [
            'Faux positif — la plante est saine, tache due à un stress hydrique.',
            "Mauvaise classification : symptômes incompatibles avec {$disease}.",
            'Image de mauvaise qualité, impossible de confirmer.',
            'Le modèle a confondu un dommage mécanique avec une maladie.',
        ];

        return [
            'expert_id' => $expertId,
            'expert_validated_at' => $expertValidatedAt,
            'validation_status' => 'rejected',
            'expert_comment' => $comments[array_rand($comments)],
            'cnn_validation_status' => 'rejected',
            'cnn_expert_id' => $expertId,
            'cnn_validated_at' => $expertValidatedAt,
            'cnn_expert_comment' => 'Diagnostic non confirmé par l\'expert.',
            'reco_validation_status' => 'rejected',
            'reco_expert_id' => $expertId,
            'reco_validated_at' => $expertValidatedAt,
            'reco_expert_comment' => 'Recommandation non pertinente (diagnostic erroné).',
            'draft_response' => "Votre plante présente des signes de ".str_replace('_', ' ', $disease).'. Nous recommandons...',
            'expert_edited_response' => false,
            'expert_response' => null,
            'priority_score' => null,
            'priority_level' => null,
            'safety_verdict' => random_int(1, 100) <= 50 ? 'uncertain' : 'ok',
            'responded_at' => $expertValidatedAt,
        ];
    }

    /** @return array<string,mixed> */
    private function pendingFields(string $disease): array
    {
        $isDiseased = $disease !== 'healthy';

        if ($isDiseased) {
            $roll = random_int(1, 100);
            $safetyVerdict = match (true) {
                $roll <= 30 => 'dangerous',
                $roll <= 65 => 'uncertain',
                default => 'ok',
            };
            $priorityLevel = match (true) {
                $roll <= 20 => 'urgent',
                $roll <= 55 => 'important',
                default => 'normal',
            };
        } else {
            $safetyVerdict = 'ok';
            $priorityLevel = 'normal';
        }

        return [
            'expert_id' => null,
            'expert_validated_at' => null,
            'validation_status' => 'pending',
            'expert_comment' => null,
            'cnn_validation_status' => 'pending',
            'cnn_expert_id' => null,
            'cnn_validated_at' => null,
            'cnn_expert_comment' => null,
            'reco_validation_status' => 'pending',
            'reco_expert_id' => null,
            'reco_validated_at' => null,
            'reco_expert_comment' => null,
            'draft_response' => "Votre plante présente des signes de ".str_replace('_', ' ', $disease).'. Nous recommandons un traitement adapté (brouillon en attente de validation expert).',
            'expert_edited_response' => false,
            'expert_response' => null,
            'priority_score' => random_int(1, 100),
            'priority_level' => $priorityLevel,
            'safety_verdict' => $safetyVerdict,
            'responded_at' => null,
        ];
    }

    /** @param int[] $analysisIds */
    private function seedAnalysisMessages(array $analysisIds): void
    {
        if (empty($analysisIds)) {
            return;
        }

        $analyses = DB::table('analyses')
            ->whereIn('id', $analysisIds)
            ->whereIn('validation_status', ['validated', 'rejected'])
            ->whereNotNull('expert_id')
            ->inRandomOrder()
            ->limit(80)
            ->get(['id', 'user_id', 'expert_id', 'created_at']);

        $farmerMessages = [
            'Bonjour, est-ce que cette maladie est grave pour ma récolte ?',
            'Merci pour le diagnostic. Quel traitement recommandez-vous ?',
            'J\'ai appliqué le traitement il y a 3 jours, les symptômes persistent.',
            'Est-ce que je dois traiter les plants voisins aussi ?',
            'La maladie s\'est propagée aux autres rangées. Que faire ?',
            'Merci docteur pour votre aide rapide !',
            'Est-ce que c\'est contagieux pour les autres cultures ?',
            'À quelle fréquence dois-je appliquer le fongicide ?',
        ];
        $expertMessages = [
            'Je confirme le diagnostic. Appliquez un fongicide cuivrique immédiatement.',
            'Les symptômes sont caractéristiques. Traitez préventivement les plants proches.',
            'Retirez les feuilles atteintes et brûlez-les. Ne les compostez pas.',
            'Le traitement doit être répété tous les 10-14 jours en période humide.',
            'Surveillez l\'humidité. Arrosez au pied, pas par aspersion.',
            'Pas de panique, ce stade est encore traitable. Suivez les recommandations.',
            'Envoyez-moi une nouvelle photo dans une semaine pour suivi.',
            'La maladie n\'est pas transmissible aux autres espèces dans votre cas.',
        ];

        $rows = [];

        foreach ($analyses as $analysis) {
            $numMessages = random_int(2, 5);
            $messageTime = Carbon::parse($analysis->created_at)->addHours(random_int(2, 24));

            for ($i = 0; $i < $numMessages; $i++) {
                $isFarmer = $i % 2 === 0;
                $rows[] = [
                    'analysis_id' => $analysis->id,
                    'user_id' => $isFarmer ? $analysis->user_id : $analysis->expert_id,
                    'message' => $isFarmer
                        ? $farmerMessages[array_rand($farmerMessages)]
                        : $expertMessages[array_rand($expertMessages)],
                    'is_deleted' => false,
                    'is_edited' => false,
                    'deleted_at' => null,
                    'created_at' => $messageTime,
                    'updated_at' => $messageTime,
                ];
                $messageTime = $messageTime->copy()->addMinutes(random_int(10, 480));
            }
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('analysis_messages')->insert($chunk);
        }

        $this->command?->info('Seeded '.count($rows).' messages de conversation.');
    }

    /** @param int[] $expertIds */
    private function seedMeetings(int $adminId, array $expertIds): void
    {
        $meetingsData = [
            ['title' => 'Réunion suivi mildiou - Sfax', 'offset' => 2],
            ['title' => 'Formation experts - Nouvelles maladies', 'offset' => 5],
            ['title' => 'Bilan mensuel analyses IA', 'offset' => 7],
            ['title' => 'Coordination terrain - Kairouan', 'offset' => 10],
            ['title' => 'Revue qualité modèle EfficientNetB0', 'offset' => 14],
            ['title' => 'Point hebdo experts', 'offset' => -3],
            ['title' => 'Atelier classification tomates', 'offset' => -7],
            ['title' => 'Réunion urgence rouille blé', 'offset' => -10],
            ['title' => 'Onboarding nouveaux agriculteurs', 'offset' => -14],
            ['title' => 'Démo dashboard analytics', 'offset' => -21],
        ];

        foreach ($meetingsData as $data) {
            $meeting = Meeting::updateOrCreate(
                ['title' => $data['title']],
                [
                    'created_by' => $adminId,
                    'description' => 'Réunion de test générée par TestDataSeeder.',
                    'meet_link' => 'https://meet.google.com/test-'.Str::slug($data['title']),
                    'scheduled_at' => now()->addDays($data['offset']),
                    'duration_minutes' => 60,
                    'status' => 'scheduled',
                ]
            );

            $meeting->invitees()->syncWithoutDetaching(
                collect($expertIds)->mapWithKeys(fn ($id) => [
                    $id => ['rsvp_status' => random_int(1, 100) <= 70 ? 'accepted' : 'pending'],
                ])->all()
            );
        }

        $this->command?->info('Seeded '.count($meetingsData).' réunions de test.');
    }

    /**
     * @param  array<string,int[]>  $farmersByGovernorate
     * @param  int[]  $expertIds
     * @param  int[]  $analysisIds
     */
    private function seedNotifications(array $farmersByGovernorate, array $expertIds, array $analysisIds): void
    {
        $farmerIds = collect($farmersByGovernorate)->flatten()->all();
        $now = now();
        $rows = [];

        $randomAnalysisId = fn () => ! empty($analysisIds) ? $analysisIds[array_rand($analysisIds)] : null;

        // 1) Alertes risque pour les farmers des zones critiques
        $criticalGovernorates = ['Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Jendouba'];
        $alertDiseases = ['late_blight', 'black_rot', 'brown_rust', 'early_blight', 'common_rust'];

        foreach ($criticalGovernorates as $gov) {
            foreach ($farmersByGovernorate[$gov] ?? [] as $farmerId) {
                $numAlerts = random_int(2, 4);

                for ($a = 0; $a < $numAlerts; $a++) {
                    $isUrgent = random_int(1, 100) <= 60;
                    $riskScore = $isUrgent ? random_int(70, 95) : random_int(40, 69);
                    $disease = $alertDiseases[array_rand($alertDiseases)];
                    $isRead = random_int(1, 100) <= 40;

                    $rows[] = [
                        'user_id' => $farmerId,
                        'type' => 'risk_alert',
                        'title' => $isUrgent ? '🚨 Alerte agricole — risque élevé' : '📋 Risque à surveiller',
                        'body' => $isUrgent
                            ? "Votre région {$gov} présente un risque élevé de {$disease}. Risque estimé : {$riskScore}%."
                            : "Un risque modéré de {$disease} est prévu dans votre région {$gov} ({$riskScore}%).",
                        'data' => json_encode(['disease' => "Tomato__{$disease}", 'crop' => 'Tomato', 'governorate' => $gov, 'risk_score' => $riskScore, 'level' => $isUrgent ? 'urgent' : 'informative']),
                        'is_read' => $isRead,
                        'read_at' => $isRead ? $now->copy()->subHours(random_int(1, 48)) : null,
                        'created_at' => $now->copy()->subDays(random_int(0, 14))->subMinutes(random_int(0, 1440)),
                        'updated_at' => $now,
                    ];
                }
            }
        }

        // 2) Résultats d'analyses pour des farmers au hasard
        $shuffledFarmers = $farmerIds;
        shuffle($shuffledFarmers);

        foreach (array_slice($shuffledFarmers, 0, 30) as $farmerId) {
            $isRead = random_int(1, 100) <= 60;
            $rows[] = [
                'user_id' => $farmerId,
                'type' => 'analysis_validated',
                'title' => '✓ Analyse validée',
                'body' => "L'expert a validé la recommandation IA",
                'data' => json_encode(['analysis_id' => $randomAnalysisId()]),
                'is_read' => $isRead,
                'read_at' => $isRead ? $now->copy()->subHours(random_int(1, 72)) : null,
                'created_at' => $now->copy()->subDays(random_int(0, 20)),
                'updated_at' => $now,
            ];
        }

        foreach (array_slice($shuffledFarmers, 0, 15) as $farmerId) {
            $rows[] = [
                'user_id' => $farmerId,
                'type' => 'analysis_rejected',
                'title' => '✗ Analyse rejetée',
                'body' => "L'expert a rejeté la recommandation IA",
                'data' => json_encode(['analysis_id' => $randomAnalysisId()]),
                'is_read' => random_int(1, 100) <= 50,
                'read_at' => null,
                'created_at' => $now->copy()->subDays(random_int(0, 20)),
                'updated_at' => $now,
            ];
        }

        // 3) Experts : nouvelles analyses à valider
        foreach ($expertIds as $expertId) {
            for ($i = 0; $i < random_int(5, 12); $i++) {
                $isRead = random_int(1, 100) <= 70;
                $rows[] = [
                    'user_id' => $expertId,
                    'type' => 'new_analysis',
                    'title' => 'Nouvelle analyse à valider',
                    'body' => 'Un agriculteur a soumis une nouvelle analyse',
                    'data' => json_encode(['analysis_id' => $randomAnalysisId()]),
                    'is_read' => $isRead,
                    'read_at' => $isRead ? $now->copy()->subHours(random_int(1, 48)) : null,
                    'created_at' => $now->copy()->subDays(random_int(0, 15)),
                    'updated_at' => $now,
                ];
            }
        }

        // 4) Validations CNN/reco
        foreach (array_slice($shuffledFarmers, 0, 20) as $farmerId) {
            $isCnn = random_int(1, 100) <= 50;
            $rows[] = [
                'user_id' => $farmerId,
                'type' => $isCnn ? 'cnn_validated' : 'reco_validated',
                'title' => $isCnn ? '✓ Diagnostic validé' : '✓ Recommandation validée',
                'body' => 'Validation effectuée par l\'expert',
                'data' => json_encode(['analysis_id' => $randomAnalysisId()]),
                'is_read' => random_int(1, 100) <= 50,
                'read_at' => null,
                'created_at' => $now->copy()->subDays(random_int(0, 10)),
                'updated_at' => $now,
            ];
        }

        // 5) Messages experts
        foreach (array_slice($shuffledFarmers, 0, 10) as $farmerId) {
            $rows[] = [
                'user_id' => $farmerId,
                'type' => 'expert_reply',
                'title' => "L'expert a répondu",
                'body' => 'Nouveau message sur votre analyse',
                'data' => json_encode(['analysis_id' => $randomAnalysisId()]),
                'is_read' => false,
                'read_at' => null,
                'created_at' => $now->copy()->subDays(random_int(0, 5)),
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('notifications')->insert($chunk);
        }

        $this->command?->info('Seeded '.count($rows).' notifications (dont alertes risque).');
    }

    /** @param array<string,int[]> $farmersByGovernorate */
    private function seedRiskAlertStates(array $farmersByGovernorate): void
    {
        $now = now();
        $rows = [];

        $alertConfig = [
            'Sfax' => [['Tomato__late_blight', 'critical'], ['Grape__black_rot', 'critical'], ['Wheat__brown_rust', 'high']],
            'Kairouan' => [['Tomato__early_blight', 'critical'], ['Corn__common_rust', 'high'], ['Potato__late_blight', 'critical']],
            'Kasserine' => [['Wheat__yellow_rust', 'critical'], ['Tomato__septoria_leaf_spot', 'high']],
            'Sidi Bouzid' => [['Potato__early_blight', 'critical'], ['Tomato__late_blight', 'high'], ['Corn__gray_leaf_spot', 'high']],
            'Jendouba' => [['Grape__esca', 'high'], ['Apple__apple_scab', 'high']],
            'Nabeul' => [['Grape__black_rot', 'high'], ['Tomato__spider_mites', 'medium']],
            'Sousse' => [['Tomato__leaf_mold', 'medium']],
            'Béja' => [['Wheat__brown_rust', 'high'], ['Apple__black_rot', 'medium']],
            'Gabès' => [['Potato__late_blight', 'medium']],
            'Gafsa' => [['Corn__northern_leaf_blight', 'medium']],
        ];

        foreach ($alertConfig as $governorate => $alerts) {
            $farmerIds = $farmersByGovernorate[$governorate] ?? [];
            if (empty($farmerIds)) {
                continue;
            }

            foreach ($alerts as [$disease, $level]) {
                foreach ($farmerIds as $farmerId) {
                    $rows[] = [
                        'user_id' => $farmerId,
                        'disease' => $disease,
                        'governorate' => $governorate,
                        'last_notified_level' => $level,
                        'last_notified_at' => $now->copy()->subHours(random_int(1, 72)),
                        'created_at' => $now->copy()->subDays(random_int(1, 30)),
                        'updated_at' => $now,
                    ];
                }
            }
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('risk_alert_states')->insert($chunk);
        }

        $this->command?->info('Seeded '.count($rows).' risk alert states.');
    }

    /** @param array<string,int[]> $farmersByGovernorate */
    private function seedCalendarNotes(array $farmersByGovernorate): void
    {
        $allFarmerIds = collect($farmersByGovernorate)->flatten()->all();
        $rows = [];

        $noteTemplates = [
            ['content' => 'Traitement fongicide - parcelle Nord', 'color' => '#e04f5f'],
            ['content' => 'Inspection visuelle des plants', 'color' => '#40916c'],
            ['content' => 'Récolte prévue', 'color' => '#40916c'],
            ['content' => 'Arrosage + engrais', 'color' => '#3b82f6'],
            ['content' => 'Visite expert prévue', 'color' => '#c9a84c'],
            ['content' => 'Plantation nouvelles semences', 'color' => '#40916c'],
            ['content' => 'Vérifier piège à insectes', 'color' => '#c9a84c'],
            ['content' => 'Application pesticide bio', 'color' => '#e04f5f'],
            ['content' => 'Taille des plants de tomates', 'color' => '#3b82f6'],
            ['content' => 'Nettoyage du système d\'irrigation', 'color' => '#3b82f6'],
        ];

        $selectedFarmers = array_slice($allFarmerIds, 0, (int) (count($allFarmerIds) * 0.35));

        foreach ($selectedFarmers as $farmerId) {
            $numNotes = random_int(3, 8);

            for ($i = 0; $i < $numNotes; $i++) {
                $template = $noteTemplates[array_rand($noteTemplates)];
                $rows[] = [
                    'user_id' => $farmerId,
                    'date' => now()->addDays(random_int(-14, 30))->toDateString(),
                    'content' => $template['content'],
                    'color' => $template['color'],
                    'created_at' => now()->subDays(random_int(1, 30)),
                    'updated_at' => now(),
                ];
            }
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('calendar_notes')->insert($chunk);
        }

        $this->command?->info('Seeded '.count($rows).' notes de calendrier.');
    }

    /**
     * @param  array<string,int[]>  $farmersByGovernorate
     * @param  int[]  $expertIds
     */
    private function seedLoginHistories(array $farmersByGovernorate, array $expertIds): void
    {
        $allFarmerIds = collect($farmersByGovernorate)->flatten()->all();
        $allUserIds = array_merge($allFarmerIds, $expertIds);
        $rows = [];

        $userAgents = [
            'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/107.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0) AppleWebKit/605.1 Safari/605.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
        ];

        foreach ($allUserIds as $userId) {
            $numLogins = random_int(5, 25);

            for ($i = 0; $i < $numLogins; $i++) {
                $rows[] = [
                    'user_id' => $userId,
                    'ip_address' => '196.'.random_int(1, 255).'.'.random_int(1, 255).'.'.random_int(1, 255),
                    'user_agent' => $userAgents[array_rand($userAgents)],
                    'logged_in_at' => now()->subDays(random_int(0, 60))->subMinutes(random_int(0, 1440)),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('login_histories')->insert($chunk);
        }

        $this->command?->info('Seeded '.count($rows).' entrées login history.');
    }
}
