import type { OverviewResponse } from '../../services/statsService';
import styles from '../farmer/FarmerDashboard.module.css';

function Stars({ n }: { n: number }) {
  return <div style={{ color: '#d4a843' }}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</div>;
}

export default function FarmPerformanceCard({ overview }: { overview: OverviewResponse }) {
  return (
    <div className={styles['chart-card']} style={{ borderRadius: 16 }}>
      <div className={styles['card-title']}>Indice de performance de la ferme</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '18px 0' }}>
        <div style={{ fontSize: '3rem', fontWeight: 800 }}>{overview.farm_performance_index}/100</div>
        <div>
          <div style={{ marginBottom: 8 }}><strong>{overview.performance_label}</strong></div>
          <Stars n={overview.performance_stars} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div className={styles['stat-lbl']}>Santé des cultures</div>
          <div className={styles['stat-val']}>{overview.crop_health_score}%</div>
        </div>
        <div>
          <div className={styles['stat-lbl']}>Traitements</div>
          <div className={styles['stat-val']}>{overview.treatment_score}%</div>
        </div>
        <div>
          <div className={styles['stat-lbl']}>Précision IA</div>
          <div className={styles['stat-val']}>{overview.ai_accuracy_score}%</div>
        </div>
        <div>
          <div className={styles['stat-lbl']}>Accord expert</div>
          <div className={styles['stat-val']}>{overview.expert_agreement_score}%</div>
        </div>
      </div>

      <div style={{ marginTop: 12, fontStyle: 'italic' }}>{overview.ai_conclusion}</div>
    </div>
  );
}
