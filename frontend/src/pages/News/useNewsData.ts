import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getNews,
  getNewsTrending,
  type NewsCategory,
  type NewsItem,
  type Trending,
} from "../../services/newsService";

export type NewsFiltersState = {
  crop: string;
  disease: string;
  category: NewsCategory | "";
  search: string;
};

export const DEFAULT_NEWS_FILTERS: NewsFiltersState = {
  crop: "",
  disease: "",
  category: "",
  search: "",
};

export function formatLastUpdated(iso: string | null): string {
  if (!iso) return "Aucune donnée disponible";
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMinutes < 1) return "il y a quelques secondes";
  if (diffMinutes < 60) return `il y a ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
  const diffHours = Math.round(diffMinutes / 60);
  return `il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
}

export function useNewsData() {
  const [filters, setFilters] = useState<NewsFiltersState>(DEFAULT_NEWS_FILTERS);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState<Trending>({ crops: [], categories: [] });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const apiFilters = useMemo(
    () => ({
      crop: filters.crop || undefined,
      disease: filters.disease || undefined,
      category: filters.category || undefined,
      search: filters.search || undefined,
      page,
      per_page: 9,
    }),
    [filters, page]
  );

  const reload = useCallback(() => {
    setLoading(true);
    getNews(apiFilters)
      .then((result) => {
        setItems(result.data);
        setLastPage(result.meta.last_page);
        setTotal(result.meta.total);
        setLastUpdated(result.last_updated);
      })
      .finally(() => setLoading(false));
  }, [apiFilters]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    const timeout = setTimeout(reload, 250);
    return () => clearTimeout(timeout);
  }, [reload]);

  useEffect(() => {
    getNewsTrending().then(setTrending).catch(() => {});
  }, []);

  return {
    filters,
    setFilters,
    items,
    page,
    setPage,
    lastPage,
    total,
    loading,
    trending,
    lastUpdated,
  };
}
