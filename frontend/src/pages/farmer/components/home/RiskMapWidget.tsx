import { useEffect, useState } from "react";
import TunisiaRiskMap from "../../../../components/maps/TunisiaRiskMap";
import { RISK_COLORS, riskColor, riskLabel } from "../../../../components/maps/riskColors";
import { getRegionalMap, type RegionalMapRegion } from "../../../../services/statsService";
import styles from "../../FarmerDashboard.module.css";
import { diseaseNameFr } from "../../../../data/diseaseLabels";

type Props = {
  governorate?: string | null;
  onOpen?: () => void;
};

export default function RiskMapWidget({ governorate, onOpen }: Props) {
  const [regions, setRegions] = useState<RegionalMapRegion[] | null>(null);

  useEffect(() => {
    getRegionalMap()
      .then((r) => setRegions(r.regions))
      .catch(() => setRegions([]));
  }, []);

  const byName = new Map((regions ?? []).map((r) => [r.governorate, r]));
  const mine = governorate ? byName.get(governorate) : undefined;

  return (
    <div className={`${styles["fd-card"]} ${styles["rm-card"]}`}>
      <div className={styles["card-eye"]}>Vue régionale</div>
      <div className={styles["fd-card-title"]}>Carte des risques</div>

      <button type="button" className={styles["rm-map"]} onClick={onOpen} aria-label="Ouvrir la carte des risques">
        <TunisiaRiskMap regions={regions ?? []} highlight={governorate} />
        <span className={styles["rm-cta"]}>Ouvrir la carte →</span>
      </button>

      {governorate && (
        <div className={styles["rm-foot"]}>
          <span>📍</span>
          <strong>{governorate}</strong>
          {mine && mine.total_analyses > 0 ? (
            <>
              <span>·</span>
              <span style={{ color: riskColor(mine.risk_percentage) }}>
                Risque {mine.risk_percentage}% ({riskLabel(mine.risk_percentage)})
              </span>
              {mine.top_disease && (
                <>
                  <span>·</span>
                  <em>{diseaseNameFr(mine.top_disease)}</em>
                </>
              )}
            </>
          ) : (
            <span className={styles["fd-muted"]}>· {regions === null ? "chargement…" : "aucune donnée"}</span>
          )}
        </div>
      )}

      <div className={styles["rm-legend"]}>
        <span><i style={{ background: RISK_COLORS.low }} />Faible</span>
        <span><i style={{ background: RISK_COLORS.medium }} />Moyen</span>
        <span><i style={{ background: RISK_COLORS.high }} />Élevé</span>
        <span><i style={{ background: RISK_COLORS.none }} />Sans donnée</span>
      </div>
    </div>
  );
}
