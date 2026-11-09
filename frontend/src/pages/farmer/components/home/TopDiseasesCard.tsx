import type { FarmerDashboardResponse } from "../../../../services/statsService";
import styles from "../../FarmerDashboard.module.css";

const RANK_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#40916c", "#3b82f6"];

type Props = {
  diseases: FarmerDashboardResponse["top_diseases"] | null;
};

export default function TopDiseasesCard({ diseases }: Props) {
  const max = Math.max(1, ...(diseases ?? []).map((d) => d.count));

  return (
    <div className={styles["fd-card"]}>
      <div className={styles["card-eye"]}>Diagnostics</div>
      <div className={styles["fd-card-title"]}>🦠 Top 5 maladies</div>

      {diseases === null ? (
        <div className={`${styles["fd-chart-box"]} ${styles["fd-skeleton"]}`} />
      ) : diseases.length === 0 ? (
        <div className={styles["fd-empty"]}>Aucune maladie détectée — bravo ! 🌱</div>
      ) : (
        <ol className={styles["fd-rank"]}>
          {diseases.map((d, i) => (
            <li key={d.disease} className={styles["fd-rank-row"]}>
              <span className={styles["fd-rank-num"]} style={{ background: RANK_COLORS[i] }}>
                {i + 1}
              </span>
              <span className={styles["fd-rank-body"]}>
                <span className={styles["fd-rank-head"]}>
                  <span>{d.disease}</span>
                  <strong>{d.count}</strong>
                </span>
                <span className={styles["fd-rank-track"]}>
                  <span
                    className={styles["fd-rank-fill"]}
                    style={{ width: `${(d.count / max) * 100}%`, background: RANK_COLORS[i] }}
                  />
                </span>
                <span className={styles["fd-rank-sub"]}>{d.percentage}% de mes analyses</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
