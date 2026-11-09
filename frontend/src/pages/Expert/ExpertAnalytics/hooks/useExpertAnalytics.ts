import { useCallback, useEffect, useState } from "react";
import {
  AgreementStats,
  AnalyticsFilters,
  ConfidenceCorrectionStats,
  ContributionStats,
  CorrectionStats,
  DiseaseValidationStats,
  OverviewStats,
  ResponseTimeStats,
  WorkloadStats,
  expertAnalyticsService,
} from "../services/expertAnalyticsService";

export type ExpertAnalyticsData = {
  overview: OverviewStats | null;
  agreement: AgreementStats | null;
  corrections: CorrectionStats | null;
  workload: WorkloadStats | null;
  responseTime: ResponseTimeStats | null;
  diseaseValidation: DiseaseValidationStats | null;
  confidenceCorrection: ConfidenceCorrectionStats | null;
  contribution: ContributionStats | null;
};

const EMPTY_DATA: ExpertAnalyticsData = {
  overview: null,
  agreement: null,
  corrections: null,
  workload: null,
  responseTime: null,
  diseaseValidation: null,
  confidenceCorrection: null,
  contribution: null,
};

export function useExpertAnalytics(filters: AnalyticsFilters) {
  const [data, setData] = useState<ExpertAnalyticsData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    // Single bundled request instead of 8 parallel ones — matters locally
    // since `php artisan serve`'s built-in PHP server processes requests one
    // at a time, so a page firing 8 concurrent calls was serialized behind
    // its own requests.
    return expertAnalyticsService
      .getCombined(filters)
      .then((combined) => {
        setData({
          overview: combined.overview,
          agreement: combined.agreement,
          corrections: combined.corrections,
          workload: combined.workload,
          responseTime: combined.response_time,
          diseaseValidation: combined.disease_validation,
          confidenceCorrection: combined.confidence_correction,
          contribution: combined.contribution,
        });
      })
      .catch(() => {
        setError("Impossible de charger les statistiques globales.");
      })
      .finally(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
