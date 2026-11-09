import ComponentCard from "../../../../components/common/ComponentCard";
import { LearningOpportunitiesStats, LearningPriority } from "../services/expertIntelligenceService";
import KpiTile, { formatDisease } from "./KpiTile";

type Props = {
  data: LearningOpportunitiesStats | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  filter: LearningPriority | "all";
  onFilterChange: (filter: LearningPriority | "all") => void;
};

const PRIORITY_LABELS: Record<LearningPriority, string> = {
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
};

const PRIORITY_STYLES: Record<LearningPriority, string> = {
  high: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
  medium: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  low: "bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400",
};

export default function LearningOpportunitiesCard({ data, loading, page, onPageChange, filter, onFilterChange }: Props) {
  // data.candidates is already filtered + paginated server-side (see
  // useExpertIntelligence / ExpertIntelligenceService::learningOpportunities),
  // so no client-side filtering here — filtering only the current page would
  // show "Not enough data" for medium/low since candidates are sorted
  // high -> medium -> low before pagination.
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;
  const candidates = data?.candidates ?? [];

  return (
    <ComponentCard
      title="Opportunités d’apprentissage pour l’IA"
      desc="Candidats identifiés pour un futur ré-entraînement du modèle. Classés par valeur : élevée (confiance ≥ 90 % mais corrigé, ou taux d'accord de la maladie < 60 %), moyenne (confiance ≥ 70 % ou accord < 75 %), faible (autres). Jamais appliqué automatiquement — nécessite validation humaine."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading || !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiTile label="Total candidats" value={String(data.summary.total_candidates)} />
            <KpiTile label="Valeur élevée" value={String(data.summary.high_value)} />
            <KpiTile label="Valeur moyenne" value={String(data.summary.medium_value)} />
            <KpiTile label="Valeur faible" value={String(data.summary.low_value)} />
          </div>

          <div className="flex gap-1">
            {(["all", "high", "medium", "low"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFilterChange(f)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  filter === f ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"
                }`}
              >
                {f === "all" ? "Tous" : PRIORITY_LABELS[f]}
              </button>
            ))}
          </div>

          {candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Données insuffisantes</p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="py-1.5 pr-3">Maladie</th>
                    <th className="py-1.5 pr-3">Confiance</th>
                    <th className="py-1.5 pr-3">Priorité</th>
                    <th className="py-1.5">Raisons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {candidates.map((c) => (
                    <tr key={c.analysis_id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/20">
                      <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300">{formatDisease(c.predicted_class)}</td>
                      <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300">{c.confidence}%</td>
                      <td className="py-1.5 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLES[c.learning_priority]}`}>
                          {PRIORITY_LABELS[c.learning_priority]}
                        </span>
                      </td>
                      <td className="py-1.5 text-gray-500 dark:text-gray-400">{c.reasons.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-md px-2 py-1 disabled:opacity-30">
                ← Précédent
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-md px-2 py-1 disabled:opacity-30">
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}
    </ComponentCard>
  );
}
