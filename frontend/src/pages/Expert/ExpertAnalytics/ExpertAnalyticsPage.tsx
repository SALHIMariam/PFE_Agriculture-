import { useMemo, useState } from "react";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import { useAuth } from "../../../context/AuthContext";
import AnalyticsFilters from "./components/AnalyticsFilters";
import AgreementCard from "./components/AgreementCard";
import AgreementChart from "./components/AgreementChart";
import CorrectionRateCard from "./components/CorrectionRateCard";
import AIAssistanceCard from "./components/AIAssistanceCard";
import ExpertEditRateCard from "./components/ExpertEditRateCard";
import CriticalCasesCard from "./components/CriticalCasesCard";
import ResponseTimeCard from "./components/ResponseTimeCard";
import DiseaseValidationChart from "./components/DiseaseValidationChart";
import WorkloadCard from "./components/WorkloadCard";
import ConfidenceCorrectionChart from "./components/ConfidenceCorrectionChart";
import ContributionCard from "./components/ContributionCard";
import InsightsPanel from "./components/InsightsPanel";
import ReliabilityMatrix from "./components/ReliabilityMatrix";
import CalibrationChart from "./components/CalibrationChart";
import OverconfidenceCard from "./components/OverconfidenceCard";
import DiseaseWeaknessTable from "./components/DiseaseWeaknessTable";
import AttentionQueueTable from "./components/AttentionQueueTable";
import LearningOpportunitiesCard from "./components/LearningOpportunitiesCard";
import { useExpertAnalytics } from "./hooks/useExpertAnalytics";
import { useExpertIntelligence } from "./hooks/useExpertIntelligence";
import { AnalyticsFilters as Filters } from "./services/expertAnalyticsService";
import { useApexTooltipStyles } from "./chartTheme";

export default function ExpertAnalyticsPage() {
  useApexTooltipStyles();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes("admin") ?? false;

  const [filters, setFilters] = useState<Filters>({});
  const { data, loading, error } = useExpertAnalytics(filters);
  const {
    data: intelligence,
    loading: intelligenceLoading,
    error: intelligenceError,
    overconfidencePage,
    setOverconfidencePage,
    attentionPage,
    setAttentionPage,
    learningPage,
    setLearningPage,
    learningFilter,
    setLearningFilter,
  } = useExpertIntelligence(filters);

  const diseaseOptions = useMemo(
    () => (data.diseaseValidation?.diseases ?? []).map((d) => d.disease).filter(Boolean),
    [data.diseaseValidation]
  );
  const cropOptions = useMemo(
    () => (data.contribution?.by_crop ?? []).map((c) => c.crop).filter((c): c is string => !!c),
    [data.contribution]
  );

  return (
    <>
      <PageMeta
        title="Statistiques Globales | AgriNova"
        description="Performance experte et collaboration Humain–IA"
      />
      <PageBreadcrumb pageTitle="Statistiques Globales" />

      <div className="space-y-6">
        <AnalyticsFilters
          filters={filters}
          onChange={setFilters}
          diseaseOptions={diseaseOptions}
          cropOptions={cropOptions}
          isAdmin={isAdmin}
        />

        {error && (
          <p className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </p>
        )}
        {intelligenceError && (
          <p className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {intelligenceError}
          </p>
        )}

        {/* ====== LAYER 2 — INTELLIGENT ANALYTICS ====== */}
        <div className="border-b border-gray-200 pb-8 dark:border-gray-800">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Centre d’intelligence experte</h2>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Analyses intelligentes dérivées des données brutes — actualisées automatiquement toutes les 2 minutes
            </p>
          </div>

          <InsightsPanel data={intelligence.insights} loading={intelligenceLoading} />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ReliabilityMatrix data={intelligence.reliabilityMatrix} loading={intelligenceLoading} />
            <CalibrationChart data={intelligence.calibration} loading={intelligenceLoading} />
            <OverconfidenceCard
              data={intelligence.overconfidence}
              loading={intelligenceLoading}
              page={overconfidencePage}
              onPageChange={setOverconfidencePage}
            />
          </div>

          <div className="mt-6">
            <DiseaseWeaknessTable data={intelligence.diseaseWeakness} loading={intelligenceLoading} />
          </div>

          <div className="mt-6">
            <AttentionQueueTable
              data={intelligence.attentionQueue}
              loading={intelligenceLoading}
              page={attentionPage}
              onPageChange={setAttentionPage}
            />
          </div>

          <div className="mt-6">
            <LearningOpportunitiesCard
              data={intelligence.learningOpportunities}
              loading={intelligenceLoading}
              page={learningPage}
              onPageChange={setLearningPage}
              filter={learningFilter}
              onFilterChange={setLearningFilter}
            />
          </div>
        </div>

        {/* ====== LAYER 1 — EXISTING STATISTICS (inchangée) ====== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <AgreementCard data={data.agreement} loading={loading} />
          <AIAssistanceCard data={data.overview} loading={loading} />
          <CorrectionRateCard data={data.corrections} loading={loading} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ResponseTimeCard data={data.responseTime} loading={loading} />
          <CriticalCasesCard data={data.workload} loading={loading} />
          <ExpertEditRateCard data={data.overview} loading={loading} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AgreementChart data={data.agreement} loading={loading} />
          <ConfidenceCorrectionChart data={data.confidenceCorrection} loading={loading} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DiseaseValidationChart data={data.diseaseValidation} loading={loading} />
          <WorkloadCard data={data.workload} loading={loading} />
        </div>

        <ContributionCard data={data.contribution} loading={loading} />
      </div>
    </>
  );
}
