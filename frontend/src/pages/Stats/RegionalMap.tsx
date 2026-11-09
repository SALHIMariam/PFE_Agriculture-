import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { RegionalMapResponse } from '../../services/statsService';
import styles from '../farmer/FarmerDashboard.module.css';

function riskColor(pct: number): string {
  if (pct <= 30) return '#10b981';
  if (pct <= 60) return '#f59e0b';
  return '#ef4444';
}

/** Couleur par rang relatif (0 = risque le plus élevé → rouge foncé, dernier → vert). */
function rankColor(index: number, total: number): string {
  const t = total > 1 ? index / (total - 1) : 0;
  const hue = 0 + t * 150; // 0 = rouge, 150 = vert
  return `hsl(${hue.toFixed(0)}, 72%, 45%)`;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const CRITICAL_THRESHOLD = 70;

export default function RegionalMap({ data, loading }: { data: RegionalMapResponse | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className={styles.statCard}>
        <div className={styles.statCardTitle}>🗺️ Carte des maladies par région</div>
        <div className={styles.skeletonBlock} style={{ height: 500 }} />
      </div>
    );
  }

  const sorted = [...data.regions].sort((a, b) => b.risk_percentage - a.risk_percentage);
  const withAnalyses = sorted.filter((r) => r.total_analyses > 0);
  const top3 = withAnalyses.slice(0, 3);

  const chartHeight = Math.max(500, sorted.length * 34);

  const yLabels = sorted.map((r) => {
    const disease = r.top_disease ? r.top_disease.replace(/_/g, ' ') : 'Aucune maladie';
    return `${r.governorate}\n${disease}`;
  });

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      height: chartHeight,
      width: '100%',
      fontFamily: 'Lato, sans-serif',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, distributed: true, barHeight: '70%', dataLabels: { position: 'top' } },
    },
    colors: sorted.map((_, i) => rankColor(i, sorted.length)),
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val}%`,
      offsetX: 18,
      style: { fontSize: '12px', fontWeight: 800, colors: ['#0e1f10'] },
    },
    legend: { show: false },
    xaxis: {
      categories: yLabels,
      max: 100,
      labels: { formatter: (v: string) => `${v}%` },
    },
    yaxis: {
      labels: { style: { fontSize: '12px', fontFamily: 'Lato, sans-serif', fontWeight: 600 } },
    },
    grid: { xaxis: { lines: { show: true } } },
    annotations: {
      xaxis: [
        {
          x: CRITICAL_THRESHOLD,
          borderColor: '#dc2626',
          strokeDashArray: 6,
          label: {
            text: 'Seuil critique',
            orientation: 'horizontal',
            position: 'top',
            style: { color: '#fff', background: '#dc2626', fontSize: '10px', fontWeight: 700 },
          },
        },
      ],
    },
    tooltip: {
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const r = sorted[dataPointIndex];
        const disease = r.top_disease ? r.top_disease.replace(/_/g, ' ') : 'aucune';
        return `<div style="padding:8px 12px;font-family:Lato,sans-serif;font-size:12px;line-height:1.6;">
          <strong>${r.governorate}</strong> — ${r.risk_percentage}% de risque<br/>
          📊 ${r.total_analyses} analyses — 🦠 ${disease}
        </div>`;
      },
    },
  };

  const series = [{ name: 'Risque', data: sorted.map((r) => r.risk_percentage) }];

  return (
    <div className={styles.statCard}>
      <div className={styles.statCardTitle}>🗺️ Carte des maladies par région</div>

      <div style={{ width: '100%' }}>
        <Chart options={options} series={series} type="bar" height={chartHeight} width="100%" />
      </div>

      {top3.length > 0 && (
        <div className={styles.podiumRow}>
          {top3.map((r, i) => (
            <div key={r.governorate} className={styles.podiumCard}>
              <div className={styles.podiumMedal}>{MEDALS[i]}</div>
              <div className={styles.podiumRegion}>{r.governorate}</div>
              <div className={styles.podiumRisk} style={{ color: riskColor(r.risk_percentage) }}>
                {r.risk_percentage}%
              </div>
              <div className={styles.podiumDisease}>
                {r.top_crop ? `${r.top_crop} — ` : ''}
                {r.top_disease ? r.top_disease.replace(/_/g, ' ') : 'Aucune maladie'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.riskLegend}>
        <div className={styles.riskLegendItem}>🟢 Faible risque (0-30%)</div>
        <div className={styles.riskLegendItem}>🟠 Risque modéré (31-60%)</div>
        <div className={styles.riskLegendItem}>🔴 Risque élevé (61-100%)</div>
      </div>
    </div>
  );
}
