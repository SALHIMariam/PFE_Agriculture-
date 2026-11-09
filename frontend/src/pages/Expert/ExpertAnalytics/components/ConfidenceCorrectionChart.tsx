import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ComponentCard from "../../../../components/common/ComponentCard";
import { ConfidenceCorrectionStats } from "../services/expertAnalyticsService";
import { useTheme } from "../../../../context/ThemeContext";
import { sharedTooltip, chartBaseTheme } from "../chartTheme";

type Props = { data: ConfidenceCorrectionStats | null; loading: boolean };

const BUCKETS = [
  { label: "50-60%", min: 50, max: 60 },
  { label: "60-70%", min: 60, max: 70 },
  { label: "70-80%", min: 70, max: 80 },
  { label: "80-90%", min: 80, max: 90 },
  { label: "90-100%", min: 90, max: 101 },
];

export default function ConfidenceCorrectionChart({ data, loading }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { foreColor, gridColor } = chartBaseTheme(isDark);

  const points = data?.points ?? [];

  const validatedCounts = BUCKETS.map(
    (b) => points.filter((p) => p.confidence >= b.min && p.confidence < b.max && p.validation_status === "validated").length
  );
  const rejectedCounts = BUCKETS.map(
    (b) => points.filter((p) => p.confidence >= b.min && p.confidence < b.max && p.validation_status === "rejected").length
  );

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", toolbar: { show: false }, type: "bar", stacked: true, stackType: "normal", background: "transparent", foreColor },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#40916c", "#e04f5f"],
    plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 4, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: BUCKETS.map((b) => b.label),
      title: { text: "Confiance IA", style: { color: "#9ca3af", fontSize: "12px" } },
      labels: { style: { colors: "#9ca3af", fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Nombre de cas", style: { color: "#9ca3af", fontSize: "12px", fontWeight: 500 } },
      labels: { style: { colors: "#9ca3af", fontSize: "11px" } },
    },
    legend: { position: "top", horizontalAlign: "right", labels: { colors: "#6b7280" }, markers: { size: 6 } },
    grid: { borderColor: gridColor, strokeDashArray: 4, xaxis: { lines: { show: false } } },
    tooltip: sharedTooltip(isDark, { y: { formatter: (val: number) => `${val.toLocaleString()} cas` } }),
  };

  const series = [
    { name: "Validées", data: validatedCounts },
    { name: "Rejetées", data: rejectedCounts },
  ];

  return (
    <ComponentCard
      title="Confiance de l’IA et corrections des experts"
      desc="Distribution des analyses par plage de confiance IA (50-60%, 60-70%, ... 90-100%), comparant les cas validés (vert) et rejetés (rouge). Montre si l'IA est plus souvent corrigée à basse ou haute confiance."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : points.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Données insuffisantes</p>
      ) : (
        <Chart options={options} series={series} type="bar" height={280} />
      )}
    </ComponentCard>
  );
}
