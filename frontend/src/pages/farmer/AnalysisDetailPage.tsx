import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import styles from "./FarmerDashboard.module.css";
import { useAuth } from "../../context/AuthContext";
import { getAnalysisDetail, type Analysis, type Recommendation } from "../../services/analysisService";
import { getDiseaseLabel } from "../../data/diseaseLabels";
import AnalysisRecommendation from "./components/AnalysisRecommendation";
import { SectionErrorBoundary } from "../../components/common/SectionErrorBoundary";
import CnnValidation from "./components/CnnValidation";
import RecoValidation from "./components/RecoValidation";
import AnalysisDiscussion from "./components/AnalysisDiscussion";

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGradcam, setShowGradcam] = useState(false);

  const analysisId = Number(id);

  useEffect(() => {
    if (!Number.isFinite(analysisId)) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getAnalysisDetail(analysisId)
      .then((result) => {
        if (cancelled) return;
        setAnalysis(result.analysis);
        setRecommendation(result.recommendation);
      })
      .catch((err: any) => {
        if (cancelled) return;
        if (err?.response?.status === 403) {
          setError("Vous n'avez pas accès à cette analyse.");
        } else if (err?.response?.status === 404) {
          setError("Cette analyse est introuvable.");
        } else {
          setError("Impossible de charger cette analyse. Réessayez plus tard.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const canValidate = userRoles.includes("expert") || userRoles.includes("admin");

  const label = getDiseaseLabel(analysis?.predicted_class ?? null);
  // `includes` et non `endsWith` : certaines classes saines ne finissent pas par
  // "healthy" (ex. `Bean__beans_healthy_crop`).
  const isHealthy = (analysis?.predicted_class ?? "").toLowerCase().includes("healthy");
  const confidencePercent = analysis?.confidence != null ? Math.round(analysis.confidence * 100) : null;

  return (
    <div className={styles["detail-page"]}>
      <div className={styles["detail-topbar"]}>
        <button type="button" className={styles["detail-back"]} onClick={() => navigate(-1)}>
          ← Retour à l'historique
        </button>
        <img
          src="/logo-elastic-solutions.png"
          alt="Elastic Solutions"
          style={{ height: 28, width: "auto", maxWidth: 160, objectFit: "contain", display: "block" }}
        />
      </div>

      <div className={styles["detail-inner"]}>
        {loading && <div className={styles["reco-empty"]}>Chargement de l'analyse…</div>}

        {!loading && error && <div className={styles["error-banner"]}>{error}</div>}

        {!loading && !error && analysis && (
          <>
            <div className={styles["detail-card"]}>
              <div className={styles["section-eye"]}>Diagnostic CNN</div>
              <h2 className={styles["section-title"]} style={{ marginBottom: 18 }}>
                {label.crop} <em>{label.disease}</em>
              </h2>

              {analysis.image_url && (
                <div className={styles["modal-img-box"]}>
                  {analysis.gradcam_url && (
                    <div className={styles["gradcam-toggle"]}>
                      <button
                        type="button"
                        className={!showGradcam ? styles["gc-active"] : ""}
                        onClick={() => setShowGradcam(false)}
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        className={showGradcam ? styles["gc-active"] : ""}
                        onClick={() => setShowGradcam(true)}
                      >
                        Grad-CAM
                      </button>
                    </div>
                  )}
                  <img
                    src={showGradcam && analysis.gradcam_url ? analysis.gradcam_url : analysis.image_url}
                    alt={showGradcam ? "Zones d'attention du modèle (Grad-CAM)" : "Photo de la plante analysée"}
                    className={styles["preview-image"]}
                  />
                </div>
              )}

              <div className={`${styles["diag-tag"]} ${isHealthy ? styles.success : styles.danger}`}>
                {isHealthy ? "✓ Plante saine" : "⚠ Maladie détectée"}
              </div>

              <div className={styles["reco-real-meta"]}>
                <span className={styles["reco-real-chip"]}>Plante : {label.crop}</span>
                <span className={styles["reco-real-chip"]}>Diagnostic : {label.disease}</span>
                {confidencePercent != null && (
                  <span className={styles["reco-real-chip"]}>Confiance : {confidencePercent}%</span>
                )}
              </div>

              <CnnValidation
                analysis={analysis}
                canValidate={canValidate}
                onUpdated={(updated) => setAnalysis(updated)}
              />
            </div>

            <div className={styles["detail-card"]}>
              <div className={styles["section-eye"]}>Recommandation agronomique</div>
              <h2 className={styles["section-title"]} style={{ marginBottom: 18 }}>
                Conseils du <em>modèle ML</em>
              </h2>
              <SectionErrorBoundary sectionName="Recommandation">
                <AnalysisRecommendation recommendation={recommendation} />
              </SectionErrorBoundary>

              <RecoValidation
                analysis={analysis}
                canValidate={canValidate}
                onUpdated={(updated) => setAnalysis(updated)}
              />
            </div>

            <div className={styles["detail-card"]}>
              <div className={styles["section-eye"]}>Échanges</div>
              <h2 className={styles["section-title"]} style={{ marginBottom: 18 }}>
                Discussion avec <em>l'expert</em>
              </h2>
              <AnalysisDiscussion analysisId={analysis.id} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
