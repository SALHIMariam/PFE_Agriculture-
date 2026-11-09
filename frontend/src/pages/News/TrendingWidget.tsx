import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { Trending } from "../../services/newsService";

const CROP_LABELS: Record<string, string> = {
  Apple: "Pomme",
  Bean: "Haricot",
  Corn: "Maïs",
  Cucumber: "Concombre",
  Grape: "Raisin",
  Groundnut: "Arachide",
  Potato: "Pomme de terre",
  Tomato: "Tomate",
  Wheat: "Blé",
};

export default function TrendingWidget({ trending }: { trending: Trending }) {
  const categories = trending.crops.map((c) => CROP_LABELS[c.crop] ?? c.crop);
  const counts = trending.crops.map((c) => c.count);

  const options: ApexOptions = {
    colors: ["#12b76a"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 220,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 5, barHeight: "55%" },
    },
    dataLabels: { enabled: false },
    xaxis: { categories },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: { y: { formatter: (val: number) => `${val} article${val > 1 ? "s" : ""}` } },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
      <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
        Cultures les plus évoquées (30 derniers jours)
      </h3>
      {trending.crops.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">Pas encore assez de données.</div>
      ) : (
        <Chart options={options} series={[{ name: "Articles", data: counts }]} type="bar" height={220} />
      )}
    </div>
  );
}
