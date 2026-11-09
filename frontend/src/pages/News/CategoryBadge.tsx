import type { NewsCategory } from "../../services/newsService";

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  new_disease: "Nouvelle maladie",
  new_treatment: "Nouveau traitement",
  trend: "Tendance",
  alert: "Alerte",
  info: "Info",
};

const CATEGORY_STYLES: Record<NewsCategory, string> = {
  new_disease: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  new_treatment: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  trend: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  alert: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  info: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
};

export default function CategoryBadge({ category }: { category: NewsCategory }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[category]}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
