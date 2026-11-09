import { useCallback, useEffect, useState } from "react";
import {
  getOverview,
  getRegionalMap,
  getDiseaseDistribution,
  getAnalysesPerDay,
  getCropDiversity,
  type OverviewResponse,
  type RegionalMapResponse,
  type DiseaseDistributionResponse,
  type AnalysesPerDayResponse,
  type CropDiversityResponse,
} from "../../services/statsService";
import { getRiskEvolution, type RiskEvolutionResponse } from "../../services/riskService";

export function useStatsData() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [regionalMap, setRegionalMap] = useState<RegionalMapResponse | null>(null);
  const [loadingMap, setLoadingMap] = useState(true);

  const [diseaseDistribution, setDiseaseDistribution] = useState<DiseaseDistributionResponse | null>(null);
  const [loadingDiseases, setLoadingDiseases] = useState(true);

  const [analysesPerDay, setAnalysesPerDay] = useState<AnalysesPerDayResponse | null>(null);
  const [loadingPerDay, setLoadingPerDay] = useState(true);

  const [cropDiversity, setCropDiversity] = useState<CropDiversityResponse | null>(null);
  const [loadingCrops, setLoadingCrops] = useState(true);

  const [riskEvolution, setRiskEvolution] = useState<RiskEvolutionResponse | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(true);

  const fetchPerDay = useCallback((month?: string) => {
    setLoadingPerDay(true);
    getAnalysesPerDay(month)
      .then(setAnalysesPerDay)
      .finally(() => setLoadingPerDay(false));
  }, []);

  useEffect(() => {
    setLoadingOverview(true);
    getOverview()
      .then(setOverview)
      .finally(() => setLoadingOverview(false));

    setLoadingMap(true);
    setLoadingDiseases(true);
    setLoadingCrops(true);
    setLoadingRisk(true);

    Promise.all([
      getRegionalMap()
        .then(setRegionalMap)
        .finally(() => setLoadingMap(false)),
      getDiseaseDistribution()
        .then(setDiseaseDistribution)
        .finally(() => setLoadingDiseases(false)),
      getCropDiversity()
        .then(setCropDiversity)
        .finally(() => setLoadingCrops(false)),
      getRiskEvolution()
        .then(setRiskEvolution)
        .finally(() => setLoadingRisk(false)),
    ]);

    fetchPerDay();
  }, [fetchPerDay]);

  return {
    overview,
    loadingOverview,
    regionalMap,
    loadingMap,
    diseaseDistribution,
    loadingDiseases,
    analysesPerDay,
    loadingPerDay,
    fetchPerDay,
    cropDiversity,
    loadingCrops,
    riskEvolution,
    loadingRisk,
  };
}
