import ComponentCard from "../../../../components/common/ComponentCard";
import { OverviewStats } from "../services/expertAnalyticsService";
import { formatPct } from "./KpiTile";

type Props = { data: OverviewStats | null; loading: boolean };

export default function ExpertEditRateCard({ data, loading }: Props) {
  const funnel = data?.edit_funnel;
  const total = funnel ? funnel.accepted_directly + funnel.edited + funnel.rejected : 0;

  const acceptedPct = total > 0 ? (funnel!.accepted_directly / total) * 100 : 0;
  const editedPct = total > 0 ? (funnel!.edited / total) * 100 : 0;
  const rejectedPct = total > 0 ? (funnel!.rejected / total) * 100 : 0;

  return (
    <ComponentCard
      title="Taux de modification par les experts"
      desc="Taux d'édition des réponses générées par l'IA"
      tooltip="Fréquence à laquelle les experts modifient les informations des analyses (diagnostic, notes, images). Un taux élevé peut refléter des données initiales incomplètes ou des corrections nécessaires."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading || !data ? (
        <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : (
        <div>
          <p className="mb-1 text-3xl font-bold text-gray-900 dark:text-white">{formatPct(data.expert_edit_rate_pct)}</p>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Taux d'édition</p>

          {total > 0 ? (
            <>
              <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div className="h-full bg-[#40916c]" style={{ width: `${acceptedPct}%` }} title="Acceptées directement" />
                <div className="h-full bg-[#c9a84c]" style={{ width: `${editedPct}%` }} title="Éditées" />
                <div className="h-full bg-[#e04f5f]" style={{ width: `${rejectedPct}%` }} title="Rejetées" />
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#40916c]" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Acceptées ({funnel!.accepted_directly})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#c9a84c]" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Éditées ({funnel!.edited})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#e04f5f]" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Rejetées ({funnel!.rejected})</span>
                </div>
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-gray-400">Données insuffisantes</p>
          )}
        </div>
      )}
    </ComponentCard>
  );
}
