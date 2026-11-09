import type { NewsCategory } from "../../services/newsService";
import type { NewsFiltersState } from "./useNewsData";

const CROPS = ["Apple", "Bean", "Corn", "Cucumber", "Grape", "Groundnut", "Potato", "Tomato", "Wheat"];

const CROP_LABELS: Record<string, string> = {
  Apple: "Pomme",
  Bean: "Haricot",
  Corn: "Maïs",
  Cucumber: "Concombre",
  Grape: "Raisin / Vigne",
  Groundnut: "Arachide",
  Potato: "Pomme de terre",
  Tomato: "Tomate",
  Wheat: "Blé",
};

const CATEGORIES: { value: NewsCategory; label: string }[] = [
  { value: "new_disease", label: "Nouvelle maladie" },
  { value: "new_treatment", label: "Nouveau traitement" },
  { value: "trend", label: "Tendance" },
  { value: "alert", label: "Alerte" },
  { value: "info", label: "Info" },
];

type Props = {
  filters: NewsFiltersState;
  onChange: (filters: NewsFiltersState) => void;
};

export default function NewsFilterPanel({ filters, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Rechercher une actualité…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full rounded-lg border border-gray-300 bg-transparent py-2 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-emerald-500 dark:border-gray-700 dark:text-gray-200"
        />
      </div>

      <select
        value={filters.crop}
        onChange={(e) => onChange({ ...filters, crop: e.target.value })}
        className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-500 dark:border-gray-700 dark:text-gray-200 dark:[color-scheme:dark]"
      >
        <option value="">Toutes les cultures</option>
        {CROPS.map((crop) => (
          <option key={crop} value={crop}>
            {CROP_LABELS[crop] ?? crop}
          </option>
        ))}
      </select>

      <select
        value={filters.category}
        onChange={(e) => onChange({ ...filters, category: e.target.value as NewsFiltersState["category"] })}
        className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-500 dark:border-gray-700 dark:text-gray-200 dark:[color-scheme:dark]"
      >
        <option value="">Toutes les catégories</option>
        {CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </select>
    </div>
  );
}
