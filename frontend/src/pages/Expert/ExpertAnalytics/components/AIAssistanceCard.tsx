import ComponentCard from "../../../../components/common/ComponentCard";
import { OverviewStats } from "../services/expertAnalyticsService";
import { formatPct } from "./KpiTile";

type Props = { data: OverviewStats | null; loading: boolean };

export default function AIAssistanceCard({ data, loading }: Props) {
  const breakdown = data?.ai_assistance_breakdown;

  return (
    <ComponentCard
      title="Taux d’assistance de l’IA"
      desc="Part des réponses préparées par l'Assistant AI (vue Expert)"
      tooltip="Pourcentage d'analyses où l'IA a fourni un diagnostic avant la décision de l'expert. Mesure à quel point les experts s'appuient sur les suggestions de l'IA dans leur travail quotidien."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading || !data ? (
        <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : (
        <div>
          <div className="mb-4 border-b border-gray-100 pb-4 text-center dark:border-gray-700">
            <p className="text-4xl font-bold text-[#40916c] dark:text-emerald-400">{formatPct(data.ai_assistance_rate_pct)}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Taux d'assistance</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-700/30">
              <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{breakdown?.prepared ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Préparées</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-900/20">
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{breakdown?.accepted_directly ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Acceptées</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-900/20">
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{breakdown?.modified ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Modifiées</p>
            </div>
            <div className="rounded-xl bg-red-50 p-3 text-center dark:bg-red-900/20">
              <p className="text-xl font-bold text-[#e04f5f] dark:text-red-400">{breakdown?.rejected ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Rejetées</p>
            </div>
          </div>
        </div>
      )}
    </ComponentCard>
  );
}
