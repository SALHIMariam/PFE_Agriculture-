import { ClipboardList, CheckCircle2, Clock, Hourglass, TrendingUp } from "lucide-react";
import { WorkloadStats, WorkloadByExpert } from "../services/expertAnalyticsService";
import { formatPct } from "./KpiTile";
import InfoTooltip from "../../../../components/common/InfoTooltip";

type Props = { data: WorkloadStats | null; loading: boolean };

type WorkloadKPI = {
  value: string;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  bgAccent: string;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ExpertWorkloadList({ experts }: { experts: WorkloadByExpert[] }) {
  const sorted = [...experts].sort((a, b) => b.treated - a.treated);

  return (
    <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-gray-700/50 dark:bg-gray-800">
      <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Performance par expert</h3>

      <div className="space-y-4">
        {sorted.map((expert) => {
          const completionRate = expert.assigned > 0 ? Math.round((expert.treated / expert.assigned) * 100) : 0;

          const barColor = completionRate >= 90 ? "bg-[#40916c]" : completionRate >= 60 ? "bg-[#c9a84c]" : "bg-[#e04f5f]";
          const rateColor =
            completionRate >= 90
              ? "text-[#40916c] dark:text-emerald-400"
              : completionRate >= 60
              ? "text-[#c9a84c] dark:text-amber-400"
              : "text-[#e04f5f] dark:text-red-400";

          return (
            <div key={expert.expert_id}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{initials(expert.expert_name)}</span>
                  </div>
                  <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">{expert.expert_name}</span>
                </div>

                <div className="ml-3 flex flex-shrink-0 items-center gap-4">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {expert.treated}/{expert.assigned}
                  </span>
                  <span className={`w-12 text-right text-sm font-bold ${rateColor}`}>{completionRate}%</span>
                </div>
              </div>

              <div className="ml-11 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WorkloadCard({ data, loading }: Props) {
  const kpis: WorkloadKPI[] | null = data
    ? [
        {
          value: String(data.assigned),
          label: "Assignées",
          icon: <ClipboardList className="h-5 w-5" />,
          colorClass: "text-blue-600 dark:text-blue-400",
          bgAccent: "bg-blue-50 dark:bg-blue-900/20",
        },
        {
          value: String(data.treated),
          label: "Traitées",
          icon: <CheckCircle2 className="h-5 w-5" />,
          colorClass: "text-[#40916c] dark:text-emerald-400",
          bgAccent: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
          value: String(data.remaining),
          label: "Restantes",
          icon: <Clock className="h-5 w-5" />,
          colorClass: "text-[#c9a84c] dark:text-amber-400",
          bgAccent: "bg-amber-50 dark:bg-amber-900/20",
        },
        {
          value: String(data.pending),
          label: "En attente",
          icon: <Hourglass className="h-5 w-5" />,
          colorClass: "text-orange-600 dark:text-orange-400",
          bgAccent: "bg-orange-50 dark:bg-orange-900/20",
        },
        {
          value: formatPct(data.completion_rate_pct),
          label: "Taux de traitement",
          icon: <TrendingUp className="h-5 w-5" />,
          colorClass: "text-[#40916c] dark:text-emerald-400",
          bgAccent: "bg-emerald-50 dark:bg-emerald-900/20",
        },
      ]
    : null;

  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center gap-1">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Charge de travail des experts</h2>
          <InfoTooltip text="Répartition de la charge de travail entre les experts. Affiche le nombre d'analyses assignées, traitées et restantes par expert, avec un taux de traitement. Les barres colorées indiquent la performance : vert (≥90%), orange (≥60%), rouge (<60%)." />
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">Charge de travail et taux de traitement</p>
      </div>

      {loading || !data || !kpis ? (
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="flex flex-col items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-gray-700/50 dark:bg-gray-800"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.bgAccent} ${kpi.colorClass}`}>{kpi.icon}</div>
                <div>
                  <p className={`text-xl font-bold ${kpi.colorClass}`}>{kpi.value}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>

          {data.by_expert && data.by_expert.length > 0 && <ExpertWorkloadList experts={data.by_expert} />}
        </>
      )}
    </section>
  );
}
