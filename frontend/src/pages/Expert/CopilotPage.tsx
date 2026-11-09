import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { TUNISIAN_GOVERNORATES } from "../../components/profile/constants";
import type { Analysis, PaginatedAnalyses } from "../../services/analysisService";
import {
  getQueue,
  getStats,
  type CopilotQueueSort,
  type CopilotQueueStatus,
  type CopilotStats,
  type PriorityLevel,
} from "../../services/copilotService";
import CopilotDetailPanel from "./components/CopilotDetailPanel";
import { PRIORITY_LABELS, labelOf } from "../../utils/labels";
import { formatDiseaseLabel } from "../../data/diseaseLabels";

type Toast = { message: string; kind: "success" | "error" } | null;

const SORT_OPTIONS: { value: CopilotQueueSort; label: string }[] = [
  { value: "priority", label: "Par priorité" },
  { value: "recent", label: "Plus récentes" },
];

const SEVERITY_OPTIONS: { value: PriorityLevel | ""; label: string }[] = [
  { value: "", label: "Toutes les priorités" },
  { value: "urgent", label: "🔴 Urgent" },
  { value: "important", label: "🟠 Important" },
  { value: "normal", label: "🟢 Normal" },
];

const STATUS_LABELS: Record<CopilotQueueStatus, string> = {
  pending: "En attente",
  validated: "Validées telles quelles",
  edited: "Éditées par l'expert",
  rejected: "Rejetées",
  all: "Toutes les préparées",
};

/**
 * Page Assistant AI — file d'attente + statistiques d'acceptation
 * (/api/copilot/queue, /api/copilot/stats), et panneau de détail
 * (/api/copilot/prepare/{id}, /api/copilot/{id}/respond) ouvert au clic sur
 * une analyse.
 */
export default function CopilotPage() {
  const [queue, setQueue] = useState<Analysis[]>([]);
  const [queueMeta, setQueueMeta] = useState<PaginatedAnalyses["meta"] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState<CopilotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<CopilotQueueSort>("priority");

  // La recherche texte est pilotée par la barre globale du header (AppHeader
  // détourne "Search or type command..." vers ?search= sur cette page, avec
  // son propre debounce de 300ms) — pas de champ dédié ici.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = (searchParams.get("search") ?? "").trim();
  const [governorateFilter, setGovernorateFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<PriorityLevel | "">("");
  const [statusFilter, setStatusFilter] = useState<CopilotQueueStatus>("pending");

  const hasActiveFilters = !!search || !!governorateFilter || !!severityFilter;
  const resetFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("search");
        return next;
      },
      { replace: true },
    );
    setGovernorateFilter("");
    setSeverityFilter("");
  }, [setSearchParams]);

  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string, kind: "success" | "error") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const isFirstLoad = useRef(true);

  const loadQueueAndStats = useCallback(() => {
    if (isFirstLoad.current) setLoading(true);
    setError(null);
    setQueue([]);
    setQueueMeta(null);
    return Promise.all([
      getQueue({
        page: 1,
        sort: sortMode,
        search: search || undefined,
        governorate: governorateFilter || undefined,
        severity: severityFilter || undefined,
        status: statusFilter,
      }),
      getStats(),
    ])
      .then(([queueRes, statsRes]) => {
        setQueue(queueRes.data);
        setQueueMeta(queueRes.meta);
        setStats(statsRes);
      })
      .catch(() => {
        setError("Impossible de charger la file de l'Assistant AI.");
      })
      .finally(() => {
        isFirstLoad.current = false;
        setLoading(false);
      });
  }, [sortMode, search, governorateFilter, severityFilter, statusFilter]);

  useEffect(() => {
    loadQueueAndStats();
  }, [loadQueueAndStats]);

  const hasMore = !!queueMeta && queueMeta.current_page < queueMeta.last_page;

  function loadMore() {
    if (!queueMeta || loadingMore || !hasMore) return;
    setLoadingMore(true);
    getQueue({
      page: queueMeta.current_page + 1,
      sort: sortMode,
      search: search || undefined,
      governorate: governorateFilter || undefined,
      severity: severityFilter || undefined,
      status: statusFilter,
    })
      .then((res) => {
        setQueue((prev) => [...prev, ...res.data]);
        setQueueMeta(res.meta);
      })
      .catch(() => {
        notify("Impossible de charger la suite de la file.", "error");
      })
      .finally(() => {
        setLoadingMore(false);
      });
  }

  // Défilement infini : charge la page suivante quand on approche du bas
  // de la liste, plutôt qu'un bouton « Charger plus ».
  function handleListScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      loadMore();
    }
  }

  const selectedAnalysis = queue.find((a) => a.id === selectedId) ?? null;

  // Une fois l'analyse traitée (validée / éditée / rejetée) : la retirer de
  // la file affichée et rafraîchir les stats, sans tout recharger.
  const handleResolved = useCallback(
    (analysisId: number) => {
      setQueue((prev) => prev.filter((a) => a.id !== analysisId));
      setSelectedId(null);
      getStats()
        .then(setStats)
        .catch(() => {
          /* les stats se rafraîchiront au prochain chargement de page */
        });
    },
    [],
  );

  return (
    <>
      <PageMeta
        title="Assistant AI | AgriNova"
        description="File d'attente et statistiques de l'Assistant AI"
      />
      <PageBreadcrumb pageTitle="Assistant AI" />

      {/* Filtres (la recherche texte se fait via la barre du header) */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={governorateFilter}
          onChange={(e) => setGovernorateFilter(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 sm:w-auto dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="">Tous les gouvernorats</option>
          {TUNISIAN_GOVERNORATES.map((gov) => (
            <option key={gov} value={gov}>
              {gov}
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as PriorityLevel | "")}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 sm:w-auto dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          🤖 Assistant AI
        </h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Brouillons de réponse générés par l'IA pour les analyses en attente, classés par
          priorité.
        </p>

        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
        ) : error ? (
          <p className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {stats && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: "Préparées", value: stats.total_prepared, key: "all" as const },
                  { label: "Validées telles quelles", value: stats.validated_directly, key: "validated" as const },
                  { label: "Éditées", value: stats.edited_by_expert, key: "edited" as const },
                  { label: "Rejetées", value: stats.rejected, key: "rejected" as const },
                  { label: "En attente", value: stats.pending, key: "pending" as const },
                ].map((tile) => (
                  <button
                    key={tile.key}
                    type="button"
                    onClick={() => setStatusFilter(tile.key)}
                    className={`rounded-xl px-3 py-2 text-left transition ${
                      statusFilter === tile.key
                        ? "bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/10"
                        : "bg-gray-50 hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="text-base font-semibold text-gray-800 dark:text-white/90">
                      {tile.value}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {tile.label}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-5">
                <div className="mb-2 flex gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSortMode(opt.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        sortMode === opt.value
                          ? "bg-brand-500 text-white"
                          : "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {STATUS_LABELS[statusFilter] ?? "File d'attente"} ({queueMeta?.total ?? queue.length})
                </p>
                {queue.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aucune analyse dans cette catégorie.
                  </p>
                ) : (
                  <div
                    onScroll={handleListScroll}
                    className="custom-scrollbar flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-1"
                  >
                    <ul className="flex flex-col gap-2">
                      {queue.map((analysis) => (
                        <li key={analysis.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(analysis.id)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-500/5 ${
                              analysis.id === selectedId
                                ? "border-brand-400 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10"
                                : "border-gray-100 dark:border-white/[0.06]"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                                {analysis.predicted_class ? formatDiseaseLabel(analysis.predicted_class) : "—"}
                              </p>
                              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                Farmer : {analysis.farmer_name ?? "—"}
                                {analysis.draft_response
                                  ? " · brouillon prêt"
                                  : " · pas encore préparée"}
                              </p>
                            </div>
                            {analysis.priority_level && (
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                  analysis.priority_level === "urgent"
                                    ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                                    : analysis.priority_level === "important"
                                      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
                                      : "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                                }`}
                              >
                                {labelOf(PRIORITY_LABELS, analysis.priority_level)}
                                {analysis.priority_score != null ? ` · ${analysis.priority_score}` : ""}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {loadingMore && (
                      <p className="py-2 text-center text-xs text-gray-400 dark:text-gray-500">
                        Chargement…
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="lg:col-span-7">
                {selectedAnalysis ? (
                  <CopilotDetailPanel
                    key={selectedAnalysis.id}
                    analysis={selectedAnalysis}
                    onClose={() => setSelectedId(null)}
                    onResolved={handleResolved}
                    notify={notify}
                  />
                ) : (
                  <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400">
                    Sélectionnez une analyse pour voir le brouillon Copilot.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[99999] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.kind === "success" ? "bg-success-500" : "bg-error-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
