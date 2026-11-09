<?php

namespace Database\Seeders;

use App\Models\NewsItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Generates ~50 realistic French news items so the "Actualités" feed has
 * something to display without running live RSS ingestion.
 *
 * Run manually: php artisan db:seed --class=NewsDemoSeeder
 */
class NewsDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();
        $items = $this->items();
        $rows = [];

        foreach ($items as $i => $item) {
            $publishedAt = $now->copy()->subDays($i % 45)->subHours(random_int(0, 23));
            $url = 'https://example-agri-news.tn/articles/'.($i + 1).'-'.str_replace(' ', '-', strtolower($item['title']));
            $url = substr($url, 0, 250);

            $rows[] = [
                'title' => $item['title'],
                'summary' => $item['summary'],
                'source_name' => $item['source'],
                'url' => $url,
                'url_hash' => hash('sha256', $url),
                'image_url' => null,
                'category' => $item['category'],
                'crop' => $item['crop'] ?? null,
                'disease_class' => $item['disease_class'] ?? null,
                'relevance_score' => $item['relevance_score'],
                'ai_generated' => $item['ai_generated'] ?? true,
                'published_at' => $publishedAt,
                'created_at' => $publishedAt,
                'updated_at' => $publishedAt,
            ];
        }

        foreach (array_chunk($rows, 20) as $chunk) {
            // Conflict target must be `url`: it's the only column with a DB-level
            // unique constraint (url_hash is only indexed, per the news_items schema).
            NewsItem::upsert($chunk, ['url'], [
                'title', 'summary', 'source_name', 'url_hash', 'image_url', 'category',
                'crop', 'disease_class', 'relevance_score', 'ai_generated', 'published_at',
            ]);
        }

        $this->command?->info(count($rows).' actualités insérées (upsert par url, relançable sans doublon).');
    }

    /**
     * @return array<int, array{title:string, summary:string, source:string, category:string, relevance_score:float, crop?:string, disease_class?:string, ai_generated?:bool}>
     */
    private function items(): array
    {
        return [
            // --- Tomato ---
            ['title' => 'Le mildiou de la tomate progresse dans le nord du pays', 'summary' => "Résumé IA : les services agricoles rapportent une hausse des cas de mildiou sur les cultures de tomate à Bizerte et Nabeul suite aux récentes pluies. Les agriculteurs sont invités à surveiller leurs parcelles.", 'source' => 'AgriTunisie Info', 'category' => 'alert', 'crop' => 'Tomato', 'disease_class' => 'tomato__late_blight', 'relevance_score' => 0.86],
            ['title' => 'Nouveau protocole de lutte biologique contre le mildiou', 'summary' => "Résumé IA : des chercheurs proposent un protocole à base de bicarbonate de potassium pour limiter la propagation du mildiou sur tomate, en complément des pratiques existantes.", 'source' => 'Institut National Agronomique', 'category' => 'new_treatment', 'crop' => 'Tomato', 'disease_class' => 'tomato__late_blight', 'relevance_score' => 0.78],
            ['title' => 'Virus des feuilles jaunes en enroulement : point de situation', 'summary' => "Résumé IA : le virus continue d'affecter certaines parcelles de tomate sous serre. Les experts recommandent la lutte contre les aleurodes, vecteurs principaux de la maladie.", 'source' => 'Ministère de l\'Agriculture', 'category' => 'info', 'crop' => 'Tomato', 'disease_class' => 'tomato__yellow_leaf_curl_virus', 'relevance_score' => 0.71],
            ['title' => 'Hausse de 12% des surfaces plantées en tomate cette saison', 'summary' => "Résumé IA : les surfaces consacrées à la tomate industrielle augmentent dans le centre du pays, portées par une demande à l'export en progression.", 'source' => 'Observatoire Agricole', 'category' => 'trend', 'crop' => 'Tomato', 'relevance_score' => 0.62],
            ['title' => 'Tache septorienne : bien reconnaître les premiers symptômes', 'summary' => "Résumé IA : guide pratique pour identifier la tache septorienne sur feuilles de tomate avant qu'elle ne se propage à l'ensemble de la parcelle.", 'source' => 'AgriConseil', 'category' => 'info', 'crop' => 'Tomato', 'disease_class' => 'tomato__septoria_leaf_spot', 'relevance_score' => 0.58, 'ai_generated' => false],

            // --- Potato ---
            ['title' => 'Le mildiou de la pomme de terre menace la récolte de printemps', 'summary' => "Résumé IA : conditions humides favorables au mildiou signalées à Béja et au Kef. Traitement préventif recommandé avant la floraison.", 'source' => 'AgriTunisie Info', 'category' => 'alert', 'crop' => 'Potato', 'disease_class' => 'potato__late_blight', 'relevance_score' => 0.83],
            ['title' => 'Alternariose de la pomme de terre : nouvelle variété tolérante identifiée', 'summary' => "Résumé IA : une variété locale montre une meilleure tolérance à l'alternariose lors des essais menés cette année.", 'source' => 'Institut National Agronomique', 'category' => 'new_disease', 'crop' => 'Potato', 'disease_class' => 'potato__early_blight', 'relevance_score' => 0.69],
            ['title' => 'Fongicide biologique homologué pour la pomme de terre', 'summary' => "Résumé IA : un nouveau fongicide à base de cuivre est désormais homologué pour lutter contre les maladies fongiques de la pomme de terre.", 'source' => 'Ministère de l\'Agriculture', 'category' => 'new_treatment', 'crop' => 'Potato', 'relevance_score' => 0.65],
            ['title' => 'Exportations de pomme de terre en progression', 'summary' => "Résumé IA : les exportations tunisiennes de pomme de terre vers l'Afrique du Nord affichent une croissance notable ce trimestre.", 'source' => 'Observatoire Agricole', 'category' => 'trend', 'crop' => 'Potato', 'relevance_score' => 0.55],

            // --- Grape / Vigne ---
            ['title' => 'Le black rot progresse sur les vignobles du Cap Bon', 'summary' => "Résumé IA : plusieurs viticulteurs du Cap Bon signalent une recrudescence du black rot après un printemps pluvieux.", 'source' => 'AgriTunisie Info', 'category' => 'alert', 'crop' => 'Grape', 'disease_class' => 'grape__black_rot', 'relevance_score' => 0.81],
            ['title' => 'Mildiou de la vigne : calendrier de traitement recommandé', 'summary' => "Résumé IA : les experts publient un calendrier de traitement préventif contre le mildiou adapté au climat tunisien.", 'source' => 'Institut National Agronomique', 'category' => 'new_treatment', 'crop' => 'Grape', 'disease_class' => 'grape__leaf_blight', 'relevance_score' => 0.73],
            ['title' => 'Black measles : symptômes à surveiller sur les ceps âgés', 'summary' => "Résumé IA : les ceps de plus de 10 ans sont particulièrement sensibles à cette maladie du bois. Points de vigilance détaillés.", 'source' => 'AgriConseil', 'category' => 'info', 'crop' => 'Grape', 'disease_class' => 'grape__black_measles', 'relevance_score' => 0.6, 'ai_generated' => false],
            ['title' => 'La demande en raisin de table tunisien en hausse à l\'export', 'summary' => "Résumé IA : la filière viticole bénéficie d'une demande soutenue sur les marchés européens cette saison.", 'source' => 'Observatoire Agricole', 'category' => 'trend', 'crop' => 'Grape', 'relevance_score' => 0.53],

            // --- Wheat / Blé ---
            ['title' => 'Rouille jaune du blé : premiers foyers détectés à Siliana', 'summary' => "Résumé IA : les services de vulgarisation signalent des foyers de rouille jaune, avec un risque de propagation en cas d'humidité persistante.", 'source' => 'Ministère de l\'Agriculture', 'category' => 'alert', 'crop' => 'Wheat', 'disease_class' => 'wheat__stripe_rust', 'relevance_score' => 0.84],
            ['title' => 'Nouvelle variété de blé résistante à la sécheresse', 'summary' => "Résumé IA : une variété développée localement montre une meilleure résistance au stress hydrique lors des essais en zone centre.", 'source' => 'Institut National Agronomique', 'category' => 'trend', 'crop' => 'Wheat', 'relevance_score' => 0.67],
            ['title' => 'Septoriose du blé : fenêtre de traitement optimale', 'summary' => "Résumé IA : les agronomes recommandent une intervention entre le stade 2 nœuds et la dernière feuille pour limiter la septoriose.", 'source' => 'AgriConseil', 'category' => 'new_treatment', 'crop' => 'Wheat', 'disease_class' => 'wheat__septoria', 'relevance_score' => 0.6, 'ai_generated' => false],
            ['title' => 'Prévisions de récolte céréalière 2026', 'summary' => "Résumé IA : les prévisions tablent sur une récolte céréalière en légère hausse par rapport à la saison précédente.", 'source' => 'Observatoire Agricole', 'category' => 'info', 'crop' => 'Wheat', 'relevance_score' => 0.5],

            // --- Apple / Pomme ---
            ['title' => 'Tavelure du pommier : risque élevé après les pluies de printemps', 'summary' => "Résumé IA : les conditions climatiques récentes augmentent le risque de tavelure dans les vergers du nord-ouest.", 'source' => 'AgriTunisie Info', 'category' => 'alert', 'crop' => 'Apple', 'disease_class' => 'apple__scab', 'relevance_score' => 0.79],
            ['title' => 'Rouille grillagée du pommier : gestion des cyprès à proximité', 'summary' => "Résumé IA : la présence de cyprès à proximité des vergers favorise le cycle de la rouille grillagée. Recommandations de distanciation.", 'source' => 'Institut National Agronomique', 'category' => 'info', 'crop' => 'Apple', 'disease_class' => 'apple__cedar_apple_rust', 'relevance_score' => 0.56, 'ai_generated' => false],
            ['title' => 'Pourriture noire du pommier : bilan de la campagne', 'summary' => "Résumé IA : la campagne enregistre une baisse des cas de pourriture noire grâce à une meilleure taille sanitaire des vergers.", 'source' => 'Observatoire Agricole', 'category' => 'trend', 'crop' => 'Apple', 'disease_class' => 'apple__black_rot', 'relevance_score' => 0.52],

            // --- Corn / Maïs ---
            ['title' => 'Helminthosporiose du maïs signalée dans le Kef', 'summary' => "Résumé IA : plusieurs parcelles de maïs présentent des symptômes d'helminthosporiose. Surveillance renforcée demandée.", 'source' => 'Ministère de l\'Agriculture', 'category' => 'alert', 'crop' => 'Corn', 'disease_class' => 'corn__northern_leaf_blight', 'relevance_score' => 0.8],
            ['title' => 'Virus de la striure du maïs : vecteur identifié', 'summary' => "Résumé IA : les entomologistes confirment le rôle d'une cicadelle locale dans la transmission du virus de la striure du maïs.", 'source' => 'Institut National Agronomique', 'category' => 'new_disease', 'crop' => 'Corn', 'disease_class' => 'corn__maize_streak_virus_disease', 'relevance_score' => 0.7],
            ['title' => 'Bonnes pratiques pour limiter la tache grise du maïs', 'summary' => "Résumé IA : rotation des cultures et gestion des résidus recommandées pour limiter la tache grise du maïs.", 'source' => 'AgriConseil', 'category' => 'new_treatment', 'crop' => 'Corn', 'disease_class' => 'corn__gray_leaf_spot', 'relevance_score' => 0.59, 'ai_generated' => false],

            // --- Groundnut / Arachide ---
            ['title' => 'Rouille de l\'arachide : point sur la campagne en cours', 'summary' => "Résumé IA : la rouille de l'arachide reste sous contrôle cette saison grâce à un traitement précoce généralisé.", 'source' => 'Observatoire Agricole', 'category' => 'info', 'crop' => 'Groundnut', 'disease_class' => 'groundnut__rust', 'relevance_score' => 0.54],
            ['title' => 'Cercosporiose précoce de l\'arachide : alerte dans le sud', 'summary' => "Résumé IA : des foyers de cercosporiose précoce sont signalés dans les zones de culture du sud du pays.", 'source' => 'AgriTunisie Info', 'category' => 'alert', 'crop' => 'Groundnut', 'disease_class' => 'groundnut__early_leaf_spot', 'relevance_score' => 0.77],
            ['title' => 'Carences nutritionnelles chez l\'arachide : diagnostic visuel', 'summary' => "Résumé IA : guide pour distinguer les carences nutritionnelles des symptômes de maladie chez l'arachide.", 'source' => 'AgriConseil', 'category' => 'info', 'crop' => 'Groundnut', 'disease_class' => 'groundnut__nutrition_deficiency', 'relevance_score' => 0.51, 'ai_generated' => false],

            // --- Cucumber / Concombre ---
            ['title' => 'Mildiou du concombre sous serre : vigilance recommandée', 'summary' => "Résumé IA : l'humidité élevée sous serre favorise le développement du mildiou sur les cultures de concombre.", 'source' => 'Ministère de l\'Agriculture', 'category' => 'alert', 'crop' => 'Cucumber', 'disease_class' => 'cucumber__downy_mildew', 'relevance_score' => 0.75],
            ['title' => 'Oïdium du concombre : solution de lutte intégrée testée', 'summary' => "Résumé IA : une combinaison de variétés tolérantes et de traitement ciblé réduit significativement l'incidence de l'oïdium.", 'source' => 'Institut National Agronomique', 'category' => 'new_treatment', 'crop' => 'Cucumber', 'disease_class' => 'cucumber__powdery_mildew', 'relevance_score' => 0.68],
            ['title' => 'Anthracnose du concombre : bilan de mi-saison', 'summary' => "Résumé IA : les cas d'anthracnose restent limités cette saison grâce à une meilleure aération des serres.", 'source' => 'Observatoire Agricole', 'category' => 'trend', 'crop' => 'Cucumber', 'disease_class' => 'cucumber__anthracnose', 'relevance_score' => 0.5],

            // --- Bean / Haricot ---
            ['title' => 'Rouille du haricot détectée dans plusieurs coopératives', 'summary' => "Résumé IA : la rouille du haricot touche plusieurs parcelles suivies par les coopératives agricoles régionales.", 'source' => 'AgriTunisie Info', 'category' => 'alert', 'crop' => 'Bean', 'disease_class' => 'bean__beans_rust_disease', 'relevance_score' => 0.72],
            ['title' => 'Tache angulaire du haricot : semences certifiées recommandées', 'summary' => "Résumé IA : l'usage de semences certifiées limite fortement la transmission de la tache angulaire du haricot.", 'source' => 'AgriConseil', 'category' => 'new_treatment', 'crop' => 'Bean', 'disease_class' => 'bean__beans_angular_leaf_spot_disease', 'relevance_score' => 0.63, 'ai_generated' => false],
            ['title' => 'Bonne tenue des rendements du haricot cette saison', 'summary' => "Résumé IA : les rendements du haricot se maintiennent malgré une pression modérée des maladies foliaires.", 'source' => 'Observatoire Agricole', 'category' => 'trend', 'crop' => 'Bean', 'relevance_score' => 0.5],
            ['title' => 'Rappel : bien espacer les plants de haricot pour limiter l\'humidité foliaire', 'summary' => "Résumé IA : un espacement adapté réduit le temps d'humectation des feuilles et limite le risque de maladies fongiques sur haricot.", 'source' => 'AgriConseil', 'category' => 'info', 'crop' => 'Bean', 'relevance_score' => 0.5, 'ai_generated' => false],

            // --- General / market news (no crop tag), matches original mock tone ---
            ['title' => 'Subventions agricoles 2026 : ce qui change', 'summary' => "Résumé IA : le nouveau dispositif de subventions agricoles cible en priorité l'irrigation économe en eau et les intrants biologiques.", 'source' => 'Ministère de l\'Agriculture', 'category' => 'info', 'relevance_score' => 0.65],
            ['title' => 'Journée nationale de sensibilisation à la protection phytosanitaire', 'summary' => "Résumé IA : une journée d'information sur les bonnes pratiques phytosanitaires est organisée dans plusieurs gouvernorats.", 'source' => 'Ministère de l\'Agriculture', 'category' => 'info', 'relevance_score' => 0.55],
            ['title' => 'Météo agricole : semaine pluvieuse attendue dans le nord', 'summary' => "Résumé IA : les prévisions annoncent des précipitations importantes dans le nord du pays, propices au développement de maladies fongiques.", 'source' => 'Institut National de Météorologie', 'category' => 'trend', 'relevance_score' => 0.6],
            ['title' => 'Lancement d\'une plateforme de veille sanitaire agricole', 'summary' => "Résumé IA : une nouvelle plateforme nationale centralise les alertes phytosanitaires pour les agriculteurs.", 'source' => 'AgriTunisie Info', 'category' => 'new_treatment', 'relevance_score' => 0.58],
            ['title' => 'Formation gratuite sur la lutte intégrée contre les ravageurs', 'summary' => "Résumé IA : des sessions de formation gratuites sont proposées aux agriculteurs sur la lutte intégrée contre les ravageurs.", 'source' => 'AgriConseil', 'category' => 'info', 'relevance_score' => 0.52, 'ai_generated' => false],

            // --- Below the min_relevance_score threshold, to prove the API filters them out ---
            ['title' => 'Événement local : foire agricole à Sousse', 'summary' => "Résumé IA : une foire agricole locale se tiendra à Sousse ce week-end, sans lien direct avec la protection des cultures.", 'source' => 'AgriTunisie Info', 'category' => 'info', 'relevance_score' => 0.3, 'ai_generated' => false],
            ['title' => 'Interview : parcours d\'un jeune agriculteur', 'summary' => "Résumé IA : portrait d'un jeune agriculteur tunisien, article peu pertinent pour la veille sanitaire.", 'source' => 'AgriConseil', 'category' => 'info', 'relevance_score' => 0.25, 'ai_generated' => false],
        ];
    }
}
