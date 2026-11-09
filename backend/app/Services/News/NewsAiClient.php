<?php

namespace App\Services\News;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Enrichit un élément RSS brut (titre / description / lien) : résumé, culture,
 * maladie, catégorie, score de pertinence. Appelle le service Python
 * (POST /news/enrich) et, s'il est indisponible, applique localement
 * EXACTEMENT les mêmes règles : celles de ai/news/keywords.json, source de
 * vérité unique lue par les deux couches (config('news.keywords_path')).
 *
 * Aucun modèle de langage n'est utilisé : `ai_generated` vaut donc toujours
 * false, et le frontend n'affiche plus de badge « Résumé IA ».
 */
class NewsAiClient
{
    /** @var array<string, mixed>|null */
    private ?array $rules = null;

    public function enrich(array $item): array
    {
        $url = config('services.ai.url');

        try {
            $response = Http::timeout(10)->post($url.'/news/enrich', [
                'title' => $item['title'],
                'description' => $item['description'] ?? '',
                'link' => $item['link'],
            ]);

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'summary' => $data['summary'],
                    'category' => $data['category'],
                    'crop' => $data['crop'] ?? null,
                    'disease_class' => $data['disease_class'] ?? null,
                    'relevance_score' => (float) $data['relevance_score'],
                    'ai_generated' => false,
                ];
            }

            Log::warning('News AI service returned an error, using fallback', [
                'url' => $url,
                'status' => $response->status(),
            ]);
        } catch (ConnectionException $e) {
            Log::warning('News AI service unreachable, using fallback', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);
        }

        return $this->fallbackEnrich($item);
    }

    /**
     * Même algorithme que ai/news/enrich.py, mêmes règles (keywords.json) :
     * mots entiers sensibles aux accents, pluriel en s/x toléré, expressions
     * les plus longues d'abord, classes CNN exactes uniquement.
     */
    public function fallbackEnrich(array $item): array
    {
        $rules = $this->rules();
        $haystack = mb_strtolower($this->cleanText($item['title'].' '.($item['description'] ?? '')));

        $crop = null;
        foreach ($this->longestFirst($this->cropKeywords($rules)) as [$keyword, $cropName]) {
            if ($this->matches($haystack, $keyword)) {
                $crop = $cropName;
                break;
            }
        }

        $diseaseClass = null;
        if ($crop) {
            foreach ($this->longestFirst($this->diseaseKeywords($rules)) as [$keyword, $classes]) {
                if (isset($classes[$crop]) && $this->matches($haystack, $keyword)) {
                    $diseaseClass = $classes[$crop];
                    break;
                }
            }
        }

        $category = 'info';
        foreach ($rules['categories'] as $categoryKey => $keywords) {
            foreach ($keywords as $keyword) {
                if ($this->matches($haystack, $keyword)) {
                    $category = $categoryKey;
                    break 2;
                }
            }
        }

        $agri = collect($rules['agri_context'])->contains(fn ($keyword) => $this->matches($haystack, $keyword));

        return [
            'summary' => $this->truncateSummary($item['description'] ?? $item['title']),
            'category' => $category,
            'crop' => $crop,
            'disease_class' => $diseaseClass,
            'relevance_score' => $this->score($rules['scoring'], $agri, $crop, $diseaseClass, $category),
            'ai_generated' => false,
        ];
    }

    /** @return array<string, mixed> */
    private function rules(): array
    {
        if ($this->rules !== null) {
            return $this->rules;
        }

        $path = config('news.keywords_path');
        $json = is_string($path) && is_file($path) ? file_get_contents($path) : false;
        $rules = $json !== false ? json_decode($json, true) : null;

        if (! is_array($rules)) {
            throw new RuntimeException("Règles de classification des actualités introuvables : {$path}");
        }

        return $this->rules = $rules;
    }

    /** Mot entier (bornes Unicode), pluriel en s/x toléré — identique à enrich._pattern(). */
    private function matches(string $haystack, string $keyword): bool
    {
        $pattern = '/(?<![\p{L}\p{N}_])'.preg_quote(mb_strtolower($keyword), '/').'(?:s|x)?(?![\p{L}\p{N}_])/u';

        return preg_match($pattern, $haystack) === 1;
    }

    /** @return list<array{0: string, 1: string}> */
    private function cropKeywords(array $rules): array
    {
        $pairs = [];
        foreach ($rules['crops'] as $crop => $keywords) {
            foreach ($keywords as $keyword) {
                $pairs[] = [$keyword, $crop];
            }
        }

        return $pairs;
    }

    /** @return list<array{0: string, 1: array<string, string>}> */
    private function diseaseKeywords(array $rules): array
    {
        $pairs = [];
        foreach ($rules['diseases'] as $rule) {
            foreach ($rule['keywords'] as $keyword) {
                $pairs[] = [$keyword, $rule['classes']];
            }
        }

        return $pairs;
    }

    /**
     * Tri stable par longueur décroissante, comme sorted(..., reverse=True)
     * en Python (à longueur égale, l'ordre du fichier est conservé).
     */
    private function longestFirst(array $pairs): array
    {
        $indexed = array_map(null, $pairs, array_keys($pairs));
        usort($indexed, fn ($a, $b) => (mb_strlen($b[0][0]) <=> mb_strlen($a[0][0])) ?: ($a[1] <=> $b[1]));

        return array_column($indexed, 0);
    }

    private function score(array $scoring, bool $agri, ?string $crop, ?string $diseaseClass, string $category): float
    {
        $score = $scoring['base'];

        if ($agri || $crop || $diseaseClass) {
            $score += $scoring['agri_signal'];
            $score += $crop ? $scoring['crop'] : 0;
            $score += $diseaseClass ? $scoring['disease'] : 0;
            $score += $category !== 'info' ? $scoring['category'] : 0;
        }

        return round(min($score, $scoring['max']), 2);
    }

    private function cleanText(string $text): string
    {
        $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // \s ne couvre pas l'espace insécable (&nbsp;) en PCRE, contrairement à str.split() en Python.
        return trim(preg_replace('/[\s\x{00A0}]+/u', ' ', $text));
    }

    private function truncateSummary(string $text): string
    {
        return Str::limit($this->cleanText($text), 280);
    }
}
