import { useState } from "react";
import styles from "../FarmerDashboard.module.css";
import { validateRecommendation, type Analysis } from "../../../services/analysisService";

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Props = {
  analysis: Analysis;
  canValidate: boolean;
  onUpdated: (updated: Analysis) => void;
};

export default function RecoValidation({ analysis, canValidate, onUpdated }: Props) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleValidate() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await validateRecommendation(analysis.id, "validated");
      onUpdated(updated);
    } catch {
      setError("Impossible d'enregistrer la validation. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!comment.trim()) {
      setError("Merci d'indiquer votre avis avant de rejeter.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await validateRecommendation(analysis.id, "rejected", comment.trim());
      onUpdated(updated);
      setShowRejectForm(false);
      setComment("");
    } catch {
      setError("Impossible d'enregistrer le rejet. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  const meta = (
    <>
      {analysis.reco_expert_name && `Par ${analysis.reco_expert_name}`}
      {analysis.reco_expert_name && analysis.reco_validated_at && " · "}
      {analysis.reco_validated_at && formatDateTime(analysis.reco_validated_at)}
    </>
  );

  return (
    <div className={styles["sub-validation"]}>
      <div className={styles["card-eye"]}>Validation de la recommandation</div>

      {analysis.reco_validation_status === "pending" && (
        <div className={`${styles["validation-block"]} ${styles["validation-pending"]}`}>
          <div className={styles["validation-pending-title"]}>
            ⏳ En attente de validation de la recommandation
          </div>
          <div className={styles["validation-pending-text"]}>
            L'expert va examiner et valider la recommandation proposée par l'intelligence artificielle.
          </div>
        </div>
      )}

      {analysis.reco_validation_status === "validated" && (
        <div className={`${styles["validation-block"]} ${styles["validation-validated"]}`}>
          <div className={styles["validation-validated-title"]}>
            ✓ Recommandation confirmée par l'expert
          </div>
          {(analysis.reco_expert_name || analysis.reco_validated_at) && (
            <div className={styles["validation-validated-meta"]}>{meta}</div>
          )}
        </div>
      )}

      {analysis.reco_validation_status === "rejected" && (
        <div className={`${styles["validation-block"]} ${styles["validation-rejected"]}`}>
          <div className={styles["validation-rejected-title"]}>
            ✗ Recommandation rejetée par l'expert
          </div>
          {analysis.reco_expert_comment && (
            <div className={styles["validation-rejected-comment"]}>"{analysis.reco_expert_comment}"</div>
          )}
          {(analysis.reco_expert_name || analysis.reco_validated_at) && (
            <div className={styles["validation-rejected-meta"]}>{meta}</div>
          )}
        </div>
      )}

      {canValidate && analysis.reco_validation_status === "pending" && (
        <>
          <div className={styles["validation-expert-actions"]}>
            <button
              type="button"
              className={styles["btn-validate-expert"]}
              onClick={handleValidate}
              disabled={submitting}
            >
              ✓ Valider
            </button>
            <button
              type="button"
              className={styles["btn-reject-expert"]}
              onClick={() => setShowRejectForm((v) => !v)}
              disabled={submitting}
            >
              ✗ Rejeter
            </button>
          </div>

          {showRejectForm && (
            <div>
              <textarea
                className={styles["validation-comment-textarea"]}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Expliquez votre avis sur cette recommandation…"
              />
              <div className={styles["validation-expert-actions"]}>
                <button
                  type="button"
                  className={styles["btn-reject-expert"]}
                  onClick={handleReject}
                  disabled={submitting}
                >
                  Confirmer le rejet
                </button>
              </div>
            </div>
          )}

          {error && <div className={styles["error-banner"]}>{error}</div>}
        </>
      )}
    </div>
  );
}
