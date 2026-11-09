import type { Trending } from "../../services/newsService";
import { cropLabel } from "../../data/crops";

const CATEGORY_LABELS: Record<string, string> = {
  new_disease: "nouvelles maladies",
  new_treatment: "nouveaux traitements",
  trend: "tendances",
  alert: "alertes",
  info: "informations générales",
};

function buildInsights(trending: Trending): string[] {
  const insights: string[] = [];

  const topCrop = trending.crops[0];
  if (topCrop) {
    insights.push(
      `${cropLabel(topCrop.crop)} est la culture la plus évoquée dans l'actualité récente, avec ${topCrop.count} article${topCrop.count > 1 ? "s" : ""} sur les 30 derniers jours.`
    );
  }

  const topCategory = [...trending.categories].sort((a, b) => b.count - a.count)[0];
  if (topCategory && topCategory.count > 0) {
    insights.push(
      `La majorité des publications récentes concernent des ${CATEGORY_LABELS[topCategory.category] ?? topCategory.category}.`
    );
  }

  const alertCount = trending.categories.find((c) => c.category === "alert")?.count ?? 0;
  if (alertCount > 0) {
    insights.push(`${alertCount} alerte${alertCount > 1 ? "s" : ""} active${alertCount > 1 ? "s" : ""} nécessite${alertCount > 1 ? "nt" : ""} votre attention.`);
  }

  if (insights.length === 0) {
    insights.push("Pas encore assez de données pour générer une analyse.");
  }

  return insights;
}

export default function AiInsightCard({ trending }: { trending: Trending }) {
  const insights = buildInsights(trending);

  return (
    <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 to-white p-4 shadow-sm dark:border-emerald-500/20 dark:from-emerald-900/40 dark:to-gray-900/70">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.95-6.95l-2.12 2.12M8.17 15.83l-2.12 2.12m0-11.9l2.12 2.12m9.71 9.66l-2.12-2.12" />
        </svg>
        Synthèse de l’actualité
      </div>
      <ul className="space-y-2">
        {insights.map((text, i) => (
          <li key={i} className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
