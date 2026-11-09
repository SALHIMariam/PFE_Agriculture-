import ComponentCard from "../../../../components/common/ComponentCard";
import { ReliabilityMatrixStats } from "../services/expertIntelligenceService";

type Props = { data: ReliabilityMatrixStats | null; loading: boolean };

const CELL_STYLES: Record<string, string> = {
  high_confidence_agreement: "bg-success-50 border-success-200 dark:bg-success-500/10 dark:border-success-500/30",
  low_confidence_agreement: "bg-warning-50 border-warning-200 dark:bg-warning-500/10 dark:border-warning-500/30",
  high_confidence_correction: "bg-error-50 border-error-200 dark:bg-error-500/10 dark:border-error-500/30",
  low_confidence_correction: "bg-gray-50 border-gray-200 dark:bg-white/[0.03] dark:border-gray-800",
};

export default function ReliabilityMatrix({ data, loading }: Props) {
  return (
    <ComponentCard
      title="Matrice de fiabilité de l’IA"
      desc="Confiance IA vs décision experte"
      collapsibleInfo="Matrice montrant le taux de fiabilité de l'IA croisé avec son niveau de confiance (haute/basse). Permet d'identifier si l'IA se trompe surtout quand elle est peu confiante (normal) ou aussi quand elle est très confiante (surconfiance, plus problématique). Vert = accord, Rouge = corrections fréquentes."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading || !data ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : data.total === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Données insuffisantes</p>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(data.matrix) as Array<keyof typeof data.matrix>).map((key) => {
              const cell = data.matrix[key];
              return (
                <div key={key} className={`rounded-lg border p-3 ${CELL_STYLES[key]}`}>
                  <div className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {cell.pct !== null ? `${cell.pct}%` : "N/D"}
                  </div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{cell.label}</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">{cell.count} cas</div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">
            Seuil de haute confiance : {Math.round(data.confidence_threshold * 100)}% · {data.total} cas au total
          </p>
        </div>
      )}
    </ComponentCard>
  );
}
