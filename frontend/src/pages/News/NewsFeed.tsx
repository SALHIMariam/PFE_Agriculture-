import NewsCard from "./NewsCard";
import NewsFilterPanel from "./NewsFilterPanel";
import { formatLastUpdated, useNewsData } from "./useNewsData";

export default function NewsFeed() {
  const { filters, setFilters, items, page, setPage, lastPage, total, loading, lastUpdated } = useNewsData();

  return (
    <div className="flex flex-col gap-4">
      <NewsFilterPanel filters={filters} onChange={setFilters} />

      <p className="text-right text-xs text-gray-400 dark:text-gray-500">
        🔄 Dernière mise à jour : {formatLastUpdated(lastUpdated)}
      </p>

      {loading && items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 dark:border-white/[0.05] dark:bg-white/[0.03]">
          Chargement des actualités…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 dark:border-white/[0.05] dark:bg-white/[0.03]">
          Aucune actualité ne correspond à ces filtres.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Page {page} sur {lastPage} · {total} actualité{total > 1 ? "s" : ""}
          </span>
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
  );
}
