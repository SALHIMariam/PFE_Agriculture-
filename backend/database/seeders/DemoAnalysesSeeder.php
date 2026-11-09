<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Generates demo farmers + analyses spread across all 24 Tunisian governorates
 * so the Disease Heatmap has realistic data to display in development.
 *
 * Run manually: php artisan db:seed --class=DemoAnalysesSeeder
 */
class DemoAnalysesSeeder extends Seeder
{
    /** @var array<string,array{crop:string,disease:string}> */
    private array $predictedClasses = [
        // Apple
        ['crop' => 'Apple', 'disease' => 'black_rot'],
        ['crop' => 'Apple', 'disease' => 'cedar_apple_rust'],
        ['crop' => 'Apple', 'disease' => 'healthy'],
        ['crop' => 'Apple', 'disease' => 'scab'],
        // Bean
        ['crop' => 'Bean', 'disease' => 'beans_angular_leaf_spot_disease'],
        ['crop' => 'Bean', 'disease' => 'beans_healthy_crop'],
        ['crop' => 'Bean', 'disease' => 'beans_rust_disease'],
        // Corn
        ['crop' => 'Corn', 'disease' => 'gray_leaf_spot'],
        ['crop' => 'Corn', 'disease' => 'healthy'],
        ['crop' => 'Corn', 'disease' => 'maize_streak_virus_disease'],
        ['crop' => 'Corn', 'disease' => 'northern_leaf_blight'],
        // Cucumber
        ['crop' => 'Cucumber', 'disease' => 'anthracnose'],
        ['crop' => 'Cucumber', 'disease' => 'downy_mildew'],
        ['crop' => 'Cucumber', 'disease' => 'gummy_stem_blight'],
        ['crop' => 'Cucumber', 'disease' => 'healthy'],
        ['crop' => 'Cucumber', 'disease' => 'powdery_mildew'],
        // Grape
        ['crop' => 'Grape', 'disease' => 'black_measles'],
        ['crop' => 'Grape', 'disease' => 'black_rot'],
        ['crop' => 'Grape', 'disease' => 'healthy'],
        ['crop' => 'Grape', 'disease' => 'leaf_blight'],
        // Groundnut
        ['crop' => 'Groundnut', 'disease' => 'early_leaf_spot'],
        ['crop' => 'Groundnut', 'disease' => 'healthy'],
        ['crop' => 'Groundnut', 'disease' => 'late_leaf_spot'],
        ['crop' => 'Groundnut', 'disease' => 'nutrition_deficiency'],
        ['crop' => 'Groundnut', 'disease' => 'rust'],
        // Potato
        ['crop' => 'Potato', 'disease' => 'early_blight'],
        ['crop' => 'Potato', 'disease' => 'healthy'],
        ['crop' => 'Potato', 'disease' => 'late_blight'],
        // Tomato
        ['crop' => 'Tomato', 'disease' => 'bacterial_spot'],
        ['crop' => 'Tomato', 'disease' => 'early_blight'],
        ['crop' => 'Tomato', 'disease' => 'healthy'],
        ['crop' => 'Tomato', 'disease' => 'late_blight'],
        ['crop' => 'Tomato', 'disease' => 'septoria_leaf_spot'],
        ['crop' => 'Tomato', 'disease' => 'spider_mites_two_spotted_spider_mite'],
        ['crop' => 'Tomato', 'disease' => 'yellow_leaf_curl_virus'],
        // Wheat
        ['crop' => 'Wheat', 'disease' => 'healthy'],
        ['crop' => 'Wheat', 'disease' => 'septoria'],
        ['crop' => 'Wheat', 'disease' => 'stripe_rust'],
    ];

    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        $governorates = config('tunisia.governorates');
        $farmersByGovernorate = $this->ensureDemoFarmers(array_keys($governorates));
        $expertId = $this->ensureDemoExpert();

        $rows = [];
        $now = now();

        foreach ($governorates as $governorate => $coords) {
            $target = match ($governorate) {
                'Sfax' => 248,
                'Nabeul' => 212,
                'Bizerte' => 198,
                default => random_int(20, 90),
            };

            $farmers = $farmersByGovernorate[$governorate];

            for ($i = 0; $i < $target; $i++) {
                $pick = $this->predictedClasses[array_rand($this->predictedClasses)];
                $createdAt = $now->copy()->subDays(random_int(0, 364))->subMinutes(random_int(0, 1439));
                $validationStatus = $this->weightedValidationStatus();
                $farmer = $farmers[array_rand($farmers)];
                $isDecided = $validationStatus !== 'pending';

                $rows[] = [
                    'user_id' => $farmer,
                    'image_path' => 'seed/analyses/'.Str::uuid().'.jpg',
                    'gradcam_path' => null,
                    'predicted_class' => $pick['crop'].'__'.$pick['disease'],
                    'crop' => $pick['crop'],
                    'confidence' => round(random_int(550, 990) / 1000, 4),
                    'top_k' => null,
                    'status' => 'done',
                    'inference_ms' => random_int(120, 900),
                    'error_message' => null,
                    'expert_id' => $isDecided ? $expertId : null,
                    'expert_validated_at' => $isDecided ? $createdAt->copy()->addHours(random_int(1, 48)) : null,
                    'validation_status' => $validationStatus,
                    'expert_comment' => $validationStatus === 'rejected' ? $this->randomRejectionComment() : null,
                    ...$this->randomWeatherFor($coords['zone']),
                    'weather_fetched_at' => $createdAt,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ];
            }
        }

        // Force a handful of recent outbreak clusters (same governorate + disease,
        // all within the last 7 days) so the real-time alerts feature has something
        // to detect out of the box instead of relying on the random spread above.
        $outbreaks = [
            ['governorate' => 'Sfax', 'crop' => 'Tomato', 'disease' => 'early_blight', 'count' => 9],
            ['governorate' => 'Nabeul', 'crop' => 'Corn', 'disease' => 'northern_leaf_blight', 'count' => 7],
            ['governorate' => 'Bizerte', 'crop' => 'Grape', 'disease' => 'black_rot', 'count' => 6],
        ];

        foreach ($outbreaks as $outbreak) {
            $farmers = $farmersByGovernorate[$outbreak['governorate']];
            $zone = $governorates[$outbreak['governorate']]['zone'];

            for ($i = 0; $i < $outbreak['count']; $i++) {
                $createdAt = $now->copy()->subDays(random_int(0, 6))->subHours(random_int(0, 23));

                $rows[] = [
                    'user_id' => $farmers[array_rand($farmers)],
                    'image_path' => 'seed/analyses/'.Str::uuid().'.jpg',
                    'gradcam_path' => null,
                    'predicted_class' => $outbreak['crop'].'__'.$outbreak['disease'],
                    'crop' => $outbreak['crop'],
                    'confidence' => round(random_int(700, 990) / 1000, 4),
                    'top_k' => null,
                    'status' => 'done',
                    'inference_ms' => random_int(120, 900),
                    'error_message' => null,
                    'expert_id' => $expertId,
                    'expert_validated_at' => $createdAt->copy()->addHours(random_int(1, 12)),
                    'validation_status' => 'validated',
                    'expert_comment' => null,
                    ...$this->randomWeatherFor($zone),
                    'weather_fetched_at' => $createdAt,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ];
            }
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('analyses')->insert($chunk);
        }

        $this->command?->info('Seeded '.count($rows).' demo analyses across '.count($governorates).' governorates.');
    }

    /**
     * @param string[] $governorateNames
     * @return array<string,int[]>
     */
    private function ensureDemoFarmers(array $governorateNames): array
    {
        $farmersByGovernorate = [];

        foreach ($governorateNames as $governorate) {
            $slug = Str::slug($governorate);
            $ids = [];

            for ($i = 1; $i <= 3; $i++) {
                $email = "demo.{$slug}.{$i}@agridetect.test";

                $user = User::firstOrCreate(
                    ['email' => $email],
                    [
                        'name' => "Agriculteur démo {$governorate} {$i}",
                        'farm' => "Ferme démo {$governorate} {$i}",
                        'governorate' => $governorate,
                        'password' => Hash::make('password'),
                        'is_active' => true,
                        'must_change_password' => false,
                    ]
                );

                if (! $user->hasRole('farmer')) {
                    $user->assignRole('farmer');
                }

                $ids[] = $user->id;
            }

            $farmersByGovernorate[$governorate] = $ids;
        }

        return $farmersByGovernorate;
    }

    /**
     * Random but plausible weather snapshot for a given climate zone
     * (nord / centre / sud), matching Tunisia's real seasonal ranges.
     *
     * @return array{temperature: float, humidity: float, rainfall: float, wind_speed: float}
     */
    private function randomWeatherFor(string $zone): array
    {
        [$tempMin, $tempMax, $humMin, $humMax] = match ($zone) {
            'nord' => [18, 28, 65, 82],
            'centre' => [22, 32, 55, 75],
            'sud' => [28, 38, 30, 55],
            default => [20, 30, 50, 70],
        };

        return [
            'temperature' => round(random_int($tempMin * 10, $tempMax * 10) / 10, 1),
            'humidity' => round(random_int($humMin * 10, $humMax * 10) / 10, 1),
            'rainfall' => random_int(1, 100) <= 70 ? 0.0 : round(random_int(1, 150) / 10, 1),
            'wind_speed' => round(random_int(30, 250) / 10, 1),
        ];
    }

    private function weightedValidationStatus(): string
    {
        $roll = random_int(1, 100);

        return match (true) {
            $roll <= 75 => 'validated',
            $roll <= 90 => 'pending',
            default => 'rejected',
        };
    }

    private function ensureDemoExpert(): int
    {
        $expert = User::firstOrCreate(
            ['email' => 'demo.expert@agridetect.test'],
            [
                'name' => 'Amine Bouaziz',
                'first_name' => 'Amine',
                'last_name' => 'Bouaziz',
                'password' => Hash::make('password'),
                'is_active' => true,
                'must_change_password' => false,
            ]
        );

        if (! $expert->hasRole('expert')) {
            $expert->assignRole('expert');
        }
        if (! $expert->hasRole('farmer')) {
            $expert->assignRole('farmer');
        }

        return $expert->id;
    }

    private function randomRejectionComment(): string
    {
        $comments = [
            "Le diagnostic proposé ne correspond pas aux symptômes visibles sur la photo, une contre-visite est recommandée.",
            "Confiance du modèle trop faible pour ce cas — reprendre une photo plus nette avant de traiter.",
            "Les recommandations de traitement ne sont pas adaptées à ce stade de la culture.",
            "Symptômes compatibles avec un stress hydrique plutôt qu'une maladie — pas de traitement phytosanitaire nécessaire.",
        ];

        return $comments[array_rand($comments)];
    }
}
