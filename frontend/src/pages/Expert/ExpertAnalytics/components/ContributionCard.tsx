import { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { CheckCircle2, XCircle, PenLine } from "lucide-react";
import { ContributionStats } from "../services/expertAnalyticsService";
import { formatDisease } from "./KpiTile";
import { useTheme } from "../../../../context/ThemeContext";
import { sharedTooltip, chartBaseTheme } from "../chartTheme";
import InfoTooltip from "../../../../components/common/InfoTooltip";

type Props = { data: ContributionStats | null; loading: boolean };

type StatCardProps = {
  value: number;
  label: string;
  colorClass: string;
  iconBgClass: string;
  icon: React.ReactNode;
};

function StatCard({ value, label, colorClass, iconBgClass, icon }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-gray-700/50 dark:bg-gray-800">
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{value.toLocaleString()}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass}`}>{icon}</div>
      </div>
      <div className={`absolute -bottom-4 -right-4 h-24 w-24 rounded-full opacity-[0.07] ${colorClass}`} />
    </div>
  );
}

function DiseaseList({ diseases }: { diseases: { predicted_class?: string; validated: number; rejected: number }[] }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...diseases].sort((a, b) => b.validated - a.validated);
  const visible = showAll ? sorted : sorted.slice(0, 10);
  const maxVal = sorted[0]?.validated || 1;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-gray-700/50 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">Par maladie</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Top maladies par nombre de validations</p>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          {diseases.length} maladies
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Données insuffisantes</p>
      ) : (
        <>
          <div className="space-y-3">
            {visible.map((disease, index) => {
              const label = formatDisease(disease.predicted_class);
              const percentage = Math.round((disease.validated / maxVal) * 100);

              return (
                <div key={disease.predicted_class ?? index} className="group">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="w-5 flex-shrink-0 text-right text-xs font-medium text-gray-400 dark:text-gray-500">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm text-gray-700 dark:text-gray-200">{label}</span>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-[#40916c] dark:text-emerald-400">{disease.validated}</span>
                      <span className="text-xs text-[#e04f5f]">{disease.rejected} rej.</span>
                    </div>
                  </div>
                  <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-[#40916c] transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {diseases.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="mt-4 w-full rounded-lg py-2 text-center text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
            >
              {showAll ? "Voir moins ▲" : `Voir les ${diseases.length - 10} autres ▼`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function ContributionCard({ data, loading }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const cropRows = data?.by_crop ?? [];
  const { foreColor, labelColor, gridColor } = chartBaseTheme(isDark);

  const cropChartOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit", background: "transparent", foreColor },
    theme: { mode: isDark ? "dark" : "light" },
    plotOptions: {
      bar: { horizontal: true, barHeight: "55%", borderRadius: 6, borderRadiusApplication: "end" },
    },
    colors: ["#40916c", "#e04f5f"],
    dataLabels: {
      enabled: true,
      style: { fontSize: "12px", fontWeight: 600, colors: [isDark ? "#f3f4f6" : "#374151"] },
      formatter: (val: number) => (val > 0 ? val.toLocaleString() : ""),
    },
    xaxis: {
      categories: cropRows.map((c) => c.crop ?? "—"),
      labels: { style: { colors: labelColor, fontSize: "12px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: labelColor, fontSize: "13px", fontWeight: 500 } } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "13px", labels: { colors: labelColor }, markers: { size: 6 } },
    grid: { borderColor: gridColor, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: sharedTooltip(isDark, { y: { formatter: (val: number) => `${val.toLocaleString()} analyses` } }),
  };

  const cropSeries = [
    { name: "Validées", data: cropRows.map((c) => c.validated) },
    { name: "Rejetées", data: cropRows.map((c) => c.rejected) },
  ];

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-1">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Contribution des experts à l’IA</h2>
          <InfoTooltip text="Résumé des contributions des experts au système IA : analyses validées (données d'entraînement positives), rejetées (données négatives) et corrigées (corrections exploitables). Ventilé par maladie et par culture." />
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">Cas validés disponibles pour améliorer l’IA</p>
      </div>

      {loading || !data ? (
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              value={data.validated_count}
              label="Validées"
              colorClass="bg-emerald-500"
              iconBgClass="bg-emerald-500/10"
              icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
            />
            <StatCard
              value={data.rejected_count}
              label="Rejetées"
              colorClass="bg-[#e04f5f]"
              iconBgClass="bg-[#e04f5f]/10"
              icon={<XCircle className="h-6 w-6 text-[#e04f5f]" />}
            />
            <StatCard
              value={data.corrected_count}
              label="Corrigées"
              colorClass="bg-[#c9a84c]"
              iconBgClass="bg-[#c9a84c]/10"
              icon={<PenLine className="h-6 w-6 text-[#c9a84c]" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DiseaseList diseases={data.by_disease} />

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-gray-700/50 dark:bg-gray-800">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">Par culture</h3>
              <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">Analyses validées vs rejetées par culture</p>
              {cropRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">Données insuffisantes</p>
              ) : (
                <Chart options={cropChartOptions} series={cropSeries} type="bar" height={350} />
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
