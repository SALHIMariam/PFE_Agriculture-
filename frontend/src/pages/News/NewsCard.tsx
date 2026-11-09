import type { NewsItem } from "../../services/newsService";
import CategoryBadge from "./CategoryBadge";
import { cropLabel } from "../../data/crops";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <CategoryBadge category={item.category} />
        {item.crop && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300">
            {cropLabel(item.crop)}
          </span>
        )}
      </div>

      <h3 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">{item.title}</h3>
      <p className="mb-3 flex-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{item.summary}</p>

      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>{item.source_name}{item.published_at ? ` · ${formatDate(item.published_at)}` : ""}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          Source →
        </a>
      </div>
    </div>
  );
}
