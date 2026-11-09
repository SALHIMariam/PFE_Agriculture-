import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { CropDiversityResponse } from '../../services/statsService';
import styles from '../farmer/FarmerDashboard.module.css';

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Bon';
  if (score >= 40) return 'Moyen';
  return 'Faible';
}

function diversityMessage(score: number): string {
  if (score >= 80) return '🌟 Excellente diversité agricole !';
  if (score >= 40) return '👍 Bonne diversité, continuez ainsi';
  return '⚠️ Diversifiez vos cultures pour réduire les risques';
}

export default function CropDiversityCard({ data, loading }: { data: CropDiversityResponse | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className={styles.statCard}>
        <div className={styles.statCardTitle}>🌾 Diversité des cultures</div>
        <div className={styles.skeletonBlock} style={{ height: 260 }} />
      </div>
    );
  }

  const { diversity_score, crops } = data;

  const radialOptions: ApexOptions = {
    chart: { type: 'radialBar', fontFamily: 'Lato, sans-serif' },
    colors: [scoreColor(diversity_score)],
    plotOptions: {
      radialBar: {
        hollow: { size: '68%' },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: '32px',
            fontWeight: 800,
            color: '#0e1f10',
            formatter: (v: number) => `${v}/100`,
          },
        },
      },
    },
    labels: ['Diversité'],
  };

  return (
    <div className={styles.statCard}>
      <div className={styles.statCardTitle}>🌾 Diversité des cultures</div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Chart options={radialOptions} series={[diversity_score]} type="radialBar" width={240} height={240} />
      </div>
      <div className={styles.diversityLabel}>{scoreLabel(diversity_score)}</div>

      {crops.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#6b8c6c', padding: '20px 10px', fontSize: 13 }}>
          Aucune culture analysée pour le moment.
        </div>
      ) : (
        <div className={styles.cropGrid}>
          {crops.map((crop) => (
            <div key={crop.name} className={styles.cropTile}>
              <div className={styles.cropTileEmoji}>{crop.emoji}</div>
              <div className={styles.cropTileName}>{crop.name_fr}</div>
              <div className={styles.cropTileCount}>{crop.analyses_count} analyses</div>
              <div className={styles.cropTileHealthBar}>
                <div className={styles.cropTileHealthFill} style={{ width: `${crop.health_percentage}%` }} />
              </div>
              <span
                className={styles.cropTileBadge}
                style={
                  crop.health_percentage >= 60
                    ? { background: 'rgba(16,185,129,0.15)', color: '#0e7d5f' }
                    : { background: 'rgba(239,68,68,0.14)', color: '#b91c1c' }
                }
              >
                {crop.health_percentage >= 60 ? '✅ Sain' : '⚠️ Malade'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.diversityMessage}>{diversityMessage(diversity_score)}</div>
    </div>
  );
}
