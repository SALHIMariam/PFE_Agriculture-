import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import styles from "../FarmerDashboard.module.css";
import { deleteAnalysis, getAnalyses, type Analysis } from "../../../services/analysisService";
import { getDiseaseLabel } from "../../../data/diseaseLabels";

function relativeDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `Il y a ${diffDays} j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Badge de statut de la ligne d'historique.
 *
 * Discriminant : `cnn_validated_at`. Il est renseigné dès qu'un expert statue
 * sur le diagnostic via l'UI expert (validate-cnn), et reste `null` pour
 * l'auto-validation backend par confiance ≥ 85 %. C'est le signal le plus
 * fiable d'une intervention humaine (l'axe global `validate()` n'est jamais
 * appelé depuis l'UI expert).
 */
function getStatusBadge(analysis: Analysis) {
  const base: CSSProperties = {
    padding: "4px 12px",
    borderRadius: 20,
    fontWeight: 700,
    fontSize: 11,
    whiteSpace: "nowrap",
  };

  if (analysis.status === "pending") {
    return <span style={{ ...base, background: "rgba(120,120,120,0.15)", color: "#555" }}>⏳ En cours</span>;
  }
  if (analysis.status === "failed") {
    return <span style={{ ...base, background: "rgba(201,76,76,0.12)", color: "#8b1818" }}>✗ Échec</span>;
  }

  // Rejeté par un expert (diagnostic OU recommandation), une fois qu'il a statué.
  if (
    (analysis.cnn_validation_status === "rejected" ||
      analysis.reco_validation_status === "rejected") &&
    analysis.cnn_validated_at
  ) {
    return <span style={{ ...base, background: "rgba(201,76,76,0.12)", color: "#8b1818" }}>✗ Rejetée</span>;
  }

  // Validé par un expert : diagnostic confirmé ET intervention humaine
  // (`cnn_validated_at` renseigné ; null = auto-validation par confiance).
  if (analysis.cnn_validation_status === "validated" && analysis.cnn_validated_at) {
    return <span style={{ ...base, background: "rgba(64,145,108,0.15)", color: "#1b4332" }}>✓ Validée</span>;
  }

  // Tout le reste (dont l'auto-validation) → en attente d'un expert.
  return <span style={{ ...base, background: "rgba(201,168,76,0.15)", color: "#8a6d1e" }}>⏳ En attente</span>;
}

export default function HistorySection() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "ok" | "err" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAnalyses(page)
      .then((result) => {
        if (cancelled) return;
        setAnalyses((prev) => (page === 1 ? result.data : [...prev, ...result.data]));
        setLastPage(result.meta.last_page);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger l'historique. Réessayez plus tard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  // Recharge la page 1 et fusionne : rafraîchit les lignes déjà affichées
  // (une validation experte fait basculer leur badge), ajoute en tête les
  // analyses nouvellement créées, et conserve les pages déjà chargées.
  const reload = useCallback(() => {
    getAnalyses(1)
      .then((res) => {
        setAnalyses((prev) => {
          const known = new Set(prev.map((a) => a.id));
          const fresh = new Map(res.data.map((a) => [a.id, a]));
          const refreshed = prev.map((a) => fresh.get(a.id) ?? a);
          const brandNew = res.data.filter((a) => !known.has(a.id));
          return [...brandNew, ...refreshed];
        });
        setLastPage(res.meta.last_page);
      })
      .catch(() => {});
  }, []);

  // 1. Polling 10 s tant qu'une analyse aboutie n'a pas encore été traitée par
  //    un expert (`cnn_validated_at` null — inclut les analyses auto-validées).
  useEffect(() => {
    const hasPending = analyses.some(
      (a) => a.status === "done" && !a.cnn_validated_at,
    );
    if (!hasPending) return;

    const interval = window.setInterval(reload, 10000);
    return () => window.clearInterval(interval);
  }, [analyses, reload]);

  // 2. Recharge quand la fenêtre reprend le focus (farmer revient d'un autre onglet).
  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);

  const handleDelete = useCallback(async (event: React.MouseEvent, analysisId: number) => {
    event.stopPropagation();
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette analyse ?")) return;

    setDeletingId(analysisId);
    try {
      await deleteAnalysis(analysisId);
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
      setToast({ message: "Analyse supprimée avec succès.", kind: "ok" });
    } catch {
      setToast({ message: "Impossible de supprimer cette analyse. Réessayez plus tard.", kind: "err" });
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles["section-eye"]}>Vos diagnostics</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <h2 className={styles["section-title"]} style={{ marginBottom: 0 }}>
          Historique des <em>analyses</em>
        </h2>
        <button
          type="button"
          onClick={reload}
          style={{
            background: "none",
            border: "1px solid rgba(64,145,108,0.3)",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 11,
            color: "#40916c",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ↻ Actualiser
        </button>
      </div>

      {error && <div className={styles["error-banner"]}>{error}</div>}

      {!error && loading && analyses.length === 0 && (
        <div className={styles["history-card"]}>
          <div className={styles["history-empty"]}>Chargement de votre historique…</div>
        </div>
      )}

      {!error && !loading && analyses.length === 0 && (
        <div className={styles["history-card"]}>
          <div className={styles["history-empty"]}>
            Aucune analyse pour l'instant. Déposez votre première photo dans l'onglet « Nouvelle analyse ».
          </div>
        </div>
      )}

      {analyses.length > 0 && (
        <div className={styles["history-card"]}>
          {analyses.map((analysis) => {
            const label = getDiseaseLabel(analysis.predicted_class);
            const confidence = analysis.confidence != null ? `${Math.round(analysis.confidence * 100)}%` : "—";

            return (
              <div
                key={analysis.id}
                className={styles["hist-row"]}
                onClick={() => navigate(`/farmer/analyses/${analysis.id}`)}
              >
                <span className={styles["hist-date"]}>{relativeDate(analysis.created_at)}</span>
                <span className={styles["hist-crop"]}>{label.crop}</span>
                <span className={styles["hist-disease"]}>{label.disease} · {confidence}</span>
                <span className={styles["hist-status-cell"]}>{getStatusBadge(analysis)}</span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, analysis.id)}
                  disabled={deletingId === analysis.id}
                  title="Supprimer cette analyse"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#8b1818",
                    cursor: deletingId === analysis.id ? "default" : "pointer",
                    fontSize: 16,
                    padding: "4px 8px",
                    opacity: deletingId === analysis.id ? 0.5 : 1,
                  }}
                >
                  {deletingId === analysis.id ? "…" : "🗑"}
                </button>
                <span className={styles["hist-arrow"]}>→</span>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            padding: "12px 20px",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            color: "#fff",
            background: toast.kind === "ok" ? "#2d6a4f" : "#8b1818",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          {toast.message}
        </div>
      )}

      {!loading && page < lastPage && (
        <button
          type="button"
          className={styles.btn + " " + styles["btn-ghost"]}
          style={{ marginTop: 16 }}
          onClick={() => setPage((p) => p + 1)}
        >
          Charger plus
        </button>
      )}
    </div>
  );
}
