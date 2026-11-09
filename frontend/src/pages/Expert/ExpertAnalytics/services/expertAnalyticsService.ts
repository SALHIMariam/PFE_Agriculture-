import api from "../../../../api/client";

export type AnalyticsFilters = {
  start_date?: string;
  end_date?: string;
  disease?: string;
  crop?: string;
  expert_id?: number | string;
  priority_level?: string[];
  validation_status?: string[];
};

export type AssistanceBreakdown = { prepared: number; accepted_directly: number; modified: number; rejected: number };
export type EditFunnel = { ai_generated: number; accepted_directly: number; edited: number; rejected: number };

export type OverviewStats = {
  agreement_pct: number | null;
  correction_rate_pct: number | null;
  ai_assistance_rate_pct: number | null;
  ai_assistance_breakdown: AssistanceBreakdown;
  expert_edit_rate_pct: number | null;
  edit_funnel: EditFunnel;
  avg_response_time_minutes: number | null;
  median_response_time_minutes: number | null;
  total_cases: number;
  total_responded: number;
};

export type AgreementTimelinePoint = { date: string; validated: number; rejected: number };

export type AgreementStats = {
  agreement_pct: number | null;
  validated_count: number;
  rejected_count: number;
  total: number;
  timeline: AgreementTimelinePoint[];
};

export type CorrectionTimelinePoint = { date: string; corrected: number; total: number };

export type CorrectionStats = {
  global_rate_pct: number | null;
  diagnostic_rate_pct: number | null;
  recommendation_rate_pct: number | null;
  global_rejected_rate_pct: number | null;
  total: number;
  timeline: CorrectionTimelinePoint[];
};

export type WorkloadByWeekday = { weekday: number; count: number };
export type WorkloadByExpert = { expert_id: number; expert_name: string; assigned: number; treated: number };
export type WorkloadByPriority = { priority_level: string; total: number; treated: number; treated_pct: number | null };

export type WorkloadStats = {
  assigned: number;
  treated: number;
  remaining: number;
  pending: number;
  urgent_untreated: number;
  completion_rate_pct: number | null;
  by_weekday: WorkloadByWeekday[];
  by_priority: WorkloadByPriority[];
  by_expert: WorkloadByExpert[] | null;
};

export type ResponseTimeTimelinePoint = { date: string; avg_minutes: number };

export type ResponseTimeStats = {
  avg_minutes: number | null;
  median_minutes: number | null;
  min_minutes: number | null;
  max_minutes: number | null;
  variation_pct: number | null;
  total: number;
  timeline: ResponseTimeTimelinePoint[];
};

export type DiseaseValidationRow = { disease: string; total: number; agreement_pct: number | null };
export type DiseaseValidationStats = { diseases: DiseaseValidationRow[] };

export type ConfidenceCorrectionPoint = { confidence: number; validation_status: "validated" | "rejected" };
export type ConfidenceCorrectionStats = { points: ConfidenceCorrectionPoint[] };

export type ContributionByGroup = { predicted_class?: string; crop?: string; validated: number; rejected: number };

export type ContributionStats = {
  validated_count: number;
  rejected_count: number;
  corrected_count: number;
  by_disease: ContributionByGroup[];
  by_crop: ContributionByGroup[];
};

export type CombinedAnalyticsStats = {
  overview: OverviewStats;
  agreement: AgreementStats;
  corrections: CorrectionStats;
  workload: WorkloadStats;
  response_time: ResponseTimeStats;
  disease_validation: DiseaseValidationStats;
  confidence_correction: ConfidenceCorrectionStats;
  contribution: ContributionStats;
};

function buildParams(filters: AnalyticsFilters = {}): Record<string, string | number | string[]> {
  const params: Record<string, string | number | string[]> = {};
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.disease) params.disease = filters.disease;
  if (filters.crop) params.crop = filters.crop;
  if (filters.expert_id) params.expert_id = filters.expert_id;
  if (filters.priority_level && filters.priority_level.length > 0) params.priority_level = filters.priority_level;
  if (filters.validation_status && filters.validation_status.length > 0) params.validation_status = filters.validation_status;
  return params;
}

export const expertAnalyticsService = {
  async getCombined(filters: AnalyticsFilters = {}): Promise<CombinedAnalyticsStats> {
    const response = await api.get("/api/expert-analytics/combined", { params: buildParams(filters) });
    return response.data as CombinedAnalyticsStats;
  },
  async getOverview(filters: AnalyticsFilters = {}): Promise<OverviewStats> {
    const response = await api.get("/api/expert-analytics/overview", { params: buildParams(filters) });
    return response.data as OverviewStats;
  },
  async getAgreement(filters: AnalyticsFilters = {}): Promise<AgreementStats> {
    const response = await api.get("/api/expert-analytics/agreement", { params: buildParams(filters) });
    return response.data as AgreementStats;
  },
  async getCorrections(filters: AnalyticsFilters = {}): Promise<CorrectionStats> {
    const response = await api.get("/api/expert-analytics/corrections", { params: buildParams(filters) });
    return response.data as CorrectionStats;
  },
  async getWorkload(filters: AnalyticsFilters = {}): Promise<WorkloadStats> {
    const response = await api.get("/api/expert-analytics/workload", { params: buildParams(filters) });
    return response.data as WorkloadStats;
  },
  async getResponseTime(filters: AnalyticsFilters = {}): Promise<ResponseTimeStats> {
    const response = await api.get("/api/expert-analytics/response-time", { params: buildParams(filters) });
    return response.data as ResponseTimeStats;
  },
  async getDiseaseValidation(filters: AnalyticsFilters = {}): Promise<DiseaseValidationStats> {
    const response = await api.get("/api/expert-analytics/disease-validation", { params: buildParams(filters) });
    return response.data as DiseaseValidationStats;
  },
  async getConfidenceCorrection(filters: AnalyticsFilters = {}): Promise<ConfidenceCorrectionStats> {
    const response = await api.get("/api/expert-analytics/confidence-correction", { params: buildParams(filters) });
    return response.data as ConfidenceCorrectionStats;
  },
  async getContribution(filters: AnalyticsFilters = {}): Promise<ContributionStats> {
    const response = await api.get("/api/expert-analytics/contribution", { params: buildParams(filters) });
    return response.data as ContributionStats;
  },
};
