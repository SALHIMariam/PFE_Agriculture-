import { useCallback, useEffect, useState } from "react";
import { AnalyticsFilters } from "../services/expertAnalyticsService";
import {
  AttentionQueueStats,
  CalibrationStats,
  DiseaseWeaknessStats,
  Insight,
  IntelligenceOverview,
  LearningOpportunitiesStats,
  LearningPriority,
  OverconfidenceStats,
  ReliabilityMatrixStats,
  expertIntelligenceService,
} from "../services/expertIntelligenceService";

export type ExpertIntelligenceData = {
  overview: IntelligenceOverview | null;
  reliabilityMatrix: ReliabilityMatrixStats | null;
  calibration: CalibrationStats | null;
  diseaseWeakness: DiseaseWeaknessStats | null;
  insights: Insight[];
  overconfidence: OverconfidenceStats | null;
  attentionQueue: AttentionQueueStats | null;
  learningOpportunities: LearningOpportunitiesStats | null;
};

const EMPTY_DATA: ExpertIntelligenceData = {
  overview: null,
  reliabilityMatrix: null,
  calibration: null,
  diseaseWeakness: null,
  insights: [],
  overconfidence: null,
  attentionQueue: null,
  learningOpportunities: null,
};

export function useExpertIntelligence(filters: AnalyticsFilters) {
  const [data, setData] = useState<ExpertIntelligenceData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overconfidencePage, setOverconfidencePage] = useState(1);
  const [attentionPage, setAttentionPage] = useState(1);
  const [learningPage, setLearningPage] = useState(1);
  const [learningFilter, setLearningFilterState] = useState<LearningPriority | "all">("all");

  const filtersKey = JSON.stringify(filters);

  // Chargement principal : tout ce qui n'est pas paginé, + page 1 des listes
  // paginées indépendantes (overconfidence, attentionQueue). Learning
  // Opportunities est géré par son propre effet ci-dessous car il dépend
  // aussi d'un filtre de priorité (voir setLearningFilter).
  useEffect(() => {
    setLoading(true);
    setError(null);
    setOverconfidencePage(1);
    setAttentionPage(1);
    setLearningPage(1);
    setLearningFilterState("all");
    setData((prev) => ({ ...prev, learningOpportunities: null }));

    // overview() already embeds the full reliability_matrix and insights list
    // (ExpertIntelligenceService::overview — see backend), so we reuse them
    // here instead of firing 2 extra parallel requests for the same data.
    // This cuts this page's initial burst from 7 to 5 concurrent requests —
    // php artisan serve's built-in dev server handles one request at a time,
    // so fewer concurrent calls means a faster perceived page load locally.
    Promise.all([
      expertIntelligenceService.getOverview(filters),
      expertIntelligenceService.getCalibration(filters),
      expertIntelligenceService.getDiseaseWeakness(filters),
      expertIntelligenceService.getOverconfidence(filters, 1),
      expertIntelligenceService.getAttentionQueue(filters, 1),
    ])
      .then(([overview, calibration, diseaseWeakness, overconfidence, attentionQueue]) => {
        setData((prev) => ({
          ...prev,
          overview,
          reliabilityMatrix: overview.reliability_matrix,
          calibration,
          diseaseWeakness,
          insights: overview.insights,
          overconfidence,
          attentionQueue,
        }));
      })
      .catch(() => setError("Impossible de charger le centre d’intelligence experte."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  // Pagination indépendante : ne recharge que la liste concernée.
  useEffect(() => {
    if (overconfidencePage === 1) return;
    expertIntelligenceService.getOverconfidence(filters, overconfidencePage).then((overconfidence) => {
      setData((prev) => ({ ...prev, overconfidence }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overconfidencePage]);

  useEffect(() => {
    if (attentionPage === 1) return;
    expertIntelligenceService.getAttentionQueue(filters, attentionPage).then((attentionQueue) => {
      setData((prev) => ({ ...prev, attentionQueue }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attentionPage]);

  // Learning Opportunities : la priorité DOIT être filtrée côté serveur avant
  // pagination (les candidats sont triés high -> medium -> low, donc filtrer
  // seulement la page déjà reçue produisait des pages vides pour "medium"/"low"
  // même quand le total global était > 0). Cet effet dépend de filtersKey pour
  // se recharger immédiatement après le reset ci-dessus.
  useEffect(() => {
    expertIntelligenceService.getLearningOpportunities(filters, learningPage, learningFilter).then((learningOpportunities) => {
      setData((prev) => ({ ...prev, learningOpportunities }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, learningPage, learningFilter]);

  const setLearningFilter = useCallback((priority: LearningPriority | "all") => {
    setLearningFilterState(priority);
    setLearningPage(1);
  }, []);

  const reload = useCallback(() => {
    setOverconfidencePage(1);
    setAttentionPage(1);
    setLearningPage(1);
    setLearningFilterState("all");
  }, []);

  return {
    data,
    loading,
    error,
    reload,
    overconfidencePage,
    setOverconfidencePage,
    attentionPage,
    setAttentionPage,
    learningPage,
    setLearningPage,
    learningFilter,
    setLearningFilter,
  };
}
