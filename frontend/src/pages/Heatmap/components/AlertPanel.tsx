import { useState } from "react";
import type { AlertEntry } from "../../../services/heatmapService";

type Props = {
  alerts: AlertEntry[];
  onSelect: (governorate: string) => void;
};

const SEVERITY_DOT: Record<AlertEntry["severity"], string> = {
  moderate: "bg-[#c9a84c]",
  high: "bg-[#e04f5f]",
  critical: "bg-[#e04f5f]",
};

const SEVERITY_LABEL: Record<AlertEntry["severity"], string> = {
  moderate: "Modéré",
  high: "Élevé",
  critical: "Critique",
};

/**
 * Badge compact et repliable (pas de carte géante centrée sur la carte —
 * cf. incident où 3+ alertes masquaient entièrement le Heatmap). Rendu comme
 * un élément de plus dans la colonne gauche (FilterPanel/Legend), pas en
 * position absolue indépendante : il hérite naturellement du z-index et de
 * la zone déjà réservée par cette colonne, sans jamais chevaucher la carte.
 */
export default function AlertPanel({ alerts, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) return null;

  return (
    <div className="pointer-events-auto">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white/90 px-3 py-2 text-left shadow-md backdrop-blur transition hover:shadow-lg dark:border-amber-500/30 dark:bg-gray-900/90"
      >
        <span className="text-amber-500">⚠</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 max-h-60 w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {alerts.map((alert) => (
            <button
              key={`${alert.governorate}-${alert.disease_key}`}
              type="button"
              onClick={() => onSelect(alert.governorate)}
              className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-xs transition last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[alert.severity]}`} />
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium text-gray-700 dark:text-gray-200">
                  {alert.governorate} · {SEVERITY_LABEL[alert.severity]}
                </span>
                <span className="block truncate text-gray-400">
                  {alert.cases} cas · {alert.disease}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
