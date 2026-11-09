import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { FarmerDashboardResponse } from "../../../../services/statsService";
import styles from "../../FarmerDashboard.module.css";

type Props = {
  monthly: FarmerDashboardResponse["monthly"] | null;
};

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

export default function MonthlyAnalysesChart({ monthly }: Props) {
  const empty = monthly !== null && monthly.every((m) => m.validated + m.pending + m.rejected === 0);

  const options: ApexOptions = {
    chart: { type: "bar", stacked: true, toolbar: { show: false }, fontFamily: "Lato, sans-serif" },
    colors: ["#40916c", "#f59e0b", "#ef4444"],
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 6, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left", fontSize: "13px", markers: { size: 6 } },
    xaxis: {
      categories: (monthly ?? []).map((m) => monthLabel(m.month)),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => String(Math.round(v)) } },
    grid: { borderColor: "rgba(27,67,50,0.08)", strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `${v} analyse${v > 1 ? "s" : ""}` } },
  };

  const series = [
    { name: "Validées", data: (monthly ?? []).map((m) => m.validated) },
    { name: "En attente", data: (monthly ?? []).map((m) => m.pending) },
    { name: "Rejetées", data: (monthly ?? []).map((m) => m.rejected) },
  ];

  return (
    <div className={styles["fd-card"]}>
      <div className={styles["card-eye"]}>Suivi mensuel</div>
      <div className={styles["fd-card-title"]}>Mes analyses par mois</div>
      {monthly === null ? (
        <div className={`${styles["fd-chart-box"]} ${styles["fd-skeleton"]}`} />
      ) : empty ? (
        <div className={styles["fd-empty"]}>Aucune analyse sur les 6 derniers mois.</div>
      ) : (
        <Chart options={options} series={series} type="bar" height={280} />
      )}
    </div>
  );
}
