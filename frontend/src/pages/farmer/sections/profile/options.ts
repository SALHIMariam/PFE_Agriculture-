import { GOVERNORATES } from "../../../Heatmap/data/governorates";
import { CROP_EMOJIS } from "../../../../data/crops";

export { CROP_EMOJIS, cropEmoji } from "../../../../data/crops";

export const CROP_OPTIONS = Object.keys(CROP_EMOJIS);

export const GOVERNORATE_NAMES: string[] = GOVERNORATES.map((g) => g.name);

export const FARM_TYPE_OPTIONS = ["Small", "Medium", "Large"] as const;

/** Must match App\Http\Requests\Profile\UpdateProfileRequest::IRRIGATION_SYSTEMS */
export const IRRIGATION_OPTIONS = [
  "goutte_a_goutte",
  "aspersion",
  "gravitaire",
  "pivot",
  "manuel",
  "aucun",
] as const;

/** Must match App\Http\Requests\Profile\UpdateProfileRequest::MAIN_SEASONS */
export const SEASON_OPTIONS = ["printemps", "ete", "automne", "hiver", "toute_annee"] as const;

/** Channel toggles shown in the profile "Notifications" card. */
export const NOTIFICATION_CHANNEL_KEYS = [
  "disease_alerts",
  "high_risk",
  "expert_validation",
  "new_recommendations",
] as const;

/**
 * "Alertes agricoles" checkboxes — no longer displayed. The keys still exist on
 * the backend `notification_preferences` payload (alert_high_risk,
 * alert_rising_region, alert_new_analysis_recommended, alert_expert_validates,
 * alert_weather_unfavorable) so the type stays complete; the UI just doesn't
 * render them anymore.
 */
export const NOTIFICATION_ALERT_KEYS = [] as const;
