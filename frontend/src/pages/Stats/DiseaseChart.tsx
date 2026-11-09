import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { DiseaseDistributionResponse } from '../../services/statsService';
import styles from '../farmer/FarmerDashboard.module.css';
import { formatDiseaseLabel } from '../../data/diseaseLabels';

const CROP_EMOJIS: Record<string, string> = {
  apple: '🍎', bean: '🫘', corn: '🌽', cucumber: '🥒', grape: '🍇',
  groundnut: '🥜', potato: '🥔', tomato: '🍅', wheat: '🌾',
};

function cropEmoji(crop: string): string {
  return CROP_EMOJIS[crop.toLowerCase()] ?? '🌿';
}

function healthColor(pct: number): string {
  if (pct > 60) return '#10b981';
  if (pct >= 30) return '#f59e0b';
  return '#ef4444';
}

export default function DiseaseChart({ data, loading }: { data: DiseaseDistributionResponse | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className={styles.statCard}>
        <div className={styles.statCardTitle}>🦠 Répartition des maladies détectées</div>
        <div className={styles.skeletonBlock} style={{ height: 300 }} />
      </div>
    );
  }

  const { diseases, total, healthy_percentage } = data;

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Lato, sans-serif' },
    labels: diseases.map((d) => formatDiseaseLabel(`${d.crop}__${d.disease}`)),
    colors: diseases.map((d) => d.color),
    legend: { position: 'right', fontSize: '12px' },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Analyses',
              formatter: () => String(total),
              fontSize: '13px',
              color: '#6b8c6c',
            },
            value: { fontSize: '26px', fontWeight: 800, color: '#0e1f10' },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number, opts) => {
          const d = diseases[opts.seriesIndex];
          return `${val} cas — ${d.percentage}%`;
        },
      },
    },
  };

  const radialOptions: ApexOptions = {
    chart: { type: 'radialBar', fontFamily: 'Lato, sans-serif' },
    colors: [healthColor(healthy_percentage)],
    plotOptions: {
      radialBar: {
        hollow: { size: '65%' },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: '28px',
            fontWeight: 800,
            color: '#0e1f10',
            formatter: (v: number) => `${v}%`,
          },
        },
      },
    },
    labels: ['Santé'],
  };

  return (
    <div className={styles.statCard}>
      <div className={styles.statCardTitle}>🦠 Répartition des maladies détectées</div>

      {diseases.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#6b8c6c', padding: '30px 10px', fontSize: 13 }}>
          Aucune maladie détectée pour le moment.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Chart options={donutOptions} series={diseases.map((d) => d.count)} type="donut" width={520} height={300} />
          </div>

          <div style={{ marginTop: 20 }}>
            {diseases.map((d) => (
              <div key={`${d.crop}-${d.disease}`} className={styles.diseaseListRow}>
                <span className={styles.diseaseDot} style={{ background: d.color }} />
                <span className={styles.diseaseListName}>
                  {cropEmoji(d.crop)} {formatDiseaseLabel(`${d.crop}__${d.disease}`)}
                </span>
                <span className={styles.diseaseListTrack}>
                  <span className={styles.diseaseListFill} style={{ width: `${d.percentage}%`, background: d.color }} />
                </span>
                <span className={styles.diseaseListCount}>
                  {d.count} cas — {d.percentage}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.statCard} style={{ marginTop: 24, boxShadow: 'none' }}>
        <div className={styles.statCardTitle} style={{ marginBottom: 4, fontSize: 15, textAlign: 'center' }}>
          Score de santé global
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Chart options={radialOptions} series={[healthy_percentage]} type="radialBar" width={220} height={220} />
        </div>
      </div>
    </div>
  );
}
