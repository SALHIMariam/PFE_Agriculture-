import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { getDiseaseLabel } from "../../data/diseaseLabels";
import {
  getAdminAnalyses,
  type AdminAnalysisFilters,
  type Analysis,
  type ValidationStatus,
} from "../../services/analysisService";
import { reviseAnalysis } from "../../services/copilotService";
import TopRisksWidget from "./components/TopRisksWidget";

const FILTERS: { label: string; value: ValidationStatus | "all" }[] = [
  { label: "Toutes", value: "all" },
  { label: "En attente", value: "pending" },
  { label: "Validées", value: "validated" },
  { label: "Rejetées", value: "rejected" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function validationBadgeClass(status: ValidationStatus): string {
  if (status === "validated") {
    return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400";
  }
  if (status === "rejected") {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
  }
  return "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300";
}

function validationLabel(status: ValidationStatus): string {
  if (status === "validated") return "Validée";
  if (status === "rejected") return "Rejetée";
  return "En attente";
}

/** Surligne en vert AgriNova la portion de `text` correspondant à `query`. */
function highlight(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q || !text) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: "rgba(64,145,108,0.2)",
          color: "#1b4332",
          borderRadius: 3,
          padding: "0 2px",
        }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

const fieldClass =
  "rounded-xl border-[1.5px] border-[rgba(27,67,50,0.14)] bg-white px-3.5 py-2 text-[13.5px] text-gray-700 outline-none transition focus:border-[#40916c] focus:shadow-[0_0_0_3px_rgba(64,145,108,0.14)] dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-200";

// Label de filtre — même style que les labels de la page Profil.
const filterLabelClass =
  "mb-1 text-[11px] font-extrabold uppercase tracking-[1px] text-[#6b8c6c]";

/** Champ date natif — valeur au format YYYY-MM-DD (compatible API). */
function DateField({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="date"
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldClass} w-[150px]`}
    />
  );
}

export default function AnalysesOverview() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<ValidationStatus | "all">("all");
  const [refreshToken, setRefreshToken] = useState(0);
  const [revisingId, setRevisingId] = useState<number | null>(null);

  // ── Recherche avancée ──
  // Le diagnostic vient de la barre du header, propagé via ?search=.
  const [searchParams, setSearchParams] = useSearchParams();
  const diagSearch = (searchParams.get("search") ?? "").trim();

  const [farmerSearch, setFarmerSearch] = useState("");
  const [debouncedFarmer, setDebouncedFarmer] = useState("");
  const [confMin, setConfMin] = useState<number | "">("");
  const [confMax, setConfMax] = useState<number | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const confError = confMin !== "" && confMax !== "" && Number(confMin) > Number(confMax);
  const dateError = !!dateFrom && !!dateTo && dateFrom > dateTo;

  const hasActiveFilters =
    diagSearch !== "" ||
    debouncedFarmer !== "" ||
    confMin !== "" ||
    confMax !== "" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    filter !== "all";

  // Debounce 300ms sur le champ farmer.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFarmer(farmerSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [farmerSearch]);

  const currentFilters: AdminAnalysisFilters = useMemo(
    () => ({
      search: diagSearch,
      farmer: debouncedFarmer,
      confidence_min: confMin !== "" ? Number(confMin) : undefined,
      confidence_max: confMax !== "" ? Number(confMax) : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      status: filter === "all" ? "" : filter,
    }),
    [diagSearch, debouncedFarmer, confMin, confMax, dateFrom, dateTo, filter]
  );

  // Retour page 1 quand un filtre change.
  useEffect(() => {
    setPage(1);
  }, [currentFilters]);

  // Fetch principal — filtres + pagination.
  useEffect(() => {
    if (confError || dateError) return;
    let cancelled = false;
    setSearching(true);
    setError(null);

    getAdminAnalyses({ ...currentFilters, page })
      .then((result) => {
        if (cancelled) return;
        setAnalyses(result.data);
        setLastPage(result.meta.last_page);
        setTotal(result.meta.total);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger les analyses.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentFilters, page, confError, dateError, refreshToken]);

  async function handleRevise(analysis: Analysis, newStatus: "validated" | "rejected") {
    const promptText =
      newStatus === "rejected"
        ? "Raison du changement en rejet :"
        : "Commentaire pour le farmer (optionnel) :";
    const input = window.prompt(promptText);
    if (input === null) return; // Annulé

    setRevisingId(analysis.id);
    try {
      await reviseAnalysis(analysis.id, newStatus, input || undefined);
      setRefreshToken((t) => t + 1);
    } catch {
      setError("Erreur lors de la modification du verdict.");
    } finally {
      setRevisingId(null);
    }
  }

  function resetFilters() {
    setFarmerSearch("");
    setDebouncedFarmer("");
    setConfMin("");
    setConfMax("");
    setDateFrom("");
    setDateTo("");
    setFilter("all");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("search");
        return next;
      },
      { replace: true }
    );
  }

  return (
    <>
      <PageMeta
        title="Analyses | Elastic Solutions Admin"
        description="Vue d'ensemble de toutes les analyses et de leur statut de validation experte"
      />
      <PageBreadcrumb pageTitle="Analyses" />

      <TopRisksWidget />

      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Toutes les analyses</h2>
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
        </div>

        {/* ── Filtres avancés (le diagnostic vient de la barre du header) ── */}
        <div className="mb-5 rounded-xl border border-[rgba(27,67,50,0.12)] bg-[#f7faf7] p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
          {diagSearch && (
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Diagnostic recherché :{" "}
              <span className="font-semibold text-[#1b4332] dark:text-[#b7e4c7]">« {diagSearch} »</span>
            </p>
          )}

          <div className="flex flex-wrap items-start gap-4">
            <div className="flex flex-col">
              <span className={filterLabelClass}>Farmer</span>
              <input
                type="text"
                value={farmerSearch}
                onChange={(e) => setFarmerSearch(e.target.value)}
                placeholder="Rechercher un farmer..."
                className={`${fieldClass} w-[220px]`}
              />
            </div>

            <div className="flex flex-col">
              <span className={filterLabelClass}>Confiance</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={confMin}
                  onChange={(e) => setConfMin(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Min"
                  className={`${fieldClass} w-[80px] ${confError ? "!border-red-400" : ""}`}
                />
                <span className="text-gray-400">%</span>
                <span className="text-gray-300">–</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={confMax}
                  onChange={(e) => setConfMax(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Max"
                  className={`${fieldClass} w-[80px] ${confError ? "!border-red-400" : ""}`}
                />
                <span className="text-gray-400">%</span>
              </div>
              {confError && (
                <span className="mt-1 text-[11px] font-semibold text-red-500">Min doit être ≤ Max</span>
              )}
            </div>

            <div className="flex flex-col">
              <span className={filterLabelClass}>Date</span>
              <div className="flex items-center gap-2">
                <DateField value={dateFrom} onChange={setDateFrom} ariaLabel="Date de début" />
                <span className="text-gray-300">–</span>
                <DateField value={dateTo} onChange={setDateTo} ariaLabel="Date de fin" />
              </div>
              {dateError && (
                <span className="mt-1 text-[11px] font-semibold text-red-500">
                  La date « Du » doit précéder la date « Au »
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 rounded-[20px] bg-[rgba(64,145,108,0.12)] px-3 py-1 text-xs font-bold text-[#1b4332] dark:bg-[#40916c]/20 dark:text-[#b7e4c7]">
              {total} analyse{total !== 1 ? "s" : ""} trouvée{total !== 1 ? "s" : ""}
              {searching && (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
                </svg>
              )}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-[#40916c] px-3 py-1.5 text-[12px] font-semibold text-[#40916c] transition hover:bg-[rgba(64,145,108,0.1)] dark:border-[#52b788] dark:text-[#74c69d]"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {!error && loading && analyses.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">Chargement des analyses…</div>
        )}

        {!error && !loading && analyses.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">
            {diagSearch
              ? `Aucune analyse trouvée pour « ${diagSearch} ».`
              : hasActiveFilters
              ? "Aucune analyse ne correspond aux filtres sélectionnés."
              : "Aucune analyse pour ce filtre."}
          </div>
        )}

        {analyses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400 dark:border-white/[0.05]">
                  <th className="px-3 py-2 font-medium">Diagnostic</th>
                  <th className="px-3 py-2 font-medium">Farmer</th>
                  <th className="px-3 py-2 font-medium">Confiance</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">Expert</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((analysis) => {
                  const label = getDiseaseLabel(analysis.predicted_class);
                  const diagnosticText = `${label.crop} — ${label.disease}`;
                  const confidence = analysis.confidence != null ? `${Math.round(analysis.confidence * 100)}%` : "—";

                  return (
                    <tr
                      key={analysis.id}
                      className="border-b border-gray-50 text-sm text-gray-600 last:border-0 dark:border-white/[0.03] dark:text-gray-300"
                    >
                      <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">
                        <span className="inline-flex items-center gap-2">
                          <span>{highlight(diagnosticText, diagSearch)}</span>
                          {!!analysis.messages_count && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              💬 {analysis.messages_count}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {analysis.farmer_name || "—"}
                        {analysis.farmer_governorate && (
                          <span className="text-gray-400"> · {analysis.farmer_governorate}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">{confidence}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${validationBadgeClass(
                            analysis.validation_status
                          )}`}
                        >
                          {validationLabel(analysis.validation_status)}
                        </span>
                      </td>
                      <td className="px-3 py-3">{analysis.expert_name || "—"}</td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{formatDate(analysis.created_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {analysis.validation_status === "validated" && (
                            <button
                              type="button"
                              disabled={revisingId === analysis.id}
                              onClick={() => handleRevise(analysis, "rejected")}
                              className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                            >
                              {revisingId === analysis.id ? "…" : "Changer en rejeté"}
                            </button>
                          )}
                          {analysis.validation_status === "rejected" && (
                            <button
                              type="button"
                              disabled={revisingId === analysis.id}
                              onClick={() => handleRevise(analysis, "validated")}
                              className="rounded-lg border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                            >
                              {revisingId === analysis.id ? "…" : "Changer en validé"}
                            </button>
                          )}
                          <Link
                            to={`/dashboard/analyses/${analysis.id}`}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          >
                            Voir le détail →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {lastPage > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Page {page} sur {lastPage}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
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
