import { useEffect, useState } from "react";
import { getRiskCalendar, type RiskCalendarResponse } from "../../../services/riskService";
import styles from "../FarmerDashboard.module.css";

function riskEmoji(score: number | null): string {
  if (score === null) return "⚪";
  if (score < 35) return "🟢";
  if (score < 55) return "🟡";
  if (score < 70) return "🟠";
  return "🔴";
}

export default function RiskCalendar() {
  const [data, setData] = useState<RiskCalendarResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRiskCalendar()
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
    return null;
  }

  return (
    <div className={styles["chart-card"]}>
      <div className={styles["card-eye"]}>Prévision 7 jours</div>
      <div className={styles["card-title"]}>
        Calendrier de risque — {data.crop} {data.disease.includes("__") ? data.disease.split("__")[1].replace(/_/g, " ") : data.disease}
      </div>

      <div className={styles.riskCalendarGrid}>
        {data.days.map((day) => (
          <div key={day.offset} className={styles.riskCalendarDay}>
            <div className={styles.riskCalendarDayName}>{day.day_name}</div>
            <div className={styles.riskCalendarEmoji}>{riskEmoji(day.risk_score)}</div>
            <div className={styles.riskCalendarPct}>{day.risk_score !== null ? `${day.risk_score}%` : "—"}</div>
          </div>
        ))}
      </div>

      {data.alert_day && (
        <div className={styles.riskCalendarAlertText}>
          🔴 {data.alert_day.day_name} : risque très élevé ({data.alert_day.risk_score}%)
        </div>
      )}
    </div>
  );
}
