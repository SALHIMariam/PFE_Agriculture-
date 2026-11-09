import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ComponentCard from "../../../../components/common/ComponentCard";
import { CalibrationStats } from "../services/expertIntelligenceService";
import { useTheme } from "../../../../context/ThemeContext";
import { sharedTooltip, chartBaseTheme } from "../chartTheme";

type Props = { data: CalibrationStats | null; loading: boolean };

const BUCKET_MIDPOINTS: Record<string, number> = {
  "0-50": 25,
  "50-60": 55,
  "60-70": 65,
  "70-80": 75,
  "80-90": 85,
  "90-100": 95,
};

export default function CalibrationChart({ data, loading }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { foreColor, labelColor, gridColor } = chartBaseTheme(isDark);

  const buckets = data?.buckets ?? [];

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", toolbar: { show: false }, background: "transparent", foreColor },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#c9a84c", "#40916c"],
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: buckets.map((b) => `${b.range}%`),
      labels: { style: { colors: labelColor, fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: labelColor, fontSize: "11px" }, formatter: (val: number) => `${Math.round(val)}%` } },
    legend: { position: "top", labels: { colors: labelColor }, markers: { size: 6 } },
    grid: { borderColor: gridColor, strokeDashArray: 4 },
    tooltip: sharedTooltip(isDark, { y: { formatter: (val: number) => `${val.toFixed(1)}%` } }),
  };

  const series = [
    { name: "Confiance IA (milieu de tranche)", data: buckets.map((b) => BUCKET_MIDPOINTS[b.range] ?? 0) },
    { name: "Accord expert réel", data: buckets.map((b) => b.agreement_pct) },
  ];

  return (
    <ComponentCard
      title="Calibration de la confiance de l’IA"
      desc="Confiance annoncée par l'IA vs accord expert réel"
      collapsibleInfo="Compare la confiance déclarée par l'IA (par tranche : 0-50%, 50-60%, ... 90-100%) avec son taux de validation réel par l'expert dans chaque tranche. Si la barre verte dépasse la dorée : l'IA est sous-confiante. Si elle est en dessous : l'IA est sur-confiante. L'écart de calibration résume ce décalage en un seul chiffre."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading || !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : buckets.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Données insuffisantes</p>
      ) : (
        <div className="space-y-2">
          <Chart options={options} series={series} type="bar" height={240} />
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            {data.calibration_gap !== null
              ? `Écart de calibration : ${data.calibration_gap}%`
              : data.note ?? "Données insuffisantes pour calculer la calibration"}
          </p>
        </div>
      )}
    </ComponentCard>
  );
}
