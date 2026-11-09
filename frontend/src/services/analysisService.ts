import api from "../api/client";

export type TopKEntry = {
  class: string;
  confidence: number;
};

export type ValidationStatus = "pending" | "validated" | "rejected";

export type Analysis = {
  id: number;
  image_url: string;
  gradcam_url: string | null;
  predicted_class: string | null;
  crop: string | null;
  confidence: number | null;
  top_k: TopKEntry[] | null;
  status: "pending" | "done" | "failed";
  low_confidence: boolean;
  validation_status: ValidationStatus;
  expert_comment: string | null;
  expert_validated_at: string | null;
  expert_name: string | null;
  cnn_validation_status: ValidationStatus;
  cnn_expert_comment: string | null;
  cnn_validated_at: string | null;
  cnn_expert_name: string | null;
  reco_validation_status: ValidationStatus;
  reco_expert_comment: string | null;
  reco_validated_at: string | null;
  reco_expert_name: string | null;
  farmer_name: string | null;
  farmer_governorate: string | null;
  messages_count?: number;
  created_at: string | null;
  // Assistant AI
  draft_response?: string | null;
  expert_edited_response?: boolean;
  expert_response?: string | null;
  priority_score?: number | null;
  priority_level?: "urgent" | "important" | "normal" | null;
  safety_verdict?: "ok" | "uncertain" | "out_of_domain" | null;
  confidence_score?: number | null;
  responded_at?: string | null;
};

export type PaginatedAnalyses = {
  data: Analysis[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
};

export type RecommendationCas = "CAS_1" | "CAS_2" | "CAS_3" | "CAS_4";

export type RecommendationRegion = {
  gouvernorat?: string | null;
  zone: string;
  niveau_label: string;
  favorable: boolean;
  zone_description?: string | null;
};

export type Recommendation = {
  recommendation_id: string;
  cas: RecommendationCas;
  cas_label: string;
  plante: string;
  maladie: string;
  niveau_risque: string;
  message: string;
  description?: string;
  actions_immediates: string[];
  traitements: {
    chimique: string[];
    biologique: string[];
    organique: string[];
  };
  irrigation?: string[];
  fertilisation?: string[];
  prevention?: string[];
  surveillance?: string[];
  intervalle_surveillance_jours: number;
  temps_recuperation?: string | null;
  symptomes?: string[];
  agent_pathogene?: string;
  type_pathogene?: string;
  avertissements: string[];
  references?: string[];
  taille?: string[];
  region: RecommendationRegion;
  conseils_adaptation: string[];
  diagnostic_peu_fiable?: boolean;
};

export type LatestAnalysisResponse = {
  analysis: Analysis | null;
  recommendation: Recommendation | null;
};

export type AnalysisDetail = {
  analysis: Analysis;
  recommendation: Recommendation | null;
};

export type MessageRole = "farmer" | "expert" | "admin";

export type AnalysisMessage = {
  id: number;
  analysis_id: number;
  user_id: number;
  user_name: string;
  user_role: MessageRole | string;
  message: string | null;
  is_deleted: boolean;
  is_edited: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export async function createAnalysis(file: File): Promise<Analysis> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await api.post("/api/analyses", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.analysis as Analysis;
}

export async function getAnalyses(page = 1): Promise<PaginatedAnalyses> {
  const response = await api.get("/api/analyses", { params: { page } });
  return response.data as PaginatedAnalyses;
}

export async function getAnalysis(id: number): Promise<Analysis> {
  const response = await api.get(`/api/analyses/${id}`);
  return response.data.analysis as Analysis;
}

export async function getLatestAnalysis(): Promise<LatestAnalysisResponse> {
  // Timeout explicite : côté serveur l'appel au service de recommandation est
  // borné à ~10s ; au-delà on échoue proprement plutôt que de rester bloqué.
  const response = await api.get("/api/analyses/latest", { timeout: 15000 });
  return response.data as LatestAnalysisResponse;
}

export async function getAnalysisDetail(id: number): Promise<AnalysisDetail> {
  const response = await api.get(`/api/analyses/${id}`);
  return response.data as AnalysisDetail;
}

export async function deleteAnalysis(id: number): Promise<void> {
  await api.delete(`/api/analyses/${id}`);
}

export async function validateAnalysis(
  id: number,
  status: "validated" | "rejected",
  comment?: string
): Promise<Analysis> {
  const response = await api.patch(`/api/analyses/${id}/validate`, { status, comment });
  return response.data.analysis as Analysis;
}

export async function validateCnnDiagnosis(
  id: number,
  status: "validated" | "rejected",
  comment?: string
): Promise<Analysis> {
  const response = await api.patch(`/api/analyses/${id}/validate-cnn`, { status, comment });
  return response.data.analysis as Analysis;
}

export async function validateRecommendation(
  id: number,
  status: "validated" | "rejected",
  comment?: string
): Promise<Analysis> {
  const response = await api.patch(`/api/analyses/${id}/validate-recommendation`, { status, comment });
  return response.data.analysis as Analysis;
}

export async function getAnalysisMessages(id: number): Promise<AnalysisMessage[]> {
  const response = await api.get(`/api/analyses/${id}/messages`);
  return response.data.data as AnalysisMessage[];
}

export async function postAnalysisMessage(id: number, message: string): Promise<AnalysisMessage> {
  const response = await api.post(`/api/analyses/${id}/messages`, { message });
  return response.data.message as AnalysisMessage;
}

export async function updateAnalysisMessage(
  analysisId: number,
  messageId: number,
  message: string
): Promise<AnalysisMessage> {
  const response = await api.patch(`/api/analyses/${analysisId}/messages/${messageId}`, { message });
  return response.data.message as AnalysisMessage;
}

export async function deleteAnalysisMessage(
  analysisId: number,
  messageId: number
): Promise<AnalysisMessage> {
  const response = await api.delete(`/api/analyses/${analysisId}/messages/${messageId}`);
  return response.data.message as AnalysisMessage;
}

export async function getExpertAnalyses(
  page = 1,
  filter: ValidationStatus | "all" = "pending"
): Promise<PaginatedAnalyses> {
  const response = await api.get("/api/expert/analyses", {
    params: { page, filter },
  });
  return response.data as PaginatedAnalyses;
}

export type AdminAnalysisFilters = {
  search?: string; // portion du diagnostic (predicted_class)
  farmer?: string; // portion du nom du farmer
  confidence_min?: number; // 0-100
  confidence_max?: number; // 0-100
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
  status?: ValidationStatus | ""; // pending | validated | rejected
  page?: number;
  per_page?: number;
};

export async function getAdminAnalyses(
  filters: AdminAnalysisFilters = {}
): Promise<PaginatedAnalyses> {
  // N'envoie que les filtres réellement renseignés.
  const params: Record<string, string | number> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = value as string | number;
    }
  });

  const response = await api.get("/api/admin/analyses", { params });
  return response.data as PaginatedAnalyses;
}
