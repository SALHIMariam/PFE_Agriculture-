import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ComponentCard from "../../../../components/common/ComponentCard";
import { ResponseTimeStats, ResponseTimeTimelinePoint } from "../services/expertAnalyticsService";
import KpiTile, { formatMinutes } from "./KpiTile";
import { useTheme } from "../../../../context/ThemeContext";
import { sharedTooltip, sharedCrosshairs, chartBaseTheme } from "../chartTheme";

type Props = { data: ResponseTimeStats | null; loading: boolean };

function aggregateByWeek(points: ResponseTimeTimelinePoint[]): { x: number; y: number }[] {
  const weeks = new Map<string, number[]>();
  points.forEach(({ date, avg_minutes }) => {
    // avg_minutes can arrive as a numeric string (e.g. Postgres AVG() aggregates
    // are serialized as JSON strings by some drivers) — coerce it so the sum
    // below does numeric addition instead of string concatenation (-> NaN).
    const value = Number(avg_minutes);
    if (!Number.isFinite(value)) return;
    const d = new Date(date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(value);
  });
  return Array.from(weeks.entries())
    .map(([date, values]) => ({
      x: new Date(date).getTime(),
      y: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    }))
    .sort((a, b) => a.x - b.x);
}

export default function ResponseTimeCard({ data, loading }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { foreColor, gridColor } = chartBaseTheme(isDark);

  const timeline = data?.timeline ?? [];
  const aggregated =
    timeline.length > 100
      ? aggregateByWeek(timeline)
      : timeline.map((t) => ({ x: new Date(t.date).getTime(), y: Math.round(Number(t.avg_minutes)) })).filter((p) => Number.isFinite(p.y));

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", toolbar: { show: false }, zoom: { enabled: false }, background: "transparent", foreColor },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#40916c"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2.5 },
    markers: { size: 0, hover: { size: 6 } },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] },
    },
    grid: { borderColor: gridColor, strokeDashArray: 4, xaxis: { lines: { show: false } } },
    xaxis: {
      type: "datetime",
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        datetimeFormatter: { year: "yyyy", month: "MMM yy", day: "dd MMM" },
        rotateAlways: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: Math.min(8, aggregated.length),
      crosshairs: sharedCrosshairs(isDark),
    },
    yaxis: {
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        formatter: (val: number) => (val >= 1440 ? `${(val / 1440).toFixed(0)}j` : val >= 60 ? `${(val / 60).toFixed(0)}h` : `${Math.round(val)}min`),
      },
    },
    tooltip: sharedTooltip(isDark, {
      x: { format: "dd MMM yyyy" },
      y: { formatter: (val: number) => (val >= 60 ? `${(val / 60).toFixed(1)} h` : `${Math.round(val)} min`) },
    }),
  };

  return (
    <ComponentCard
      title="Temps de réponse moyen"
      desc="Délai entre soumission et réponse experte"
      tooltip="Délai moyen entre la soumission d'une analyse et la réponse de l'expert. Inclut la moyenne, la médiane, le minimum et le maximum. La courbe montre l'évolution mensuelle."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading || !data ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiTile label="Moyen" value={formatMinutes(data.avg_minutes)} hint={data.variation_pct !== null ? `${data.variation_pct > 0 ? "+" : ""}${data.variation_pct}% vs période précédente` : undefined} />
            <KpiTile label="Médian" value={formatMinutes(data.median_minutes)} />
            <KpiTile label="Min" value={formatMinutes(data.min_minutes)} />
            <KpiTile label="Max" value={formatMinutes(data.max_minutes)} />
          </div>
          {aggregated.length > 0 ? (
            <Chart options={options} series={[{ name: "Temps de réponse", data: aggregated }]} type="area" height={220} />
          ) : (
            <p className="py-4 text-center text-sm text-gray-400">Données insuffisantes</p>
          )}
        </div>
      )}
    </ComponentCard>
  );
}
