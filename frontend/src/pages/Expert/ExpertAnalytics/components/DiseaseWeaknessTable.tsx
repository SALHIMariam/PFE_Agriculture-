import ComponentCard from "../../../../components/common/ComponentCard";
import { DiseaseWeaknessStats, DiseaseWeaknessStatus } from "../services/expertIntelligenceService";
import { formatDisease } from "./KpiTile";

type Props = { data: DiseaseWeaknessStats | null; loading: boolean };

const STATUS_STYLES: Record<DiseaseWeaknessStatus, string> = {
  weak: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
  moderate: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  strong: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  insufficient_data: "bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400",
};

const STATUS_LABELS: Record<DiseaseWeaknessStatus, string> = {
  weak: "Faible",
  moderate: "Moyenne",
  strong: "Solide",
  insufficient_data: "Échantillon insuffisant",
};

export default function DiseaseWeaknessTable({ data, loading }: Props) {
  return (
    <ComponentCard
      title="Faiblesses de l’IA par maladie"
      desc="Fiabilité de l'IA par maladie, comparée à la moyenne globale"
      collapsibleInfo="Identifie les maladies où l'IA performe le moins bien, en comparant le taux d'accord de chaque maladie à la moyenne globale. Statut : Solide (fiable), Moyenne, Faible (nécessite une attention), ou Échantillon insuffisant (pas assez de cas pour conclure). Utile pour cibler les améliorations du modèle sur les faiblesses spécifiques."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading || !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : data.diseases.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Données insuffisantes</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="py-2 pr-4">Maladie</th>
                <th className="py-2 pr-4">Cas</th>
                <th className="py-2 pr-4">Confiance moy.</th>
                <th className="py-2 pr-4">Accord</th>
                <th className="py-2 pr-4">Erreurs haute confiance</th>
                <th className="py-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {data.diseases.map((d) => (
                <tr key={d.predicted_class} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/20">
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                    {formatDisease(d.predicted_class)}
                  </td>
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{d.total_cases}</td>
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{d.avg_confidence !== null ? `${d.avg_confidence}%` : "N/D"}</td>
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{d.agreement_rate !== null ? `${d.agreement_rate}%` : "N/D"}</td>
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                    {d.high_confidence_error_rate !== null ? `${d.high_confidence_error_rate}%` : "N/D"}
                  </td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[d.status]}`}>
                      {STATUS_LABELS[d.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.global_avg_agreement !== null && (
            <p className="mt-3 text-[11px] text-gray-400">
              Moyenne globale d'accord : {data.global_avg_agreement}% · échantillon minimum : {data.min_sample_size} cas
            </p>
          )}
        </div>
      )}
    </ComponentCard>
  );
}
