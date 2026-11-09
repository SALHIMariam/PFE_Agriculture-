import { useEffect } from "react";
import styles from "../FarmerDashboard.module.css";
import { formatLastUpdated, useNewsData } from "../../News/useNewsData";
import type { NewsCategory } from "../../../services/newsService";

const CATEGORY_TAGS: Record<NewsCategory, { label: string; tone: "alert" | "research" | "info" }> = {
  alert: { label: "⚠ Alerte", tone: "alert" },
  new_disease: { label: "Nouvelle maladie", tone: "research" },
  new_treatment: { label: "Traitement", tone: "research" },
  trend: { label: "Tendance", tone: "research" },
  info: { label: "Info", tone: "info" },
};

const CATEGORY_FILTERS: { value: NewsCategory | ""; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "alert", label: "Alertes" },
  { value: "new_disease", label: "Maladies" },
  { value: "new_treatment", label: "Traitements" },
  { value: "trend", label: "Tendances" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function NewsSection() {
  const { filters, setFilters, items, page, setPage, lastPage, loading, lastUpdated } = useNewsData();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles["section-eye"]}>Résumé automatique</div>
      <h2 className={styles["section-title"]}>Actualités <em>agricoles</em></h2>

      <div className={styles["news-filters"]}>
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            className={`${styles["news-filter-btn"]} ${filters.category === f.value ? styles.active : ""}`}
            onClick={() => setFilters({ ...filters, category: f.value })}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-right text-xs text-gray-400">🔄 Dernière mise à jour : {formatLastUpdated(lastUpdated)}</p>

      {loading && items.length === 0 ? (
        <div className={styles["news-empty"]}>Chargement des actualités…</div>
      ) : items.length === 0 ? (
        <div className={styles["news-empty"]}>Aucune actualité pour ces filtres.</div>
      ) : (
        <div className={styles["news-grid"]}>
          {items.map((item) => {
            const tag = CATEGORY_TAGS[item.category];
            return (
              <div
                key={item.id}
                className={`${styles["news-card"]} ${tag.tone === "alert" ? styles.important : ""}`}
              >
                <div className={`${styles["news-img"]} ${tag.tone === "research" ? styles.mid : tag.tone === "alert" ? styles.gold : ""}`} />
                <div className={styles["news-body"]}>
                  <div className={`${styles["news-tag"]} ${styles[tag.tone]}`}>{tag.label}</div>
                  <div className={styles["news-title"]}>{item.title}</div>
                  <div className={styles["news-date"]}>
                    {item.source_name}
                    {item.published_at ? ` · ${formatDate(item.published_at)}` : ""}
                  </div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles["news-btn"]}>
                    Lire la suite →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastPage > 1 && (
        <div className={styles["news-pagination"]}>
          <button
            type="button"
            className={styles["news-btn"]}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            ← Précédent
          </button>
          <span className={styles["news-date"]}>Page {page} / {lastPage}</span>
          <button
            type="button"
            className={styles["news-btn"]}
            disabled={page >= lastPage}
            onClick={() => setPage(page + 1)}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
