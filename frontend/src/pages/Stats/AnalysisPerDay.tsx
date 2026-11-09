import { useState } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { AnalysesPerDayResponse } from '../../services/statsService';
import styles from '../farmer/FarmerDashboard.module.css';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const MONTH_SHORT = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
];

function monthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function dayLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTH_SHORT[month - 1]}`;
}

function dayNumberOnly(dateStr: string): string {
  const [, , day] = dateStr.split('-').map(Number);
  return String(day);
}

function dayLabelLong(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTH_NAMES[month - 1]}`;
}

export default function AnalysisPerDay({
  data,
  loading,
  onMonthChange,
}: {
  data: AnalysesPerDayResponse | null;
  loading: boolean;
  onMonthChange?: (month?: string) => void;
}) {
  const [activeMonth, setActiveMonth] = useState<string | undefined>(undefined);

  if (loading || !data) {
    return (
      <div className={styles.statCard}>
        <div className={styles.statCardTitle}>📊 Analyses effectuées par jour</div>
        <div className={styles.skeletonBlock} style={{ height: 300 }} />
      </div>
    );
  }

  const handleSelect = (month?: string) => {
    setActiveMonth(month);
    onMonthChange?.(month);
  };

  const categories = activeMonth
    ? data.data.map((d) => dayNumberOnly(d.date))
    : data.data.map((d) => dayLabel(d.date));

  const options: ApexOptions = {
    chart: { type: 'bar', height: 300, fontFamily: 'Lato, sans-serif', stacked: false, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4, borderRadiusApplication: 'end' } },
    colors: ['#10b981', '#ef4444'],
    dataLabels: {
      enabled: true,
      formatter: (_val: number, opts) => {
        if (opts.seriesIndex !== 1) return '';
        const d = data.data[opts.dataPointIndex];
        return d && d.count > 0 ? String(d.count) : '';
      },
      offsetY: -6,
      style: { fontSize: '10px', colors: ['#374151'] },
    },
    xaxis: {
      categories,
      tickAmount: 10,
      labels: { rotate: -30, style: { fontSize: '11px' } },
    },
    yaxis: { title: { text: undefined } },
    legend: { position: 'top', horizontalAlign: 'left' },
    grid: { yaxis: { lines: { show: true } } },
    tooltip: {
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const d = data.data[dataPointIndex];
        return `<div style="padding:8px 12px;font-family:Lato,sans-serif;font-size:12px;">
          <strong>${dayLabelLong(d.date)}</strong> — ${d.count} analyse${d.count > 1 ? 's' : ''}
          (${d.disease_count} malade${d.disease_count > 1 ? 's' : ''}, ${d.healthy_count} saine${d.healthy_count > 1 ? 's' : ''})
        </div>`;
      },
    },
  };

  const series = [
    { name: 'Saines', data: data.data.map((d) => d.healthy_count) },
    { name: 'Malades', data: data.data.map((d) => d.disease_count) },
  ];

  const recordDay = data.data.reduce(
    (best, d) => (d.count > best.count ? d : best),
    { date: '', count: 0, disease_count: 0, healthy_count: 0 }
  );

  return (
    <div className={styles.statCard}>
      <div className={styles.statCardTitle}>📊 Analyses effectuées par jour</div>

      <div className={styles.monthFilterRow}>
        <button
          type="button"
          className={`${styles.monthFilterBtn} ${activeMonth === undefined ? styles.monthFilterBtnActive : ''}`}
          onClick={() => handleSelect(undefined)}
        >
          30 derniers jours
        </button>
        {data.available_months.map((m) => (
          <button
            key={m}
            type="button"
            className={`${styles.monthFilterBtn} ${activeMonth === m ? styles.monthFilterBtnActive : ''}`}
            onClick={() => handleSelect(m)}
          >
            {monthLabel(m)}
          </button>
        ))}
      </div>

      <Chart options={options} series={series} type="bar" height={300} />

      <div className={styles.dayStatRow}>
        <div className={styles.dayStatCard}>
          <div className={styles.dayStatIcon}>📅</div>
          <div className={styles.dayStatVal}>{data.total} analyses</div>
          <div className={styles.dayStatLbl}>Total de la période</div>
        </div>
        <div className={styles.dayStatCard}>
          <div className={styles.dayStatIcon}>📈</div>
          <div className={styles.dayStatVal}>{data.average_per_day} / jour</div>
          <div className={styles.dayStatLbl}>Moyenne</div>
        </div>
        <div className={styles.dayStatCard}>
          <div className={styles.dayStatIcon}>🏆</div>
          <div className={styles.dayStatVal}>
            {recordDay.count > 0 ? `${dayLabel(recordDay.date)} (${recordDay.count})` : '—'}
          </div>
          <div className={styles.dayStatLbl}>Jour record</div>
        </div>
      </div>
    </div>
  );
}
