import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import {
  getRegionDiseases,
  getRiskEvolution,
  type DiseaseEntry,
  type RiskEvolutionResponse,
} from '../../services/riskService';
import { useAuth } from '../../context/AuthContext';
import styles from '../farmer/FarmerDashboard.module.css';
import { formatDiseaseLabel } from '../../data/diseaseLabels';

function diseaseOptionLabel(d: DiseaseEntry): string {
  return `${formatDiseaseLabel(d.disease)} (${d.cases_30d} cas)`;
}

export default function RiskEvolutionChart({
  data: initialData,
  loading: initialLoading,
}: {
  data: RiskEvolutionResponse | null;
  loading: boolean;
}) {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin') ?? false;

  // Farmer-only: list of diseases seen in their governorate + the selected one.
  const [diseases, setDiseases] = useState<DiseaseEntry[] | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [evolution, setEvolution] = useState<RiskEvolutionResponse | null>(null);
  const [evoLoading, setEvoLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    getRegionDiseases()
      .then((res) => {
        if (cancelled) return;
        if (res.available && res.diseases.length > 0) {
          setDiseases(res.diseases);
          setSelected(res.diseases[0].disease);
        } else {
          setDiseases([]);
        }
      })
      .catch(() => {
        if (!cancelled) setDiseases([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin || !selected) return;
    let cancelled = false;
    setEvoLoading(true);
    getRiskEvolution({ disease: selected })
      .then((res) => {
        if (!cancelled) setEvolution(res);
      })
      .catch(() => {
        if (!cancelled) setEvolution({ available: false });
      })
      .finally(() => {
        if (!cancelled) setEvoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, selected]);

  const data = isAdmin ? initialData : evolution;
  const loading = isAdmin ? initialLoading : diseases === null || evoLoading;
  const emptyRegion = !isAdmin && diseases !== null && diseases.length === 0;

  const diseaseFilter =
    !isAdmin && diseases && diseases.length > 0 ? (
      <select
        className={styles.riskDiseaseSelect}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={evoLoading}
        aria-label="Filtrer par maladie"
      >
        {diseases.map((d) => (
          <option key={d.disease} value={d.disease}>
            {diseaseOptionLabel(d)}
          </option>
        ))}
      </select>
    ) : null;

  const header = (
    <div className={styles.statCardTitleRow}>
      <div className={styles.statCardTitle}>
        📈 Évolution du risque de maladie
        {data && data.available && data.scope === 'single' && (
          <span style={{ fontWeight: 500, fontSize: 13, color: '#6b8c6c', marginLeft: 8 }}>
            {isAdmin
              ? `${formatDiseaseLabel(data.disease)} (${data.governorate})`
              : data.governorate}
          </span>
        )}
      </div>
      {diseaseFilter}
    </div>
  );

  if (emptyRegion) {
    return (
      <div className={styles.statCard}>
        {header}
        <div style={{ textAlign: 'center', color: '#6b8c6c', padding: '30px 10px', fontSize: 13 }}>
          Pas encore assez de données pour prévoir un risque.
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className={styles.statCard}>
        {header}
        <div className={styles.skeletonBlock} style={{ height: 260 }} />
      </div>
    );
  }

  if (!data.available) {
    return (
      <div className={styles.statCard}>
        {header}
        <div style={{ textAlign: 'center', color: '#6b8c6c', padding: '30px 10px', fontSize: 13 }}>
          Pas encore assez de données pour prévoir un risque.
        </div>
      </div>
    );
  }

  const days = data.days ?? [data.day0, data.day7];
  const currentRisk = data.day0.risk_score;
  const predictedRisk = data.day7.risk_score;

  // Score null = pas de prévision (maladie non couverte par le modèle, ou
  // service de risque / météo indisponible) — ne jamais l'afficher comme 0 %.
  if (currentRisk === null || currentRisk === undefined) {
    return (
      <div className={styles.statCard}>
        {header}
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '30px 10px' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>📊</div>
          <div style={{ fontWeight: 700, color: '#0e1f10', marginBottom: 4 }}>Prévision indisponible</div>
          <div style={{ fontSize: 13 }}>
            {data.unsupported
              ? "Le modèle de risque ne couvre pas encore cette maladie. Sélectionnez une autre maladie dans la liste."
              : 'Le service de prévision est momentanément indisponible. Réessayez dans quelques minutes.'}
          </div>
        </div>
      </div>
    );
  }

  const delta = data.trend ?? (predictedRisk ?? currentRisk) - currentRisk;

  const options: ApexOptions = {
    chart: { type: 'bar', height: 280, fontFamily: 'Lato, sans-serif', toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 5, borderRadiusApplication: 'end' } },
    colors: ['#40916c'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: days.map((d) => (d.offset === 0 ? "Aujourd'hui" : `J+${d.offset}`)),
      labels: { style: { fontSize: '11px' } },
    },
    yaxis: { max: 100, labels: { formatter: (v: number) => `${v}%` } },
    grid: { yaxis: { lines: { show: true } } },
    tooltip: { y: { formatter: (val: number) => `${val}% de risque` } },
  };

  const series = [{ name: 'Risque', data: days.map((d) => d.risk_score ?? 0) }];

  return (
    <div className={styles.statCard}>
      {header}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, color: '#6b8c6c', fontWeight: 700, textTransform: 'uppercase' }}>Risque actuel</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: '#0e1f10' }}>{currentRisk}%</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#6b8c6c', fontWeight: 700, textTransform: 'uppercase' }}>Risque prévu (J+7)</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: '#0e1f10' }}>{predictedRisk ?? '—'}{predictedRisk !== null && predictedRisk !== undefined ? '%' : ''}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#6b8c6c', fontWeight: 700, textTransform: 'uppercase' }}>Tendance</div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              fontWeight: 800,
              color: delta > 0 ? '#ef4444' : delta < 0 ? '#10b981' : '#6b8c6c',
            }}
          >
            {delta > 0 ? '↗ +' : delta < 0 ? '↘ ' : '→ '}
            {delta}%
          </div>
        </div>
      </div>

      <Chart options={options} series={series} type="bar" height={280} />
    </div>
  );
}
