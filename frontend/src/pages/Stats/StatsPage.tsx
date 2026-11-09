import styles from '../farmer/FarmerDashboard.module.css';
import FarmPerformanceCard from './FarmPerformanceCard';
import RegionalMap from './RegionalMap';
import DiseaseChart from './DiseaseChart';
import AnalysisPerDay from './AnalysisPerDay';
import CropDiversityCard from './CropDiversityCard';
import RiskEvolutionChart from './RiskEvolutionChart';
import { useStatsData } from './useStatsData';

export default function StatsPage() {
  const {
    overview,
    loadingOverview,
    regionalMap,
    loadingMap,
    diseaseDistribution,
    loadingDiseases,
    analysesPerDay,
    loadingPerDay,
    fetchPerDay,
    cropDiversity,
    loadingCrops,
    riskEvolution,
    loadingRisk,
  } = useStatsData();

  return (
    <div className={styles.page}>
      <div className={styles['section-eye']}>Tableau de bord</div>
      <h1 className={styles['section-title']}>
        Vos <em>statistiques</em>
      </h1>

      {!loadingOverview && overview && <FarmPerformanceCard overview={overview} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, marginTop: 32 }}>
        <RegionalMap data={regionalMap} loading={loadingMap} />
        <DiseaseChart data={diseaseDistribution} loading={loadingDiseases} />
        <AnalysisPerDay data={analysesPerDay} loading={loadingPerDay} onMonthChange={fetchPerDay} />
        <CropDiversityCard data={cropDiversity} loading={loadingCrops} />
        <RiskEvolutionChart data={riskEvolution} loading={loadingRisk} />
      </div>
    </div>
  );
}
