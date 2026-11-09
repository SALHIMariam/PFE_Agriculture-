import useAnimatedCounter from "../../hooks/useAnimatedCounter";
import type { FarmerDashboardResponse } from "../../../../services/statsService";
import styles from "../../FarmerDashboard.module.css";

type Kpis = FarmerDashboardResponse["kpis"];

type FarmerKpisProps = {
  kpis: Kpis | null;
  replayKey: number;
  onNavigate?: (section: string) => void;
};

function Kpi({
  emoji,
  label,
  value,
  hint,
  hintTone = "muted",
  replayKey,
  onClick,
}: {
  emoji: string;
  label: string;
  value: string;
  hint: string;
  hintTone?: "up" | "down" | "muted";
  replayKey: number;
  onClick?: () => void;
}) {
  const animated = useAnimatedCounter(value, true, 1200, replayKey);
  return (
    <button type="button" className={styles["fd-kpi"]} onClick={onClick}>
      <span className={styles["fd-kpi-icon"]} aria-hidden="true">{emoji}</span>
      <span className={styles["fd-kpi-label"]}>{label}</span>
      <span className={styles["fd-kpi-value"]}>{animated}</span>
      <span className={`${styles["fd-kpi-hint"]} ${styles[`fd-${hintTone}`]}`}>{hint}</span>
    </button>
  );
}

export default function FarmerKpis({ kpis, replayKey, onNavigate }: FarmerKpisProps) {
  if (!kpis) {
    return (
      <div className={styles["fd-kpis"]}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${styles["fd-kpi"]} ${styles["fd-skeleton"]}`} />
        ))}
      </div>
    );
  }

  const delta = kpis.last_30_days - kpis.previous_30_days;
  const decided = kpis.validated + kpis.rejected;

  return (
    <div className={styles["fd-kpis"]}>
      <Kpi
        emoji="🌿"
        label="Mes analyses"
        value={String(kpis.total)}
        hint={`${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)} vs 30j précédents`}
        hintTone={delta >= 0 ? "up" : "down"}
        replayKey={replayKey}
        onClick={() => onNavigate?.("history")}
      />
      <Kpi
        emoji="✅"
        label="Validées par l'expert"
        value={String(kpis.validated)}
        hint={decided > 0 ? `${Math.round((kpis.validated / decided) * 100)}% des analyses traitées` : "Aucune analyse traitée"}
        replayKey={replayKey}
        onClick={() => onNavigate?.("history")}
      />
      <Kpi
        emoji="⏳"
        label="En attente"
        value={String(kpis.pending)}
        hint={kpis.pending > 0 ? "Un expert va les examiner" : "Tout est à jour"}
        replayKey={replayKey}
        onClick={() => onNavigate?.("history")}
      />
      <Kpi
        emoji="🎯"
        label="Cultures saines"
        value={`${kpis.healthy_percentage}%`}
        hint={`Confiance IA moyenne : ${kpis.average_confidence}%`}
        replayKey={replayKey}
        onClick={() => onNavigate?.("stats")}
      />
    </div>
  );
}
