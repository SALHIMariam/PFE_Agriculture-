import { AnimatePresence, motion } from "framer-motion";
import { X, TrendingUp, TrendingDown, MapPin, CheckCircle2 } from "lucide-react";
import type { GovernorateSummary } from "../../../services/heatmapService";
import { ZONE_LABELS, type ClimateZone } from "../data/governorates";
import { useCountUp } from "../useCountUp";

type Props = {
  governorate: string | null;
  summary: GovernorateSummary | null;
  loading: boolean;
  onClose: () => void;
};

const RISK_STYLES: Record<string, string> = {
  Sain: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Faible: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  Modéré: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Élevé: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  Critique: "bg-red-200 text-red-800 dark:bg-red-500/25 dark:text-red-300",
};

const DISEASE_BAR_COLORS = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-rose-500", "bg-pink-500", "bg-fuchsia-500"];

function diseaseBarColor(name: string, index: number): string {
  if (name.toLowerCase().includes("healthy")) return "bg-emerald-500";
  return DISEASE_BAR_COLORS[index % DISEASE_BAR_COLORS.length];
}

function HealthRing({ score }: { score: number }) {
  const animated = useCountUp(score);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;
  const color = score >= 70 ? "#16a34a" : score >= 40 ? "#f59e0b" : "#dc2626";

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-white/10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{animated}</span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">/100</span>
      </div>
    </div>
  );
}

export default function GovernoratePanel({ governorate, summary, loading, onClose }: Props) {
  const detections = useCountUp(summary?.detections ?? 0);

  return (
    <AnimatePresence>
      {governorate && (
        <motion.div
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="pointer-events-auto absolute right-0 top-0 z-[1100] h-full w-full max-w-sm overflow-y-auto border-l border-white/40 bg-white/85 p-5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/90"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>

          {loading || !summary ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">Chargement…</div>
          ) : (
            <div className="space-y-6 pr-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <MapPin size={13} />
                  {ZONE_LABELS[summary.climate_zone as ClimateZone]}
                </div>
                <h2 className="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">{summary.name}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK_STYLES[summary.risk_level]}`}>
                    Risque {summary.risk_level}
                  </span>
                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      summary.trend_pct >= 0
                        ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                        : "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                    }`}
                  >
                    {summary.trend_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {summary.trend_pct >= 0 ? "+" : ""}
                    {summary.trend_pct}%
                  </span>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-gray-800 dark:text-gray-100">
                  {detections}
                  <span className="ml-1 text-sm font-medium text-gray-400">détections</span>
                </div>
              </div>

              {/* Health score ring */}
              <div className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Score de santé des cultures
                  </div>
                  <p className="mt-1 max-w-[130px] text-[11px] text-gray-500 dark:text-gray-400">
                    Basé sur la part d'analyses saines vs malades
                  </p>
                </div>
                <HealthRing score={summary.health_score} />
              </div>

              {/* Crops */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">🌾 Cultures principales</h3>
                <div className="grid grid-cols-2 gap-2">
                  {summary.crops.slice(0, 6).map((crop) => (
                    <div
                      key={crop.name}
                      className="rounded-xl border border-white/50 bg-white/60 p-3 text-center shadow-sm dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="text-xl">{crop.emoji}</div>
                      <div className="mt-1 text-xs font-semibold text-gray-700 dark:text-gray-200">{crop.name}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">{crop.analyses} analyses</div>
                      <div className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Santé {crop.health}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diseases */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">🦠 Maladies les plus fréquentes</h3>
                <div className="space-y-2">
                  {summary.diseases.slice(0, 6).map((disease, i) => (
                    <div key={disease.name}>
                      <div className="mb-0.5 flex justify-between text-[11px] font-medium text-gray-600 dark:text-gray-300">
                        <span>{disease.name}</span>
                        <span>{disease.pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${disease.pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                          className={`h-full rounded-full ${diseaseBarColor(disease.name, i)}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">✅ Top recommandations</h3>
                <ul className="space-y-1.5">
                  {summary.recommendations.map((rec) => (
                    <li key={rec} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
