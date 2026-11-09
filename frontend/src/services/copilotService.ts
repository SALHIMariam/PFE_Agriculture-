import api from "../api/client";
import type { Analysis, PaginatedAnalyses } from "./analysisService";

export type SafetyVerdict = "ok" | "uncertain" | "out_of_domain";
export type PriorityLevel = "urgent" | "important" | "normal";
export type ConfidenceLevel = "high" | "medium" | "low";

export type CopilotResponse = {
  analysis_id: number;
  safety: {
    verdict: SafetyVerdict;
    reason: string;
    auto_reply_allowed: boolean;
  };
  priority: {
    score: number;
    level: PriorityLevel;
    factors?: Record<string, number>;
  };
  confidence: {
    score: number;
    level: ConfidenceLevel;
    sources_used: string[];
  };
  draft: {
    language?: string;
    subject: string;
    body: string;
  };
  knowledge: {
    disease_fr: string;
    severity?: string;
    symptoms: string[];
    treatment: {
      chemical?: string;
      biological?: string;
      organic?: string;
    };
    prevention: string[];
    warnings: string[];
    found: boolean;
  };
};

export type CopilotBatch = {
  disease: string;
  governorate: string;
  count: number;
  avg_confidence: number | string;
  max_priority: number | null;
};

export type CopilotStats = {
  total_prepared: number;
  validated_directly: number;
  edited_by_expert: number;
  rejected: number;
  pending: number;
  acceptance_rate: number | null;
  direct_accept_rate: number | null;
};

export type CopilotRespondAction = "validate" | "edit" | "reject";
export type CopilotQueueSort = "priority" | "recent";

export type CopilotQueueStatus = "pending" | "validated" | "edited" | "rejected" | "all";

export type CopilotQueueFilters = {
  page?: number;
  sort?: CopilotQueueSort;
  search?: string;
  governorate?: string;
  severity?: PriorityLevel;
  status?: CopilotQueueStatus;
};

export async function getQueue(filters: CopilotQueueFilters = {}): Promise<PaginatedAnalyses> {
  const params: Record<string, string | number> = {};
  if (filters.page) params.page = filters.page;
  if (filters.sort) params.sort = filters.sort;
  if (filters.search) params.search = filters.search;
  if (filters.governorate) params.governorate = filters.governorate;
  if (filters.severity) params.severity = filters.severity;
  if (filters.status) params.status = filters.status;

  const response = await api.get("/api/copilot/queue", { params });
  return response.data as PaginatedAnalyses;
}

export async function prepare(analysisId: number): Promise<CopilotResponse> {
  const response = await api.get(`/api/copilot/prepare/${analysisId}`);
  return response.data as CopilotResponse;
}

export async function getBatches(): Promise<CopilotBatch[]> {
  const response = await api.get("/api/copilot/batches");
  return response.data.batches as CopilotBatch[];
}

export async function respond(
  analysisId: number,
  action: CopilotRespondAction,
  response_?: string,
  comment?: string,
): Promise<Analysis> {
  const { data } = await api.post(`/api/copilot/${analysisId}/respond`, {
    action,
    response: response_,
    comment,
  });
  return data.analysis as Analysis;
}

export async function reviseAnalysis(
  analysisId: number,
  newStatus: "validated" | "rejected",
  comment?: string,
): Promise<Analysis> {
  const { data } = await api.post(`/api/copilot/${analysisId}/revise`, {
    new_status: newStatus,
    comment,
  });
  return data.analysis as Analysis;
}

export async function getStats(): Promise<CopilotStats> {
  const response = await api.get("/api/copilot/stats");
  return response.data as CopilotStats;
}

export type CopilotDailyStat = {
  date: string; // "2026-09-12"
  total: number;
  validated: number;
  edited: number;
  rejected: number;
  prepared: number;
};

export async function getDailyStats(from: string, to: string): Promise<CopilotDailyStat[]> {
  const response = await api.get("/api/copilot/daily-stats", { params: { from, to } });
  return response.data.daily as CopilotDailyStat[];
}
