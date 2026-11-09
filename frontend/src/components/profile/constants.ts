/**
 * Static option lists and label maps for the dashboard "User Profile" page
 * (src/pages/UserProfiles.tsx). No fictional data — only enums the backend
 * validates against.
 */

/** 24 gouvernorats tunisiens — valeurs stockées telles quelles côté API. */
export const TUNISIAN_GOVERNORATES = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Kef",
  "Mahdia",
  "Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
] as const;

export type AppLanguage = "fr" | "en" | "ar";

export const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

export type FarmProfile = "Small" | "Medium" | "Large";

export const FARM_PROFILE_OPTIONS: { value: FarmProfile; label: string }[] = [
  { value: "Small", label: "Petite" },
  { value: "Medium", label: "Moyenne" },
  { value: "Large", label: "Grande" },
];

export const FARM_PROFILE_LABELS: Record<string, string> = {
  Small: "Petite",
  Medium: "Moyenne",
  Large: "Grande",
};

/** Doit correspondre à UpdateProfileRequest::IRRIGATION_SYSTEMS. */
export const IRRIGATION_OPTIONS: { value: string; label: string }[] = [
  { value: "goutte_a_goutte", label: "Goutte à goutte" },
  { value: "aspersion", label: "Aspersion" },
  { value: "gravitaire", label: "Gravitaire" },
  { value: "pivot", label: "Pivot" },
  { value: "manuel", label: "Manuel" },
  { value: "aucun", label: "Aucun" },
];

/** Doit correspondre à UpdateProfileRequest::MAIN_SEASONS. */
export const SEASON_OPTIONS: { value: string; label: string }[] = [
  { value: "printemps", label: "Printemps" },
  { value: "ete", label: "Été" },
  { value: "automne", label: "Automne" },
  { value: "hiver", label: "Hiver" },
  { value: "toute_annee", label: "Toute l'année" },
];

function labelFrom(options: { value: string; label: string }[], value?: string | null): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

export const irrigationLabel = (v?: string | null) => labelFrom(IRRIGATION_OPTIONS, v);
export const seasonLabel = (v?: string | null) => labelFrom(SEASON_OPTIONS, v);

/** Les 4 booléens de notification_preferences réellement filtrés côté serveur
 * (voir NotificationController::PREFERENCE_TYPE_FILTERS), dans l'ordre d'affichage. */
export const NOTIFICATION_LABELS: { key: string; label: string }[] = [
  { key: "disease_alerts", label: "Alertes maladies" },
  { key: "high_risk", label: "Risques élevés" },
  { key: "expert_validation", label: "Validations expert" },
  { key: "new_recommendations", label: "Nouvelles recommandations" },
];

const DATE_LOCALE = "fr-FR";

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(DATE_LOCALE, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "Jamais";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Jamais";
  return d.toLocaleString(DATE_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Initiales à partir du nom complet, pour l'avatar de repli. */
export function initialsOf(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function roleLabel(role?: string): string {
  if (!role) return "—";
  return role.charAt(0).toUpperCase() + role.slice(1);
}
