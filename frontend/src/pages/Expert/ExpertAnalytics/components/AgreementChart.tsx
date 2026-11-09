import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ComponentCard from "../../../../components/common/ComponentCard";
import { AgreementStats, AgreementTimelinePoint } from "../services/expertAnalyticsService";
import { useTheme } from "../../../../context/ThemeContext";
import { sharedTooltip, sharedCrosshairs, chartBaseTheme } from "../chartTheme";

type Props = { data: AgreementStats | null; loading: boolean };

function aggregateByWeek(points: AgreementTimelinePoint[]) {
  const weeks = new Map<string, { validated: number; rejected: number }>();
  points.forEach(({ date, validated, rejected }) => {
    const d = new Date(date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    const entry = weeks.get(key) ?? { validated: 0, rejected: 0 };
    entry.validated += validated;
    entry.rejected += rejected;
    weeks.set(key, entry);
  });
  return Array.from(weeks.entries())
    .map(([date, v]) => ({ x: new Date(date).getTime(), validated: v.validated, rejected: v.rejected }))
    .sort((a, b) => a.x - b.x);
}

export default function AgreementChart({ data, loading }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { foreColor, gridColor } = chartBaseTheme(isDark);

  const timeline = data?.timeline ?? [];
  const aggregated = timeline.length > 100 ? aggregateByWeek(timeline) : timeline.map((t) => ({ x: new Date(t.date).getTime(), validated: t.validated, rejected: t.rejected }));

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", toolbar: { show: false }, zoom: { enabled: false }, background: "transparent", foreColor },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#40916c", "#e04f5f"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2.5 },
    markers: { size: 0, hover: { size: 6 } },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] },
    },
    xaxis: {
      type: "datetime",
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        datetimeFormatter: { year: "yyyy", month: "MMM yy", day: "dd MMM" },
        rotateAlways: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: Math.min(10, aggregated.length),
      crosshairs: sharedCrosshairs(isDark),
    },
    yaxis: {
      labels: { style: { colors: "#9ca3af", fontSize: "11px" }, formatter: (val: number) => Math.round(val).toString() },
    },
    legend: { position: "top", horizontalAlign: "right", labels: { colors: "#6b7280" }, markers: { size: 6 } },
    tooltip: sharedTooltip(isDark, { x: { format: "dd MMM yyyy" }, y: { formatter: (v) => `${v} cas` } }),
    grid: { borderColor: gridColor, strokeDashArray: 4, xaxis: { lines: { show: false } } },
  };

  const series = [
    { name: "Validées", data: aggregated.map((t) => ({ x: t.x, y: t.validated })) },
    { name: "Rejetées", data: aggregated.map((t) => ({ x: t.x, y: t.rejected })) },
  ];

  return (
    <ComponentCard
      title="Évolution de l'accord"
      desc="Graphique montrant l'évolution du nombre d'analyses validées vs rejetées au fil du temps. Permet de visualiser les tendances de performance de l'IA sur plusieurs mois."
      className="shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : timeline.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Données insuffisantes</p>
      ) : (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Chart options={options} series={series} type="area" height={280} />
        </div>
      )}
    </ComponentCard>
  );
}
