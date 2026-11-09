<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Libellés français des classes prédites par le CNN (config/diseases.php).
 * Les noms techniques (Tomato__early_blight…) restent ceux stockés en base ;
 * seule leur forme affichée passe par ici.
 */
class DiseaseLabels
{
    /** « Tomate » pour « Tomato » (insensible à la casse). */
    public static function crop(?string $crop): string
    {
        if (! $crop) {
            return '';
        }

        foreach (config('diseases.crops') as $key => $label) {
            if (strcasecmp($key, $crop) === 0) {
                return $label;
            }
        }

        return Str::title(str_replace('_', ' ', $crop));
    }

    /**
     * Nom de la maladie seul (« Mildiou »). Accepte une classe complète
     * (« Tomato__late_blight ») ou une clé partielle (« late_blight »),
     * éventuellement accompagnée de la culture.
     */
    public static function disease(?string $disease, ?string $crop = null): string
    {
        if (! $disease) {
            return '';
        }

        $labels = config('diseases.diseases');

        $candidates = str_contains($disease, '__') ? [$disease] : ($crop ? ["{$crop}__{$disease}"] : []);
        foreach ($candidates as $candidate) {
            foreach ($labels as $key => $label) {
                if (strcasecmp($key, $candidate) === 0) {
                    return $label;
                }
            }
        }

        $suffix = '__'.Str::lower(Str::afterLast($disease, '__'));
        foreach ($labels as $key => $label) {
            if (Str::endsWith(Str::lower($key), $suffix)) {
                return $label;
            }
        }

        return Str::ucfirst(str_replace('_', ' ', Str::lower(Str::afterLast($disease, '__'))));
    }

    /** « Tomate — Mildiou » pour une classe complète. */
    public static function full(?string $predictedClass): string
    {
        if (! $predictedClass) {
            return '';
        }

        if (! str_contains($predictedClass, '__')) {
            return self::disease($predictedClass);
        }

        return self::crop(Str::before($predictedClass, '__')).' — '.self::disease($predictedClass);
    }
}
