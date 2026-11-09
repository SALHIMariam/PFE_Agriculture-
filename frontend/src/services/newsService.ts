import api from "../api/client";

export type NewsCategory = "new_disease" | "new_treatment" | "trend" | "alert" | "info";

export type NewsItem = {
  id: number;
  title: string;
  summary: string;
  source_name: string;
  url: string;
  image_url: string | null;
  category: NewsCategory;
  crop: string | null;
  disease_class: string | null;
  relevance_score: number;
  ai_generated: boolean;
  published_at: string | null;
  created_at: string | null;
};

export type NewsFilters = {
  crop?: string;
  disease?: string;
  category?: NewsCategory;
  search?: string;
  page?: number;
  per_page?: number;
};

export type NewsPage = {
  data: NewsItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  last_updated: string | null;
};

export type TrendingCrop = { crop: string; count: number };
export type TrendingCategory = { category: NewsCategory; count: number };

export type Trending = {
  crops: TrendingCrop[];
  categories: TrendingCategory[];
};

function toParams(filters: NewsFilters) {
  return {
    crop: filters.crop || undefined,
    disease: filters.disease || undefined,
    category: filters.category || undefined,
    search: filters.search || undefined,
    page: filters.page || undefined,
    per_page: filters.per_page || undefined,
  };
}

export async function getNews(filters: NewsFilters = {}): Promise<NewsPage> {
  const response = await api.get("/api/news", { params: toParams(filters) });
  return response.data as NewsPage;
}

export async function getNewsTrending(): Promise<Trending> {
  const response = await api.get("/api/news/trending");
  return response.data as Trending;
}
