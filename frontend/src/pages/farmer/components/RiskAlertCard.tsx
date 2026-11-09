import { useEffect, useState } from "react";
import { getRiskForecast, type RiskForecastResponse } from "../../../services/riskService";
import styles from "../FarmerDashboard.module.css";
import { getDiseaseLabel } from "../../../data/diseaseLabels";

function levelColor(level: string | null): string {
  switch (level) {
    case "low":
      return "#10b981";
    case "medium":
      return "#f59e0b";
    case "high":
      return "#f97316";
    case "very_high":
      return "#ef4444";
    default:
      return "#6b8c6c";
  }
}

function levelLabel(level: string | null): string {
  switch (level) {
    case "low":
      return "Risque faible";
    case "medium":
      return "Risque modéré";
    case "high":
      return "Risque élevé";
    case "very_high":
      return "Risque très élevé";
    default:
      return "Risque inconnu";
  }
}

export default function RiskAlertCard({ onNewAnalysis }: { onNewAnalysis?: () => void }) {
  const [data, setData] = useState<RiskForecastResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRiskForecast()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData({ available: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data || !data.available) {
    return null; // état neutre : rien à afficher tant qu'il n'y a pas de donnée
  }

  const day7 = data.days[7];
  const score = day7?.risk_score ?? 0;
  const { crop: cropFr, disease: diseaseFr } = getDiseaseLabel(data.disease);
  const diseaseLabel = `${diseaseFr.toLowerCase()} (${cropFr})`;

  if (data.alert) {
    return (
      <div className={styles.riskAlertBanner}>
        <div className={styles.riskAlertEyebrow}>🚨 Alerte agricole</div>
        <div className={styles.riskAlertTitle}>
          Votre région présente un risque élevé de {diseaseLabel}
        </div>
        <div className={styles.riskAlertScore}>{score}%</div>
        <div className={styles.riskAlertText}>
          Période : prochains 7 jours. ⚠️ Nous vous recommandons de surveiller vos plants de près.
        </div>
        {score >= 55 && (
          <button type="button" className={styles.riskAlertCta} onClick={onNewAnalysis}>
            📷 Nouvelle analyse
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.riskNeutralCard}>
      <div className={styles.riskNeutralScore}>{score}%</div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <span className={styles.riskLevelBadge} style={{ background: `${levelColor(day7?.risk_level ?? null)}22`, color: levelColor(day7?.risk_level ?? null) }}>
          {levelLabel(day7?.risk_level ?? null)}
        </span>
        <div style={{ marginTop: 8, fontSize: 13, color: "#4d6b52" }}>
          Risque de {diseaseLabel} dans votre région sur les 7 prochains jours.
        </div>
      </div>
      {score >= 55 && (
        <button type="button" className={styles["wc-cta"]} onClick={onNewAnalysis}>
          📷 Nouvelle analyse
        </button>
      )}
    </div>
  );
}
