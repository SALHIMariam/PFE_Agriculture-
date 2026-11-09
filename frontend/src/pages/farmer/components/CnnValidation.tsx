import { useState } from "react";
import styles from "../FarmerDashboard.module.css";
import { validateCnnDiagnosis, type Analysis } from "../../../services/analysisService";

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Props = {
  analysis: Analysis;
  canValidate: boolean;
  onUpdated: (updated: Analysis) => void;
};

export default function CnnValidation({ analysis, canValidate, onUpdated }: Props) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleValidate() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await validateCnnDiagnosis(analysis.id, "validated");
      onUpdated(updated);
    } catch {
      setError("Impossible d'enregistrer la validation. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!comment.trim()) {
      setError("Merci d'indiquer votre avis avant de corriger le diagnostic.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await validateCnnDiagnosis(analysis.id, "rejected", comment.trim());
      onUpdated(updated);
      setShowRejectForm(false);
      setComment("");
    } catch {
      setError("Impossible d'enregistrer la correction. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  const meta = (
    <>
      {analysis.cnn_expert_name && `Par ${analysis.cnn_expert_name}`}
      {analysis.cnn_expert_name && analysis.cnn_validated_at && " · "}
      {analysis.cnn_validated_at && formatDateTime(analysis.cnn_validated_at)}
    </>
  );

  return (
    <div className={styles["sub-validation"]}>
      <div className={styles["card-eye"]}>Validation du diagnostic</div>

      {analysis.cnn_validation_status === "pending" && (
        <div className={`${styles["validation-block"]} ${styles["validation-pending"]}`}>
          <div className={styles["validation-pending-title"]}>
            ⏳ En attente de validation du diagnostic
          </div>
          <div className={styles["validation-pending-text"]}>
            L'expert va examiner et confirmer le diagnostic de l'intelligence artificielle.
          </div>
        </div>
      )}

      {analysis.cnn_validation_status === "validated" && (
        <div className={`${styles["validation-block"]} ${styles["validation-validated"]}`}>
          <div className={styles["validation-validated-title"]}>
            ✓ Diagnostic confirmé par l'expert
          </div>
          {(analysis.cnn_expert_name || analysis.cnn_validated_at) && (
            <div className={styles["validation-validated-meta"]}>{meta}</div>
          )}
        </div>
      )}

      {analysis.cnn_validation_status === "rejected" && (
        <div className={`${styles["validation-block"]} ${styles["validation-rejected"]}`}>
          <div className={styles["validation-rejected-title"]}>
            ✗ Diagnostic corrigé par l'expert
          </div>
          {analysis.cnn_expert_comment && (
            <div className={styles["validation-rejected-comment"]}>"{analysis.cnn_expert_comment}"</div>
          )}
          {(analysis.cnn_expert_name || analysis.cnn_validated_at) && (
            <div className={styles["validation-rejected-meta"]}>{meta}</div>
          )}
        </div>
      )}

      {canValidate && analysis.cnn_validation_status === "pending" && (
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
              ✗ Corriger
            </button>
          </div>

          {showRejectForm && (
            <div>
              <textarea
                className={styles["validation-comment-textarea"]}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Expliquez la correction à apporter au diagnostic…"
              />
              <div className={styles["validation-expert-actions"]}>
                <button
                  type="button"
                  className={styles["btn-reject-expert"]}
                  onClick={handleReject}
                  disabled={submitting}
                >
                  Confirmer la correction
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
