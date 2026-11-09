/**
 * Libellés français des valeurs techniques renvoyées par l'API (rôles,
 * statuts, priorités, niveaux de risque). Les valeurs elles-mêmes ne sont
 * jamais traduites : seules leurs étiquettes affichées passent par ici.
 */

export const ROLE_LABELS: Record<string, string> = {
  farmer: "Agriculteur",
  expert: "Expert",
  admin: "Administrateur",
};

export const VALIDATION_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  validated: "Validée",
  rejected: "Rejetée",
};

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgente",
  important: "Importante",
  normal: "Normale",
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
  very_high: "Très élevé",
  critical: "Critique",
};

/** Libellé d'une valeur, ou la valeur elle-même si elle est inconnue. */
export function labelOf(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "";
  return map[value] ?? value;
}
