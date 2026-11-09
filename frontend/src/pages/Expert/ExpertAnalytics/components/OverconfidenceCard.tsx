import ComponentCard from "../../../../components/common/ComponentCard";
import { OverconfidenceStats } from "../services/expertIntelligenceService";
import KpiTile, { formatPct, formatDisease } from "./KpiTile";

type Props = {
  data: OverconfidenceStats | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
};

export default function OverconfidenceCard({ data, loading, page, onPageChange }: Props) {
  const totalPages = data ? Math.max(1, Math.ceil(data.total_cases / data.per_page)) : 1;

  return (
    <ComponentCard
      title="Excès de confiance de l’IA"
      desc={`Prédictions à plus de ${data ? Math.round(data.threshold * 100) : 90}\u00a0% de confiance rejetées par l'expert`}
      tooltip="Détecte les cas où l'IA donne une confiance ≥ 90% mais l'expert corrige ou rejette. Le taux d'overconfidence indique la proportion de ces erreurs parmi les cas à haute confiance."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading || !data ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <KpiTile label="Cas haute confiance" value={String(data.high_confidence_cases)} />
            <KpiTile label="Erreurs" value={String(data.high_confidence_errors)} />
            <KpiTile label="Taux d’excès de confiance" value={formatPct(data.overconfidence_rate)} />
          </div>

          {data.cases.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Données insuffisantes</p>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      <th className="py-1.5 pr-3">Maladie</th>
                      <th className="py-1.5 pr-3">Confiance</th>
                      <th className="py-1.5">Commentaire expert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {data.cases.map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/20">
                        <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300">{formatDisease(c.predicted_class)}</td>
                        <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300">{c.confidence}%</td>
                        <td className="py-1.5 text-gray-500 dark:text-gray-400">{c.expert_comment || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="rounded-md px-2 py-1 disabled:opacity-30"
                  >
                    ← Précédent
                  </button>
                  <span>
                    Page {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="rounded-md px-2 py-1 disabled:opacity-30"
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </ComponentCard>
  );
}
