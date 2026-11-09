import ComponentCard from "../../../../components/common/ComponentCard";
import { CorrectionStats } from "../services/expertAnalyticsService";
import { formatPct } from "./KpiTile";

type Props = { data: CorrectionStats | null; loading: boolean };

export default function CorrectionRateCard({ data, loading }: Props) {
  const rows = data
    ? [
        { label: "Global", value: data.global_rate_pct },
        { label: "Diagnostic (CNN)", value: data.diagnostic_rate_pct },
        { label: "Recommandation", value: data.recommendation_rate_pct },
        { label: "Réponse rejetée", value: data.global_rejected_rate_pct },
      ]
    : [];

  return (
    <ComponentCard
      title="Taux de correction de l’IA"
      desc="Taux de correction du diagnostic IA par les experts"
      tooltip="Pourcentage d'analyses où l'expert a modifié le diagnostic proposé par l'IA. Un taux élevé peut indiquer que le modèle nécessite un ré-entraînement sur certaines maladies."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading || !data ? (
        <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">{row.label}</span>
              <div className="flex flex-1 items-center justify-end gap-2">
                <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-[#40916c]"
                    style={{ width: `${row.value === null ? 0 : Math.min(100, Math.max(0, row.value))}%` }}
                  />
                </div>
                <span
                  className={`w-14 text-right text-sm font-semibold ${
                    row.value === null ? "text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {formatPct(row.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </ComponentCard>
  );
}
