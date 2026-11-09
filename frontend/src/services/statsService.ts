import api from "../api/client";

export type OverviewResponse = {
  farm_performance_index: number;
  performance_label: string;
  performance_stars: number;
  crop_health_score: number;
  treatment_score: number;
  ai_accuracy_score: number;
  expert_agreement_score: number;
  satisfaction_score: number;
  ai_conclusion: string;
  total_analyses: number;
  analyses_this_week: number;
  most_analysed_crop: string | null;
  disease_distribution: { disease: string; count: number }[];
};

export async function getOverview(): Promise<OverviewResponse> {
  const response = await api.get("/api/stats/overview");
  return response.data as OverviewResponse;
}

export async function getAnalysesStats(page = 1): Promise<unknown> {
  const response = await api.get("/api/stats/analyses", { params: { page } });
  return response.data;
}

export async function getAiSummary(): Promise<{ summary: string }> {
  const response = await api.get("/api/stats/ai-summary");
  return response.data as { summary: string };
}

export type RegionalMapRegion = {
  governorate: string;
  total_analyses: number;
  disease_count: number;
  healthy_count: number;
  risk_percentage: number;
  top_disease: string | null;
  top_crop: string | null;
};

export type RegionalMapResponse = {
  regions: RegionalMapRegion[];
};

export async function getRegionalMap(): Promise<RegionalMapResponse> {
  const response = await api.get("/api/stats/regional-map");
  return response.data as RegionalMapResponse;
}

export type DiseaseDistributionItem = {
  disease: string;
  crop: string;
  count: number;
  percentage: number;
  color: string;
};

export type DiseaseDistributionResponse = {
  diseases: DiseaseDistributionItem[];
  total: number;
  healthy_count: number;
  healthy_percentage: number;
};

export async function getDiseaseDistribution(): Promise<DiseaseDistributionResponse> {
  const response = await api.get("/api/stats/disease-distribution");
  return response.data as DiseaseDistributionResponse;
}

export type AnalysisPerDayEntry = {
  date: string;
  count: number;
  disease_count: number;
  healthy_count: number;
};

export type AnalysesPerDayResponse = {
  period: string;
  data: AnalysisPerDayEntry[];
  total: number;
  average_per_day: number;
  available_months: string[];
};

export async function getAnalysesPerDay(month?: string): Promise<AnalysesPerDayResponse> {
  const response = await api.get("/api/stats/analyses-per-day", {
    params: month ? { month } : undefined,
  });
  return response.data as AnalysesPerDayResponse;
}

export type CropDiversityItem = {
  name: string;
  name_fr: string;
  emoji: string;
  analyses_count: number;
  disease_count: number;
  healthy_count: number;
  health_percentage: number;
  last_analysis_date: string | null;
};

export type CropDiversityResponse = {
  diversity_score: number;
  total_crops: number;
  crops: CropDiversityItem[];
};

export async function getCropDiversity(): Promise<CropDiversityResponse> {
  const response = await api.get("/api/stats/crop-diversity");
  return response.data as CropDiversityResponse;
}

export type FarmerDashboardResponse = {
  kpis: {
    total: number;
    last_30_days: number;
    previous_30_days: number;
    validated: number;
    pending: number;
    rejected: number;
    healthy_percentage: number;
    average_confidence: number;
  };
  /** 6 derniers mois, du plus ancien au mois courant ("YYYY-MM"). */
  monthly: { month: string; validated: number; pending: number; rejected: number }[];
  top_diseases: { disease: string; count: number; percentage: number }[];
  recent: {
    id: number;
    disease: string | null;
    crop: string | null;
    healthy: boolean;
    confidence: number | null;
    validation_status: "pending" | "validated" | "rejected";
    created_at: string | null;
  }[];
};

export async function getFarmerDashboard(): Promise<FarmerDashboardResponse> {
  const response = await api.get("/api/stats/farmer-dashboard");
  return response.data as FarmerDashboardResponse;
}
