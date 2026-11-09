<?php

namespace App\Support;

/**
 * Canonical shape + defaults for a user's granular notification preferences,
 * persisted as JSON in users.notification_preferences.
 *
 * Two groups:
 *  - channels : which kinds of notifications the farmer wants to receive at all
 *  - alerts   : which situations should trigger an "alerte agricole"
 */
class NotificationPreferences
{
    /** @var list<string> */
    public const CHANNEL_KEYS = [
        'disease_alerts',
        'high_risk',
        'expert_validation',
        'new_recommendations',
        'followup_reminder',
        'agri_news',
    ];

    /** @var list<string> */
    public const ALERT_KEYS = [
        'alert_high_risk',
        'alert_rising_region',
        'alert_new_analysis_recommended',
        'alert_expert_validates',
        'alert_weather_unfavorable',
    ];

    /**
     * @return array<string, bool>
     */
    public static function defaults(): array
    {
        $keys = array_merge(self::CHANNEL_KEYS, self::ALERT_KEYS);

        return array_fill_keys($keys, true);
    }

    /**
     * Merge a (possibly partial, possibly dirty) payload onto the current
     * preferences, keeping only known keys and coercing every value to bool.
     *
     * @param  array<string, mixed>|null  $current
     * @param  array<string, mixed>  $incoming
     * @return array<string, bool>
     */
    public static function merge(?array $current, array $incoming): array
    {
        $merged = array_merge(self::defaults(), is_array($current) ? $current : []);

        foreach (array_merge(self::CHANNEL_KEYS, self::ALERT_KEYS) as $key) {
            if (array_key_exists($key, $incoming)) {
                $merged[$key] = filter_var($incoming[$key], FILTER_VALIDATE_BOOLEAN);
            }
        }

        // Drop any stray keys that are no longer part of the schema.
        return array_intersect_key($merged, self::defaults());
    }
}
