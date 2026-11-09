/** Palette et seuils de risque partagés par les cartes (TunisiaRiskMap). */
export const RISK_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
  none: "#d1d5db",
} as const;

export function riskColor(pct: number): string {
  if (pct >= 60) return RISK_COLORS.high;
  if (pct >= 30) return RISK_COLORS.medium;
  return RISK_COLORS.low;
}

export function riskLabel(pct: number): string {
  if (pct >= 60) return "élevé";
  if (pct >= 30) return "moyen";
  return "faible";
}
