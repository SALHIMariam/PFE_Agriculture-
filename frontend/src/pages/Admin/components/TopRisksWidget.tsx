import { useEffect, useState } from "react";
import { getAdminRiskTop, type TopRiskEntry } from "../../../services/riskService";
import { formatDiseaseLabel } from "../../../data/diseaseLabels";

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

function levelBadgeClass(level: string): string {
  switch (level) {
    case "low":
      return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400";
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
    case "high":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400";
    default:
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
  }
}


export default function TopRisksWidget() {
  const [risks, setRisks] = useState<TopRiskEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminRiskTop()
      .then((res) => {
        if (!cancelled) setRisks(res.available ? res.risks : []);
      })
      .catch(() => {
        if (!cancelled) setRisks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        🦠 Top 5 des zones à risque (7 prochains jours)
      </h2>

      {loading && <div className="py-6 text-center text-sm text-gray-400">Chargement…</div>}

      {!loading && risks.length === 0 && (
        <div className="py-6 text-center text-sm text-gray-400">Pas encore assez de données pour établir un classement.</div>
      )}

      {!loading && risks.length > 0 && (
        <ul className="flex flex-col gap-2">
          {risks.map((risk, index) => (
            <li key={`${risk.disease}-${risk.governorate}`} className="relative">
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 dark:border-white/[0.05]">
                <span className="text-lg">{MEDALS[index] ?? index + 1}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {risk.governorate} · {formatDiseaseLabel(risk.disease)}
                  </div>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${levelBadgeClass(risk.risk_level)}`}>
                  {risk.risk_score}%
                </span>
                <button
                  type="button"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Voir pourquoi
                </button>
              </div>

              {openIndex === index && (
                <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Facteurs déterminants</div>
                  {risk.top_factors.length === 0 && <div className="text-xs text-gray-400">Aucun facteur disponible.</div>}
                  <ul className="flex flex-col gap-1.5">
                    {risk.top_factors.map((factor) => (
                      <li key={factor.factor} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-300">{factor.factor}</span>
                        <span className={factor.contribution >= 0 ? "font-semibold text-red-600" : "font-semibold text-green-600"}>
                          {factor.contribution >= 0 ? "+" : ""}
                          {factor.contribution}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
