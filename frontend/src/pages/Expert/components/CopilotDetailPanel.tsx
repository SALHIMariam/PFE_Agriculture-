import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Analysis } from "../../../services/analysisService";
import { formatDiseaseLabel, getDiseaseLabel } from "../../../data/diseaseLabels";
import {
  prepare,
  respond,
  reviseAnalysis,
  type CopilotResponse,
  type CopilotRespondAction,
} from "../../../services/copilotService";

type Notify = (message: string, kind: "success" | "error") => void;

const SOURCE_LABELS: Record<string, string> = {
  diagnostic: "Diagnostic IA",
  knowledge_base: "Base de connaissances",
  farmer_history: "Historique farmer",
  recommendation: "Recommendation Engine",
  weather: "Météo",
  risk: "Prévision de risque",
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  important: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  normal: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
};

const SEVERITY_STYLES: Record<string, string> = {
  none: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
  low: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  critical: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const VALIDATION_STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
  validated: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

function sourceLabel(key: string): string {
  return SOURCE_LABELS[key] ?? key.replace(/_/g, " ");
}

function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? fallback;
}

function SafetyBanner({ safety }: { safety: CopilotResponse["safety"] }) {
  if (safety.verdict === "ok") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400">
        ✓ Diagnostic fiable — réponse automatique autorisée
      </div>
    );
  }
  if (safety.verdict === "uncertain") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
        ⚠️ Diagnostic incertain — {safety.reason}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      Classe non reconnue
    </div>
  );
}

export default function CopilotDetailPanel({
  analysis,
  onClose,
  onResolved,
  notify,
}: {
  analysis: Analysis;
  onClose: () => void;
  onResolved: (analysisId: number) => void;
  notify: Notify;
}) {
  const [data, setData] = useState<CopilotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [busyAction, setBusyAction] = useState<CopilotRespondAction | null>(null);
  const [imageTab, setImageTab] = useState<"original" | "gradcam">("original");

  const isHandled = analysis.validation_status !== "pending";

  useEffect(() => {
    setImageTab("original");

    // Une analyse déjà validée/éditée/rejetée ne peut plus être préparée
    // (CopilotService::prepare le refuse côté backend) : on affiche un
    // résumé en lecture seule à partir des champs déjà persistés sur
    // `analysis`, sans appeler l'API.
    if (isHandled) {
      setLoading(false);
      setError(null);
      setData(null);
      setDraftText("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    setDraftText("");

    prepare(analysis.id)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setDraftText(res.draft?.body ?? "");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, "Impossible de préparer le brouillon Copilot."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [analysis.id, isHandled]);

  const isDirty = !!data && draftText.trim() !== (data.draft.body ?? "").trim();

  async function handleAction(action: CopilotRespondAction) {
    let rejectComment: string | undefined;

    if (action === "reject") {
      const reason = window.prompt("Raison du rejet (optionnel) :");
      if (reason === null) return; // Annulé
      rejectComment = reason || undefined;
    }

    setBusyAction(action);
    setError(null);
    try {
      await respond(
        analysis.id,
        action,
        action === "edit" ? draftText.trim() : undefined,
        action === "reject" ? rejectComment : undefined,
      );
      const messages: Record<CopilotRespondAction, string> = {
        validate: "Réponse envoyée au farmer.",
        edit: "Version modifiée envoyée au farmer.",
        reject: "Brouillon rejeté.",
      };
      notify(messages[action], "success");
      onResolved(analysis.id);
    } catch (err) {
      setError(getErrorMessage(err, "Action impossible. Réessayez."));
    } finally {
      setBusyAction(null);
    }
  }

  const busy = busyAction !== null;

  const [busyRevise, setBusyRevise] = useState(false);

  async function handleRevise(newStatus: "validated" | "rejected") {
    const prompt =
      newStatus === "rejected"
        ? "Raison du changement en rejet :"
        : "Commentaire pour le farmer (optionnel) :";
    const input = window.prompt(prompt);
    if (input === null) return; // Annulé

    setBusyRevise(true);
    setError(null);
    try {
      await reviseAnalysis(analysis.id, newStatus, input || undefined);
      notify(
        newStatus === "validated"
          ? "Statut changé en validé. Le farmer a été notifié."
          : "Statut changé en rejeté. Le farmer a été notifié.",
        "success",
      );
      onResolved(analysis.id);
    } catch (err) {
      notify(getErrorMessage(err, "Erreur lors de la modification."), "error");
    } finally {
      setBusyRevise(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-800 dark:text-white/90">
            {analysis.predicted_class ? formatDiseaseLabel(analysis.predicted_class) : "—"}
          </h3>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            Farmer : {analysis.farmer_name ?? "—"}
            {analysis.farmer_governorate ? ` · ${analysis.farmer_governorate}` : ""}
          </p>
        </div>
        <Link
          to={`/dashboard/analyses/${analysis.id}`}
          className="shrink-0 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Voir le détail →
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {(analysis.image_url || analysis.gradcam_url) && (
        <div className="relative rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
          <div className="absolute right-3 top-3 flex gap-1">
            <button
              type="button"
              onClick={() => setImageTab("original")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                imageTab === "original"
                  ? "bg-gray-800 text-white dark:bg-brand-500"
                  : "border border-gray-300 bg-white text-gray-600 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300"
              }`}
            >
              ORIGINAL
            </button>
            {analysis.gradcam_url && (
              <button
                type="button"
                onClick={() => setImageTab("gradcam")}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  imageTab === "gradcam"
                    ? "bg-gray-800 text-white dark:bg-brand-500"
                    : "border border-gray-300 bg-white text-gray-600 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300"
                }`}
              >
                GRAD-CAM
              </button>
            )}
          </div>
          <img
            src={imageTab === "gradcam" && analysis.gradcam_url ? analysis.gradcam_url : analysis.image_url}
            alt={`${analysis.predicted_class ?? "analyse"} - ${imageTab}`}
            className="mx-auto max-h-[280px] rounded-lg object-contain"
          />
        </div>
      )}

      {analysis.top_k && analysis.top_k.length > 0 && (
        <div className="rounded-xl border border-gray-100 p-4 dark:border-white/[0.06]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Top-3 diagnostic CNN
          </p>
          <div className="flex flex-col gap-2">
            {analysis.top_k.slice(0, 3).map((entry) => {
              const label = getDiseaseLabel(entry.class);
              const pct = Math.round(entry.confidence * 100);
              return (
                <div key={entry.class} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">
                    {label.crop} — {label.disease}
                  </span>
                  <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-semibold text-gray-800 dark:text-white/90">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-white/[0.06]">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                VALIDATION_STATUS_STYLES[analysis.cnn_validation_status] ?? VALIDATION_STATUS_STYLES.pending
              }`}
            >
              Diagnostic CNN : {analysis.cnn_validation_status}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                VALIDATION_STATUS_STYLES[analysis.reco_validation_status] ?? VALIDATION_STATUS_STYLES.pending
              }`}
            >
              Recommandation : {analysis.reco_validation_status}
            </span>
          </div>
        </div>
      )}

      {isHandled ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
            {analysis.validation_status === "validated"
              ? analysis.expert_edited_response
                ? "✏️ Réponse éditée et envoyée"
                : "✓ Réponse validée et envoyée"
              : "❌ Analyse rejetée"}
            {analysis.responded_at && (
              <span className="ml-2 text-xs text-gray-400">
                {new Date(analysis.responded_at).toLocaleDateString("fr-FR")}
              </span>
            )}
            {(analysis.expert_response ?? analysis.draft_response) && (
              <p className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {analysis.expert_response ?? analysis.draft_response}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {analysis.validation_status === "validated" ? (
              <button
                type="button"
                disabled={busyRevise}
                onClick={() => handleRevise("rejected")}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                {busyRevise ? "…" : "Changer en rejeté"}
              </button>
            ) : (
              <button
                type="button"
                disabled={busyRevise}
                onClick={() => handleRevise("validated")}
                className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-600 transition hover:bg-green-50 disabled:opacity-50 dark:border-green-500/40 dark:text-green-400 dark:hover:bg-green-500/10"
              >
                {busyRevise ? "…" : "Changer en validé"}
              </button>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
      ) : error && !data ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </p>
        </div>
      ) : data ? (
        <>
          {/* 1. Safety guard */}
          <SafetyBanner safety={data.safety} />

          {/* 2. Priorité + confiance */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Priorité
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-sm font-semibold capitalize ${
                    PRIORITY_STYLES[data.priority.level] ?? PRIORITY_STYLES.normal
                  }`}
                >
                  {data.priority.level}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {data.priority.score}/100
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Confiance
              </p>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {data.confidence.score}%
                </span>
                <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
                  ({data.confidence.level})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.confidence.sources_used.map((source) => (
                  <span
                    key={source}
                    className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                  >
                    ✓ {sourceLabel(source)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Fiche maladie */}
          <div className="rounded-xl border border-gray-100 p-4 dark:border-white/[0.06]">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {data.knowledge.disease_fr}
              </h4>
              {data.knowledge.severity && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    SEVERITY_STYLES[data.knowledge.severity] ?? SEVERITY_STYLES.none
                  }`}
                >
                  {data.knowledge.severity}
                </span>
              )}
            </div>

            {data.knowledge.symptoms.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Symptômes
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-sm text-gray-600 dark:text-gray-300">
                  {data.knowledge.symptoms.map((symptom) => (
                    <li key={symptom}>{symptom}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-3 grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-3">
              <p>
                <span className="font-medium text-gray-800 dark:text-white/90">Chimique : </span>
                {data.knowledge.treatment.chemical ?? "—"}
              </p>
              <p>
                <span className="font-medium text-gray-800 dark:text-white/90">Biologique : </span>
                {data.knowledge.treatment.biological ?? "—"}
              </p>
              <p>
                <span className="font-medium text-gray-800 dark:text-white/90">Organique : </span>
                {data.knowledge.treatment.organic ?? "—"}
              </p>
            </div>

            {data.knowledge.prevention.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Prévention
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-sm text-gray-600 dark:text-gray-300">
                  {data.knowledge.prevention.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.knowledge.warnings.length > 0 && (
              <div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                {data.knowledge.warnings.map((warning) => (
                  <p key={warning}>⚠️ {warning}</p>
                ))}
              </div>
            )}
          </div>

          {/* 4. Brouillon de réponse */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Brouillon de réponse
            </p>
            <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
              {data.draft.subject}
            </p>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={9}
              disabled={busy}
              className="w-full rounded-lg border border-gray-300 bg-transparent p-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
              {error}
            </p>
          )}

          {/* 5. Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAction("validate")}
              disabled={busy}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {busyAction === "validate" ? "Envoi…" : "✓ Valider + Envoyer"}
            </button>

            {isDirty && (
              <button
                type="button"
                onClick={() => handleAction("edit")}
                disabled={busy}
                className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:opacity-50 dark:border-brand-500/40 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                {busyAction === "edit" ? "Envoi…" : "✏️ Envoyer la version modifiée"}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleAction("reject")}
              disabled={busy}
              className="ml-auto rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              {busyAction === "reject" ? "…" : "❌ Rejeter"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
