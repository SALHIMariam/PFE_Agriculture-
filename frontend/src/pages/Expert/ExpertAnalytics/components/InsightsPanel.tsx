import { Insight, InsightSeverity } from "../services/expertIntelligenceService";

type Props = { data: Insight[]; loading: boolean };

const SEVERITY_STYLES: Record<InsightSeverity, string> = {
  critical: "border-error-200 bg-error-50 dark:border-error-500/30 dark:bg-error-500/10",
  warning: "border-warning-200 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/10",
  info: "border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10",
};

const SEVERITY_TEXT: Record<InsightSeverity, string> = {
  critical: "text-error-700 dark:text-error-400",
  warning: "text-warning-700 dark:text-warning-400",
  info: "text-brand-700 dark:text-brand-400",
};

const SEVERITY_ICON: Record<InsightSeverity, string> = {
  critical: "⚠",
  warning: "⚠",
  info: "ℹ",
};

export default function InsightsPanel({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-white/[0.03]">
        Aucune observation notable sur la période sélectionnée.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
        Alertes générées automatiquement à partir des widgets ci-dessous (surconfiance, maladies faibles, cas urgents,
        calibration, fine-tuning) — chaque carte explique le problème détecté et la recommandation associée.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((insight, index) => (
          <div key={index} className={`rounded-xl border p-4 ${SEVERITY_STYLES[insight.severity]}`}>
            <div className="flex items-start gap-2">
              <span className={`text-base leading-none ${SEVERITY_TEXT[insight.severity]}`}>{SEVERITY_ICON[insight.severity]}</span>
              <div className="min-w-0">
                <h4 className={`text-sm font-semibold ${SEVERITY_TEXT[insight.severity]}`}>{insight.title}</h4>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{insight.message}</p>
                <p className="mt-2 text-[11px] italic text-gray-500 dark:text-gray-400">{insight.recommendation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
