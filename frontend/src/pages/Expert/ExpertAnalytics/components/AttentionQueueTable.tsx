import { Fragment, useState } from "react";
import { Link } from "react-router";
import ComponentCard from "../../../../components/common/ComponentCard";
import { AttentionQueueStats } from "../services/expertIntelligenceService";
import { formatDisease } from "./KpiTile";
import { PRIORITY_LABELS, labelOf } from "../../../../utils/labels";

type Props = {
  data: AttentionQueueStats | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
};

function scoreColor(score: number): string {
  if (score >= 70) return "text-error-600 dark:text-error-400";
  if (score >= 40) return "text-warning-600 dark:text-warning-400";
  return "text-gray-600 dark:text-gray-400";
}

export default function AttentionQueueTable({ data, loading, page, onPageChange }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const totalPages = data ? Math.max(1, Math.ceil(data.total_pending / data.per_page)) : 1;

  return (
    <ComponentCard
      title="File d’attention intelligente"
      desc="File d'attente priorisée par score d'attention (aide à la décision, aucune action automatique)"
      collapsibleInfo="File d'attente intelligente qui priorise les analyses à traiter en fonction d'un score combinant : niveau de priorité médicale, incertitude du modèle, taux de rejet historique de la maladie et temps d'attente. Score de 0 (faible) à 100 (urgent). C'est une aide à la décision — aucune action n'est automatique."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading || !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : data.queue.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Aucun cas en attente.</p>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-2 pr-4">Maladie</th>
                  <th className="py-2 pr-4">Priorité</th>
                  <th className="py-2 pr-4">Confiance</th>
                  <th className="py-2 pr-4">Attente</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {data.queue.map((item) => (
                  <Fragment key={item.analysis_id}>
                    <tr className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/20">
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{formatDisease(item.predicted_class)}</td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{item.priority_level ? labelOf(PRIORITY_LABELS, item.priority_level) : "—"}</td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                        {item.confidence !== null ? `${item.confidence}%` : "N/D"}
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{item.hours_waiting}&nbsp;h</td>
                      <td className={`py-3 pr-4 font-semibold ${scoreColor(item.attention_score)}`}>{item.attention_score}</td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === item.analysis_id ? null : item.analysis_id)}
                          className="text-xs text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {expandedId === item.analysis_id ? "Masquer" : "Pourquoi ?"}
                        </button>{" "}
                        <Link
                          to={`/dashboard/analyses/${item.analysis_id}`}
                          className="text-xs text-brand-600 hover:underline dark:text-brand-400"
                        >
                          Valider →
                        </Link>
                      </td>
                    </tr>
                    {expandedId === item.analysis_id && (
                      <tr className="bg-gray-50 dark:bg-white/[0.02]">
                        <td colSpan={6} className="px-2 py-2">
                          <ul className="list-inside list-disc text-xs text-gray-600 dark:text-gray-400">
                            {item.reasons.map((reason, i) => (
                              <li key={i}>{reason}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-md px-2 py-1 disabled:opacity-30">
                ← Précédent
              </button>
              <span>
                Page {page} / {totalPages} · {data.total_pending} en attente
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
