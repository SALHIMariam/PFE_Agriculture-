import api from "../../../../api/client";
import { AnalyticsFilters } from "./expertAnalyticsService";

export type InsightSeverity = "critical" | "warning" | "info";

export type Insight = {
  type: string;
  severity: InsightSeverity;
  icon: string;
  title: string;
  message: string;
  metric: string;
  value: number;
  recommendation: string;
};

export type ReliabilityCell = { count: number; pct: number | null; label: string };

export type ReliabilityMatrixStats = {
  matrix: {
    high_confidence_agreement: ReliabilityCell;
    high_confidence_correction: ReliabilityCell;
    low_confidence_agreement: ReliabilityCell;
    low_confidence_correction: ReliabilityCell;
  };
  total: number;
  confidence_threshold: number;
};

export type OverconfidenceCase = {
  id: number;
  predicted_class: string;
  crop: string | null;
  confidence: number;
  validation_status: string;
  expert_comment: string | null;
  priority_level: string | null;
  created_at: string;
};

export type OverconfidenceStats = {
  high_confidence_cases: number;
  high_confidence_errors: number;
  overconfidence_rate: number | null;
  threshold: number;
  cases: OverconfidenceCase[];
  total_cases: number;
  page: number;
  per_page: number;
};

export type CalibrationBucket = {
  range: string;
  total: number;
  agreement_count: number;
  agreement_pct: number;
  rejection_pct: number;
};

export type CalibrationStats = {
  buckets: CalibrationBucket[];
  calibration_gap: number | null;
  note?: string;
};

export type DiseaseWeaknessStatus = "insufficient_data" | "weak" | "moderate" | "strong";

export type DiseaseWeaknessRow = {
  predicted_class: string;
  crop: string | null;
  disease_name: string;
  total_cases: number;
  avg_confidence: number | null;
  agreement_rate: number | null;
  correction_rate: number | null;
  rejection_rate: number | null;
  high_confidence_error_rate: number | null;
  sample_size_sufficient: boolean;
  status: DiseaseWeaknessStatus;
};

export type DiseaseWeaknessStats = {
  diseases: DiseaseWeaknessRow[];
  global_avg_agreement: number | null;
  min_sample_size: number;
};

export type AttentionQueueItem = {
  analysis_id: number;
  predicted_class: string;
  crop: string | null;
  confidence: number | null;
  priority_level: string | null;
  attention_score: number;
  reasons: string[];
  created_at: string;
  hours_waiting: number;
};

export type AttentionQueueStats = {
  queue: AttentionQueueItem[];
  total_pending: number;
  page: number;
  per_page: number;
};

export type LearningPriority = "high" | "medium" | "low";

export type LearningCandidate = {
  analysis_id: number;
  predicted_class: string;
  crop: string | null;
  confidence: number;
  validation_status: string;
  expert_comment: string | null;
  learning_priority: LearningPriority;
  reasons: string[];
  created_at: string;
};

export type LearningOpportunitiesStats = {
  summary: {
    total_candidates: number;
    high_value: number;
    medium_value: number;
    low_value: number;
  };
  candidates: LearningCandidate[];
  total: number;
  page: number;
  per_page: number;
};

export type IntelligenceOverview = {
  reliability_matrix: ReliabilityMatrixStats;
  overconfidence_rate: number | null;
  calibration_gap: number | null;
  weak_disease_count: number;
  learning_candidates: LearningOpportunitiesStats["summary"];
  insights_count: number;
  insights: Insight[];
};

function buildParams(filters: AnalyticsFilters = {}, extra: Record<string, string | number> = {}) {
  const params: Record<string, string | number | string[]> = { ...extra };
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.disease) params.disease = filters.disease;
  if (filters.crop) params.crop = filters.crop;
  if (filters.expert_id) params.expert_id = filters.expert_id;
  if (filters.priority_level && filters.priority_level.length > 0) params.priority_level = filters.priority_level;
  if (filters.validation_status && filters.validation_status.length > 0) params.validation_status = filters.validation_status;
  return params;
}

export const expertIntelligenceService = {
  async getOverview(filters: AnalyticsFilters = {}): Promise<IntelligenceOverview> {
    const response = await api.get("/api/expert-intelligence/overview", { params: buildParams(filters) });
    return response.data as IntelligenceOverview;
  },
  async getReliabilityMatrix(filters: AnalyticsFilters = {}): Promise<ReliabilityMatrixStats> {
    const response = await api.get("/api/expert-intelligence/reliability-matrix", { params: buildParams(filters) });
    return response.data as ReliabilityMatrixStats;
  },
  async getOverconfidence(filters: AnalyticsFilters = {}, page = 1): Promise<OverconfidenceStats> {
    const response = await api.get("/api/expert-intelligence/overconfidence", { params: buildParams(filters, { page }) });
    return response.data as OverconfidenceStats;
  },
  async getCalibration(filters: AnalyticsFilters = {}): Promise<CalibrationStats> {
    const response = await api.get("/api/expert-intelligence/calibration", { params: buildParams(filters) });
    return response.data as CalibrationStats;
  },
  async getDiseaseWeakness(filters: AnalyticsFilters = {}): Promise<DiseaseWeaknessStats> {
    const response = await api.get("/api/expert-intelligence/disease-weakness", { params: buildParams(filters) });
    return response.data as DiseaseWeaknessStats;
  },
  async getAttentionQueue(filters: AnalyticsFilters = {}, page = 1): Promise<AttentionQueueStats> {
    const response = await api.get("/api/expert-intelligence/attention-queue", { params: buildParams(filters, { page }) });
    return response.data as AttentionQueueStats;
  },
  async getLearningOpportunities(
    filters: AnalyticsFilters = {},
    page = 1,
    priority?: LearningPriority | "all"
  ): Promise<LearningOpportunitiesStats> {
    const extra: Record<string, string | number> = { page };
    if (priority && priority !== "all") extra.priority = priority;
    const response = await api.get("/api/expert-intelligence/learning-opportunities", { params: buildParams(filters, extra) });
    return response.data as LearningOpportunitiesStats;
  },
  async getInsights(filters: AnalyticsFilters = {}): Promise<{ insights: Insight[] }> {
    const response = await api.get("/api/expert-intelligence/insights", { params: buildParams(filters) });
    return response.data as { insights: Insight[] };
  },
};
