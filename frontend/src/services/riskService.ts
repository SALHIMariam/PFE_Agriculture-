import api from "../api/client";

export type RiskDay = {
  offset: number;
  date: string;
  risk_score: number | null;
  risk_level: string | null;
};

export type RiskFactor = {
  factor: string;
  contribution: number;
};

export type RiskForecastResponse =
  | { available: false }
  | {
      available: true;
      disease: string;
      crop: string;
      governorate: string;
      days: RiskDay[];
      top_factors: RiskFactor[];
      trend: number | null;
      alert: boolean;
    };

export async function getRiskForecast(): Promise<RiskForecastResponse> {
  const response = await api.get("/api/risk-forecast");
  return response.data as RiskForecastResponse;
}

export type RiskCalendarDay = {
  offset: number;
  date: string;
  day_name: string;
  risk_score: number | null;
  risk_level: string | null;
};

export type RiskCalendarResponse =
  | { available: false }
  | {
      available: true;
      disease: string;
      crop: string;
      governorate: string;
      days: RiskCalendarDay[];
      alert_day: { day_name: string; risk_score: number } | null;
    };

export async function getRiskCalendar(): Promise<RiskCalendarResponse> {
  const response = await api.get("/api/risk-forecast/calendar");
  return response.data as RiskCalendarResponse;
}

export type TopRiskEntry = {
  disease: string;
  crop: string;
  governorate: string;
  risk_score: number;
  risk_level: string;
  top_factors: RiskFactor[];
};

export type AdminRiskTopResponse = {
  available: boolean;
  risks: TopRiskEntry[];
};

export async function getAdminRiskTop(): Promise<AdminRiskTopResponse> {
  const response = await api.get("/api/admin/risk-top");
  return response.data as AdminRiskTopResponse;
}

export type RiskEvolutionResponse =
  | { available: false }
  | {
      available: true;
      scope: "single" | "aggregate_top5";
      disease?: string;
      crop?: string;
      governorate?: string;
      day0: { offset: number; risk_score: number | null };
      day7: { offset: number; risk_score: number | null };
      days?: RiskDay[];
      trend: number | null;
      /** Maladie détectée par le CNN mais absente du modèle de risque. */
      unsupported?: boolean;
    };

export async function getRiskEvolution(params?: { governorate?: string; disease?: string }): Promise<RiskEvolutionResponse> {
  const response = await api.get("/api/stats/risk-evolution", { params });
  return response.data as RiskEvolutionResponse;
}

export type DiseaseEntry = {
  disease: string;
  crop: string;
  cases_30d: number;
};

export type DiseaseListResponse =
  | { available: false }
  | { available: true; governorate: string; diseases: DiseaseEntry[] };

export async function getRegionDiseases(): Promise<DiseaseListResponse> {
  const response = await api.get("/api/risk-forecast/diseases");
  return response.data as DiseaseListResponse;
}
