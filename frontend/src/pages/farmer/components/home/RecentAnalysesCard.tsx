import type { FarmerDashboardResponse } from "../../../../services/statsService";
import styles from "../../FarmerDashboard.module.css";

const STATUS = {
  validated: { label: "Validée", cls: "fd-badge-ok" },
  pending: { label: "En attente", cls: "fd-badge-wait" },
  rejected: { label: "Rejetée", cls: "fd-badge-ko" },
} as const;

type Props = {
  recent: FarmerDashboardResponse["recent"] | null;
  onOpenHistory?: () => void;
  onNewAnalysis?: () => void;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function RecentAnalysesCard({ recent, onOpenHistory, onNewAnalysis }: Props) {
  return (
    <div className={styles["fd-card"]}>
      <div className={styles["fd-card-head"]}>
        <div>
          <div className={styles["card-eye"]}>Activité</div>
          <div className={styles["fd-card-title"]}>Mes dernières analyses</div>
        </div>
        {recent && recent.length > 0 && (
          <button type="button" className={styles["fd-link"]} onClick={onOpenHistory}>
            Tout voir →
          </button>
        )}
      </div>

      {recent === null ? (
        <div className={`${styles["fd-chart-box"]} ${styles["fd-skeleton"]}`} />
      ) : recent.length === 0 ? (
        <div className={styles["fd-empty"]}>
          Vous n'avez pas encore d'analyse.
          <button type="button" className={styles["fd-link"]} onClick={onNewAnalysis}>
            Lancer ma première analyse →
          </button>
        </div>
      ) : (
        <ul className={styles["fd-recent"]}>
          {recent.map((a) => {
            const status = STATUS[a.validation_status] ?? STATUS.pending;
            return (
              <li key={a.id}>
                <button type="button" className={styles["fd-recent-row"]} onClick={onOpenHistory}>
                  <span className={styles["fd-recent-dot"]} aria-hidden="true">
                    {a.healthy ? "🌱" : "🍂"}
                  </span>
                  <span className={styles["fd-recent-body"]}>
                    <span className={styles["fd-recent-name"]}>{a.disease ?? "Diagnostic inconnu"}</span>
                    <span className={styles["fd-recent-meta"]}>
                      {a.crop ?? "Culture"} · {formatDate(a.created_at)}
                      {a.confidence !== null ? ` · ${Math.round(a.confidence * 100)}%` : ""}
                    </span>
                  </span>
                  <span className={`${styles["fd-badge"]} ${styles[status.cls]}`}>{status.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
