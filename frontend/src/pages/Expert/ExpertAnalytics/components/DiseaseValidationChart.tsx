import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ComponentCard from "../../../../components/common/ComponentCard";
import { DiseaseValidationStats } from "../services/expertAnalyticsService";
import { formatDisease } from "./KpiTile";
import { useTheme } from "../../../../context/ThemeContext";
import { sharedTooltip, chartBaseTheme } from "../chartTheme";

type Props = { data: DiseaseValidationStats | null; loading: boolean };

export default function DiseaseValidationChart({ data, loading }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { foreColor, gridColor } = chartBaseTheme(isDark);

  const rows = [...(data?.diseases ?? [])].sort((a, b) => (b.agreement_pct ?? 0) - (a.agreement_pct ?? 0)).slice(0, 15);

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", toolbar: { show: false }, background: "transparent", foreColor },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#40916c"],
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "60%" } },
    dataLabels: {
      enabled: true,
      style: { fontSize: "11px", fontWeight: 600, colors: [isDark ? "#f3f4f6" : "#374151"] },
      formatter: (v: number) => (v > 0 ? `${v}%` : ""),
    },
    xaxis: { categories: rows.map((r) => formatDisease(r.disease)), max: 100, labels: { style: { colors: "#9ca3af", fontSize: "11px" } } },
    yaxis: { labels: { style: { colors: "#9ca3af", fontSize: "11px" } } },
    grid: { borderColor: gridColor, strokeDashArray: 4 },
    tooltip: sharedTooltip(isDark, { y: { formatter: (val: number) => `${val.toFixed(1)}% d'accord` } }),
  };

  return (
    <ComponentCard
      title="Taux de validation par maladie"
      desc="Taux de validation par maladie/culture. Affiche le taux d'accord pour chaque combinaison culture · maladie. Permet d'identifier les maladies où l'IA est la plus/moins précise."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Données insuffisantes</p>
      ) : (
        <Chart
          options={options}
          series={[{ name: "Accord", data: rows.map((r) => r.agreement_pct ?? 0) }]}
          type="bar"
          height={Math.max(240, rows.length * 32)}
        />
      )}
    </ComponentCard>
  );
}
