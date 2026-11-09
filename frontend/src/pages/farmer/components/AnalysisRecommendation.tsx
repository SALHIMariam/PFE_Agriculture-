import styles from "../FarmerDashboard.module.css";
import type { Recommendation } from "../../../services/analysisService";
import RecoSectionList from "./RecoSectionList";

const CAS_INFO: Record<Recommendation["cas"], { label: string; className: string }> = {
  CAS_1: { label: "Situation normale", className: "cas-vert" },
  CAS_2: { label: "Traitement requis", className: "cas-orange" },
  CAS_3: { label: "Attention région", className: "cas-jaune" },
  CAS_4: { label: "Urgence", className: "cas-rouge" },
};

type Props = {
  recommendation: Recommendation | null;
};

export default function AnalysisRecommendation({ recommendation }: Props) {
  if (!recommendation) {
    return <div className={styles["reco-empty"]}>Recommandation non disponible pour cette analyse.</div>;
  }

  const cas = CAS_INFO[recommendation.cas];

  return (
    <div>
      <div className={styles["reco-real-top"]}>
        <h3 className={styles["reco-real-heading"]}>
          {recommendation.plante} — <em>{recommendation.maladie}</em>
        </h3>
        <span className={`${styles["cas-badge"]} ${styles[cas.className]}`}>{cas.label}</span>
      </div>

      <div className={styles["reco-real-meta"]}>
        <span className={styles["reco-real-chip"]}>Risque : {recommendation.niveau_risque}</span>
        <span className={styles["reco-real-chip"]}>
          Surveillance : tous les {recommendation.intervalle_surveillance_jours} jours
        </span>
        <span className={styles["reco-real-chip"]}>
          Région : {recommendation.region?.zone} — {recommendation.region?.niveau_label}
        </span>
      </div>

      <div className={styles["reco-real-message"]}>{recommendation.message}</div>

      <RecoSectionList recommendation={recommendation} />
    </div>
  );
}
