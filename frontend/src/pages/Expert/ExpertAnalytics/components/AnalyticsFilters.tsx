import { useEffect, useState } from "react";
import { getExperts, ExpertOption } from "../../../../services/meetingService";
import { AnalyticsFilters as Filters } from "../services/expertAnalyticsService";

const selectClass =
  "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 sm:w-auto dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const PRIORITY_LEVELS = ["urgent", "important", "normal"];
const VALIDATION_STATUSES = ["pending", "validated", "rejected"];

type Props = {
  filters: Filters;
  onChange: (filters: Filters) => void;
  diseaseOptions: string[];
  cropOptions: string[];
  isAdmin: boolean;
};

export default function AnalyticsFilters({ filters, onChange, diseaseOptions, cropOptions, isAdmin }: Props) {
  const [experts, setExperts] = useState<ExpertOption[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    getExperts()
      .then(setExperts)
      .catch(() => setExperts([]));
  }, [isAdmin]);

  const toggleMulti = (key: "priority_level" | "validation_status", value: string) => {
    const current = filters[key] ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div>
        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Début période</label>
        <input
          type="date"
          className={selectClass}
          value={filters.start_date ?? ""}
          onChange={(e) => onChange({ ...filters, start_date: e.target.value || undefined })}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Fin période</label>
        <input
          type="date"
          className={selectClass}
          value={filters.end_date ?? ""}
          onChange={(e) => onChange({ ...filters, end_date: e.target.value || undefined })}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Maladie</label>
        <select
          className={selectClass}
          value={filters.disease ?? ""}
          onChange={(e) => onChange({ ...filters, disease: e.target.value || undefined })}
        >
          <option value="">Toutes</option>
          {diseaseOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Culture</label>
        <select
          className={selectClass}
          value={filters.crop ?? ""}
          onChange={(e) => onChange({ ...filters, crop: e.target.value || undefined })}
        >
          <option value="">Toutes</option>
          {cropOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {isAdmin && (
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Expert</label>
          <select
            className={selectClass}
            value={filters.expert_id ?? ""}
            onChange={(e) => onChange({ ...filters, expert_id: e.target.value || undefined })}
          >
            <option value="">Tous</option>
            {experts.map((expert) => (
              <option key={expert.id} value={expert.id}>
                {expert.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Priorité</label>
        <div className="flex flex-wrap gap-1">
          {PRIORITY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => toggleMulti("priority_level", level)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                (filters.priority_level ?? []).includes(level)
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Statut validation</label>
        <div className="flex flex-wrap gap-1">
          {VALIDATION_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => toggleMulti("validation_status", status)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                (filters.validation_status ?? []).includes(status)
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
