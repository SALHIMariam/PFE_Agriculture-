import api from "../api/client";

export type ValidationStatus = "validated" | "pending" | "rejected" | "all";

export type HeatmapFilters = {
  plant?: string;
  disease?: string;
  from?: string;
  to?: string;
  status?: ValidationStatus;
  min_confidence?: number;
};

export type HeatPoint = {
  lat: number;
  lng: number;
  cases: number;
  governorate: string;
};

export type RankingEntry = {
  governorate: string;
  zone: "nord" | "centre" | "sud" | null;
  cases: number;
};

export type TimelineEntry = {
  month: number;
  cases: number;
};

export type CropBreakdown = {
  name: string;
  emoji: string;
  analyses: number;
  health: number;
};

export type DiseaseBreakdown = {
  name: string;
  pct: number;
};

export type GovernorateSummary = {
  name: string;
  climate_zone: "nord" | "centre" | "sud";
  risk_level: "Sain" | "Faible" | "Modéré" | "Élevé" | "Critique";
  detections: number;
  trend_pct: number;
  crops: CropBreakdown[];
  diseases: DiseaseBreakdown[];
  recommendations: string[];
  health_score: number;
};

export type AlertEntry = {
  governorate: string;
  disease: string;
  disease_key: string;
  cases: number;
  farmers: number;
  severity: "moderate" | "high" | "critical";
  message: string;
};

function toParams(filters: HeatmapFilters) {
  return {
    plant: filters.plant || undefined,
    disease: filters.disease || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    status: filters.status || undefined,
    min_confidence: filters.min_confidence ?? undefined,
  };
}

export async function getHeatmapPoints(filters: HeatmapFilters = {}): Promise<HeatPoint[]> {
  const response = await api.get("/api/heatmap/points", { params: toParams(filters) });
  return response.data.points as HeatPoint[];
}

export async function getHeatmapRanking(filters: HeatmapFilters = {}): Promise<RankingEntry[]> {
  const response = await api.get("/api/heatmap/ranking", { params: toParams(filters) });
  return response.data.ranking as RankingEntry[];
}

export async function getHeatmapTimeline(year: number, filters: HeatmapFilters = {}): Promise<TimelineEntry[]> {
  const response = await api.get("/api/heatmap/timeline", { params: { ...toParams(filters), year } });
  return response.data.timeline as TimelineEntry[];
}

export async function getHeatmapAlerts(): Promise<AlertEntry[]> {
  const response = await api.get("/api/heatmap/alerts");
  return response.data.alerts as AlertEntry[];
}

export async function getGovernorateSummary(
  governorate: string,
  filters: HeatmapFilters = {}
): Promise<GovernorateSummary> {
  const response = await api.get(`/api/governorates/${encodeURIComponent(governorate)}/summary`, {
    params: toParams(filters),
  });
  return response.data as GovernorateSummary;
}
