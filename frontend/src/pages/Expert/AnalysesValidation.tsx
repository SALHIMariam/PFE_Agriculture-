import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { getDiseaseLabel } from "../../data/diseaseLabels";
import {
  getExpertAnalyses,
  validateCnnDiagnosis,
  validateRecommendation,
  type Analysis,
  type ValidationStatus,
} from "../../services/analysisService";
import { reviseAnalysis } from "../../services/copilotService";
import AnalysisDiscussion from "../farmer/components/AnalysisDiscussion";

const FILTERS: { label: string; value: ValidationStatus | "all" }[] = [
  { label: "En attente", value: "pending" },
  { label: "Validées", value: "validated" },
  { label: "Rejetées", value: "rejected" },
  { label: "Toutes", value: "all" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function badgeClass(status: ValidationStatus): string {
  if (status === "validated") {
    return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400";
  }
  if (status === "rejected") {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
  }
  return "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300";
}

function PendingAnalysisCard({ analysis }: { analysis: Analysis }) {
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [cnnStatus, setCnnStatus] = useState<ValidationStatus>(analysis.cnn_validation_status ?? "pending");
  const [recoStatus, setRecoStatus] = useState<ValidationStatus>(analysis.reco_validation_status ?? "pending");
  const [cnnComment, setCnnComment] = useState(analysis.cnn_expert_comment ?? "");
  const [recoComment, setRecoComment] = useState(analysis.reco_expert_comment ?? "");
  const [showCnnReject, setShowCnnReject] = useState(false);
  const [showRecoReject, setShowRecoReject] = useState(false);
  const [submittingCnn, setSubmittingCnn] = useState(false);
  const [submittingReco, setSubmittingReco] = useState(false);
  const [overallStatus, setOverallStatus] = useState<ValidationStatus>(analysis.validation_status);
  const [busyRevise, setBusyRevise] = useState(false);

  const label = getDiseaseLabel(analysis.predicted_class);
  const confidencePercent = analysis.confidence != null ? Math.round(analysis.confidence * 100) : null;

  function flashSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function handleValidateCnn() {
    setSubmittingCnn(true);
    setError(null);
    try {
      await validateCnnDiagnosis(analysis.id, "validated");
      setCnnStatus("validated");
      setShowCnnReject(false);
      flashSuccess("Diagnostic validé avec succès");
    } catch {
      setError("Échec de la validation. Réessayez.");
    } finally {
      setSubmittingCnn(false);
    }
  }

  async function handleRejectCnn() {
    if (!cnnComment.trim()) {
      setError("Merci d'indiquer votre avis avant de corriger le diagnostic.");
      return;
    }
    setSubmittingCnn(true);
    setError(null);
    try {
      await validateCnnDiagnosis(analysis.id, "rejected", cnnComment.trim());
      setCnnStatus("rejected");
      setShowCnnReject(false);
      flashSuccess("Diagnostic corrigé");
    } catch {
      setError("Échec de la correction. Réessayez.");
    } finally {
      setSubmittingCnn(false);
    }
  }

  async function handleValidateReco() {
    setSubmittingReco(true);
    setError(null);
    try {
      await validateRecommendation(analysis.id, "validated");
      setRecoStatus("validated");
      setShowRecoReject(false);
      flashSuccess("Recommandation validée avec succès");
    } catch {
      setError("Échec de la validation. Réessayez.");
    } finally {
      setSubmittingReco(false);
    }
  }

  async function handleRejectReco() {
    if (!recoComment.trim()) {
      setError("Merci d'indiquer votre avis avant de rejeter.");
      return;
    }
    setSubmittingReco(true);
    setError(null);
    try {
      await validateRecommendation(analysis.id, "rejected", recoComment.trim());
      setRecoStatus("rejected");
      setShowRecoReject(false);
      flashSuccess("Recommandation rejetée");
    } catch {
      setError("Échec du rejet. Réessayez.");
    } finally {
      setSubmittingReco(false);
    }
  }

  async function handleRevise(newStatus: "validated" | "rejected") {
    const promptText =
      newStatus === "rejected"
        ? "Raison du changement en rejet :"
        : "Commentaire pour le farmer (optionnel) :";
    const input = window.prompt(promptText);
    if (input === null) return; // Annulé

    setBusyRevise(true);
    setError(null);
    try {
      await reviseAnalysis(analysis.id, newStatus, input || undefined);
      setOverallStatus(newStatus);
      setCnnStatus(newStatus);
      setRecoStatus(newStatus);
      flashSuccess(
        newStatus === "validated"
          ? "Statut changé en validé. Le farmer a été notifié."
          : "Statut changé en rejeté. Le farmer a été notifié.",
      );
    } catch {
      setError("Erreur lors de la modification.");
    } finally {
      setBusyRevise(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] sm:flex-row sm:items-start">
      <img
        src={analysis.image_url}
        alt="Plante analysée"
        className="h-24 w-24 shrink-0 rounded-xl object-cover"
      />

      <div className="flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {label.crop} — {label.disease}
          </h3>
          {confidencePercent != null && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300">
              Confiance {confidencePercent}%
            </span>
          )}
          {!!analysis.messages_count && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              💬 {analysis.messages_count} réponse{analysis.messages_count > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          {analysis.farmer_name ?? "Farmer"}
          {analysis.farmer_governorate ? ` · ${analysis.farmer_governorate}` : ""}
          {analysis.created_at ? ` · ${formatDate(analysis.created_at)}` : ""}
        </p>

        {successMessage && (
          <p className="mb-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">{successMessage}</p>
        )}
        {error && <p className="mb-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}

        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Diagnostic CNN
          </p>

          {cnnStatus === "pending" && (
            <div className="mt-2">
              <span className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(cnnStatus)}`}>
                ⏳ En attente
              </span>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleValidateCnn}
                  disabled={submittingCnn}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  ✓ Valider le diagnostic
                </button>
                <button
                  type="button"
                  onClick={() => setShowCnnReject((v) => !v)}
                  disabled={submittingCnn}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  ✗ Corriger le diagnostic
                </button>
              </div>

              {showCnnReject && (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    value={cnnComment}
                    onChange={(e) => setCnnComment(e.target.value)}
                    placeholder="Expliquez la correction du diagnostic..."
                    className="min-h-[60px] w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-white/5 dark:text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRejectCnn}
                    disabled={submittingCnn}
                    className="self-start rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirmer la correction
                  </button>
                </div>
              )}
            </div>
          )}

          {cnnStatus === "validated" && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              ✓ Diagnostic CNN validé
            </span>
          )}

          {cnnStatus === "rejected" && (
            <div>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                ✗ Diagnostic CNN rejeté
              </span>
              {cnnComment && (
                <p className="mt-1 rounded-lg bg-red-50 p-2 text-xs italic text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  "{cnnComment}"
                </p>
              )}
            </div>
          )}
        </div>

        <hr className="my-3 border-gray-100 dark:border-white/10" />

        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Recommandation agronomique
          </p>

          {recoStatus === "pending" && (
            <div className="mt-2">
              <span className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(recoStatus)}`}>
                ⏳ En attente
              </span>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleValidateReco}
                  disabled={submittingReco}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  ✓ Valider la recommandation
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecoReject((v) => !v)}
                  disabled={submittingReco}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  ✗ Rejeter la recommandation
                </button>
              </div>

              {showRecoReject && (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    value={recoComment}
                    onChange={(e) => setRecoComment(e.target.value)}
                    placeholder="Expliquez votre avis sur cette recommandation..."
                    className="min-h-[60px] w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-white/5 dark:text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRejectReco}
                    disabled={submittingReco}
                    className="self-start rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirmer le rejet
                  </button>
                </div>
              )}
            </div>
          )}

          {recoStatus === "validated" && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              ✓ Recommandation validée
            </span>
          )}

          {recoStatus === "rejected" && (
            <div>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                ✗ Recommandation rejetée
              </span>
              {recoComment && (
                <p className="mt-1 rounded-lg bg-red-50 p-2 text-xs italic text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  "{recoComment}"
                </p>
              )}
            </div>
          )}
        </div>

        {overallStatus !== "pending" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Verdict global : {overallStatus === "validated" ? "✓ Validé" : "❌ Rejeté"}
            </span>
            {overallStatus === "validated" ? (
              <button
                type="button"
                disabled={busyRevise}
                onClick={() => handleRevise("rejected")}
                className="ml-auto rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                {busyRevise ? "…" : "Changer en rejeté"}
              </button>
            ) : (
              <button
                type="button"
                disabled={busyRevise}
                onClick={() => handleRevise("validated")}
                className="ml-auto rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
              >
                {busyRevise ? "…" : "Changer en validé"}
              </button>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDiscussion((v) => !v)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            💬 Discussion{!!analysis.messages_count && ` (${analysis.messages_count})`}
          </button>
          <Link
            to={`/dashboard/analyses/${analysis.id}`}
            className="ml-auto text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            Voir le détail →
          </Link>
        </div>

        {showDiscussion && (
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-white/10 dark:bg-white/[0.02]">
            <AnalysisDiscussion analysisId={analysis.id} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalysesValidation() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [filter, setFilter] = useState<ValidationStatus | "all">("pending");

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getExpertAnalyses(page, filter)
      .then((result) => {
        if (cancelled) return;
        setAnalyses(result.data);
        setLastPage(result.meta.last_page);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger les analyses à valider.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, filter]);

  return (
    <>
      <PageMeta
        title="Validation des analyses | Elastic Solutions"
        description="Liste des diagnostics IA à valider ou déjà traités par l'expert"
      />
      <PageBreadcrumb pageTitle="Validation des analyses" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === f.value
                  ? "bg-emerald-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {!error && loading && analyses.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 dark:border-white/[0.05] dark:bg-white/[0.03]">
            Chargement des analyses…
          </div>
        )}

        {!error && !loading && analyses.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 dark:border-white/[0.05] dark:bg-white/[0.03]">
            Aucune analyse pour ce filtre.
          </div>
        )}

        {analyses.map((analysis) => (
          <PendingAnalysisCard key={analysis.id} analysis={analysis} />
        ))}

        {lastPage > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Page {page} sur {lastPage}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
