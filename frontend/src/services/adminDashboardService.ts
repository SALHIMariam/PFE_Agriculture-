import api from "../api/client";

export type AdminStatsTrends = {
  analyses_delta: number;
  analyses_prev: number;
  farmers_delta: number;
  farmers_prev: number;
};

export type AdminStats = {
  total_analyses: number;
  total_farmers: number;
  pending_validation: number;
  validated_today: number;
  accuracy_score: number;
  models_active: number;
  trends: AdminStatsTrends;
};

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get("/api/admin/stats");
  return data as AdminStats;
}

export type AnalysesMonthlyEntry = {
  month: string;
  validated: number;
  pending: number;
  rejected: number;
};

export async function getAnalysesMonthly(): Promise<AnalysesMonthlyEntry[]> {
  const { data } = await api.get("/api/admin/analyses-monthly");
  return data as AnalysesMonthlyEntry[];
}

export type TopDiseaseEntry = {
  disease: string;
  count: number;
};

export async function getTopDiseases(): Promise<TopDiseaseEntry[]> {
  const { data } = await api.get("/api/admin/top-diseases");
  return data as TopDiseaseEntry[];
}

export type RegionData = {
  governorate: string;
  total_analyses: number;
  disease_count: number;
  healthy_count: number;
  risk_percentage: number;
  top_disease: string | null;
  top_crop: string | null;
};

export async function getRegionalMap(): Promise<RegionData[]> {
  const { data } = await api.get("/api/stats/regional-map");
  return (data as { regions: RegionData[] }).regions;
}
