import { useEffect, useState } from "react";
import styles from "../FarmerDashboard.module.css";
import {
  getLatestAnalysis,
  type Analysis,
  type Recommendation,
} from "../../../services/analysisService";
import RecoSectionList from "../components/RecoSectionList";

const CAS_INFO: Record<Recommendation["cas"], { label: string; className: string }> = {
  CAS_1: { label: "Situation normale", className: "cas-vert" },
  CAS_2: { label: "Traitement requis", className: "cas-orange" },
  CAS_3: { label: "Attention région", className: "cas-jaune" },
  CAS_4: { label: "Urgence", className: "cas-rouge" },
};

type Props = {
  onNewAnalysis?: () => void;
};

export default function RecommendationsSection({ onNewAnalysis }: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const retry = () => setReloadTick((n) => n + 1);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Filet de sécurité : si la promesse ne se règle jamais (cas pathologique),
    // on sort de l'état "chargement" au bout de 16s.
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setError("Le service met trop de temps à répondre. Réessayez plus tard.");
      }
    }, 16000);

    getLatestAnalysis()
      .then((result) => {
        if (cancelled) return;
        setAnalysis(result.analysis);
        setRecommendation(result.recommendation);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Impossible de charger votre recommandation. Réessayez plus tard.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          window.clearTimeout(timeout);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [reloadTick]);

  const cas = recommendation ? CAS_INFO[recommendation.cas] : null;

  return (
    <div className={styles.page}>
      <div className={styles["section-eye"]}>Conseils personnalisés</div>
      <h2 className={styles["section-title"]}>Vos <em>recommandations</em></h2>

      {error && (
        <div className={styles["error-banner"]}>
          {error}
          <button
            type="button"
            onClick={retry}
            style={{
              marginLeft: 12,
              padding: "4px 12px",
              background: "transparent",
              border: "1px solid currentColor",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {!error && loading && (
        <div className={styles["reco-empty"]}>Chargement de votre recommandation…</div>
      )}

      {/* Aucune analyse aboutie → inciter à en faire une */}
      {!error && !loading && !analysis && (
        <div className={styles["reco-empty"]} style={{ padding: "40px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
          <h3 style={{ color: "#1b4332", fontWeight: 800, margin: 0 }}>
            Aucune recommandation disponible
          </h3>
          <p style={{ color: "#4d6b52", fontSize: 13.5, maxWidth: 320, margin: "8px auto" }}>
            Faites analyser une photo de vos cultures pour recevoir des
            recommandations personnalisées de traitement.
          </p>
          {onNewAnalysis && (
            <button
              type="button"
              onClick={onNewAnalysis}
              style={{
                marginTop: 18,
                padding: "11px 24px",
                background: "linear-gradient(135deg,#40916c,#2d6a4f)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              📷 Faire une analyse →
            </button>
          )}
        </div>
      )}

      {/* Analyse présente mais service de reco indisponible */}
      {!error && !loading && analysis && !recommendation && (
        <div className={styles["reco-empty"]} style={{ padding: "40px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🛰️</div>
          <h3 style={{ color: "#1b4332", fontWeight: 800, margin: 0 }}>
            Recommandation momentanément indisponible
          </h3>
          <p style={{ color: "#4d6b52", fontSize: 13.5, maxWidth: 340, margin: "8px auto" }}>
            Le service de recommandation est temporairement injoignable. Votre
            analyse est bien enregistrée — réessayez dans quelques instants.
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              marginTop: 18,
              padding: "11px 24px",
              background: "linear-gradient(135deg,#40916c,#2d6a4f)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {!error && !loading && recommendation && cas && (
        <div className={styles["reco-real-card"]}>
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
      )}
    </div>
  );
}
