import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ComponentCard from "../../../../components/common/ComponentCard";
import { WorkloadStats } from "../services/expertAnalyticsService";
import { useTheme } from "../../../../context/ThemeContext";
import { sharedTooltip, chartBaseTheme } from "../chartTheme";
import { PRIORITY_LABELS, labelOf } from "../../../../utils/labels";

type Props = { data: WorkloadStats | null; loading: boolean };

const PRIORITY_ORDER = ["urgent", "important", "normal"];

export default function CriticalCasesCard({ data, loading }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { foreColor, gridColor } = chartBaseTheme(isDark);

  const rows = [...(data?.by_priority ?? [])].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority_level) - PRIORITY_ORDER.indexOf(b.priority_level)
  );

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", toolbar: { show: false }, stacked: true, stackType: "normal", background: "transparent", foreColor },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#40916c", "#e04f5f"],
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "50%" } },
    dataLabels: { enabled: false },
    xaxis: { categories: rows.map((r) => labelOf(PRIORITY_LABELS, r.priority_level)), labels: { style: { colors: "#9ca3af", fontSize: "11px" } } },
    yaxis: { labels: { style: { colors: "#9ca3af", fontSize: "11px" } } },
    legend: { position: "top", horizontalAlign: "right", labels: { colors: "#6b7280" }, markers: { size: 6 } },
    grid: { borderColor: gridColor, strokeDashArray: 4 },
    tooltip: sharedTooltip(isDark, { y: { formatter: (val: number) => `${val.toLocaleString()} cas` } }),
  };

  const series = [
    { name: "Traités", data: rows.map((r) => r.treated) },
    { name: "Restants", data: rows.map((r) => r.total - r.treated) },
  ];

  return (
    <ComponentCard
      title="Cas critiques traités"
      desc="Cas traités par niveau de priorité"
      tooltip="Nombre d'analyses marquées comme urgentes ou importantes qui ont été traitées par les experts. Affiche le taux de traitement des cas prioritaires pour évaluer la réactivité."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Données insuffisantes</p>
      ) : (
        <Chart options={options} series={series} type="bar" height={220} />
      )}
    </ComponentCard>
  );
}
