import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getGovernorateSummary,
  getHeatmapRanking,
  getHeatmapTimeline,
  type GovernorateSummary,
  type HeatmapFilters,
  type RankingEntry,
  type TimelineEntry,
  type ValidationStatus,
} from "../../services/heatmapService";
import { useRiskAlerts } from "../../hooks/useRiskAlerts";

export type DateRangePreset = "today" | "7d" | "30d" | "custom";

export type HeatmapFiltersState = {
  plant: string;
  disease: string;
  datePreset: DateRangePreset;
  from: string;
  to: string;
  status: ValidationStatus;
  minConfidence: number;
  month: number | null;
};

export const DEFAULT_FILTERS: HeatmapFiltersState = {
  plant: "",
  disease: "",
  datePreset: "custom",
  from: "",
  to: "",
  status: "validated",
  minConfidence: 50,
  month: null,
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function presetToRange(preset: DateRangePreset): { from?: string; to?: string } {
  const today = new Date();

  if (preset === "today") return { from: isoDate(today), to: isoDate(today) };

  if (preset === "7d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 7);
    return { from: isoDate(from), to: isoDate(today) };
  }

  if (preset === "30d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 30);
    return { from: isoDate(from), to: isoDate(today) };
  }

  return {};
}

export function useHeatmapData() {
  const [filters, setFilters] = useState<HeatmapFiltersState>(DEFAULT_FILTERS);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string | null>(null);
  const [summary, setSummary] = useState<GovernorateSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const year = new Date().getFullYear();

  const baseFilters: HeatmapFilters = useMemo(
    () => ({
      plant: filters.plant || undefined,
      disease: filters.disease || undefined,
      status: filters.status,
      min_confidence: filters.minConfidence,
    }),
    [filters.plant, filters.disease, filters.status, filters.minConfidence]
  );

  const apiFilters: HeatmapFilters = useMemo(() => {
    let { from, to } = filters.datePreset === "custom"
      ? { from: filters.from || undefined, to: filters.to || undefined }
      : presetToRange(filters.datePreset);

    if (filters.month) {
      const monthStr = String(filters.month).padStart(2, "0");
      const lastDay = new Date(year, filters.month, 0).getDate();
      from = `${year}-${monthStr}-01`;
      to = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
    }

    return { ...baseFilters, from, to };
  }, [baseFilters, filters.datePreset, filters.from, filters.to, filters.month, year]);

  const reload = useCallback(() => {
    setLoading(true);
    getHeatmapRanking(apiFilters)
      .then(setRanking)
      .finally(() => setLoading(false));
  }, [apiFilters]);

  useEffect(() => {
    const timeout = setTimeout(reload, 250);
    return () => clearTimeout(timeout);
  }, [reload]);

  useEffect(() => {
    getHeatmapTimeline(year, baseFilters).then(setTimeline);
  }, [baseFilters, year]);

  useEffect(() => {
    if (!selectedGovernorate) {
      setSummary(null);
      return;
    }

    setSummaryLoading(true);
    getGovernorateSummary(selectedGovernorate, apiFilters)
      .then(setSummary)
      .finally(() => setSummaryLoading(false));
  }, [selectedGovernorate, apiFilters]);

  const alerts = useRiskAlerts();

  return {
    filters,
    setFilters,
    ranking,
    timeline,
    loading,
    selectedGovernorate,
    setSelectedGovernorate,
    summary,
    summaryLoading,
    alerts,
    year,
  };
}
