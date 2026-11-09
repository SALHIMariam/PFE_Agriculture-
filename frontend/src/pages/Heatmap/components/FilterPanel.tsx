import { Filter, Leaf, Bug, CalendarDays, ShieldCheck, Gauge } from "lucide-react";
import type { HeatmapFiltersState, DateRangePreset } from "../useHeatmapData";
import type { ValidationStatus } from "../../../services/heatmapService";

const PLANTS: { label: string; value: string }[] = [
  { label: "Toutes", value: "" },
  { label: "Pomme", value: "Apple" },
  { label: "Haricot", value: "Bean" },
  { label: "Maïs", value: "Corn" },
  { label: "Concombre", value: "Cucumber" },
  { label: "Raisin", value: "Grape" },
  { label: "Arachide", value: "Groundnut" },
  { label: "Pomme de terre", value: "Potato" },
  { label: "Tomate", value: "Tomato" },
  { label: "Blé", value: "Wheat" },
];

const DISEASE_GROUPS: { plant: string; diseases: { label: string; value: string }[] }[] = [
  { plant: "Apple", diseases: [
    { label: "Black Rot", value: "black_rot" },
    { label: "Cedar Apple Rust", value: "cedar_apple_rust" },
    { label: "Scab", value: "scab" },
  ]},
  { plant: "Bean", diseases: [
    { label: "Angular Leaf Spot", value: "beans_angular_leaf_spot_disease" },
    { label: "Rust", value: "beans_rust_disease" },
  ]},
  { plant: "Corn", diseases: [
    { label: "Gray Leaf Spot", value: "gray_leaf_spot" },
    { label: "Maize Streak Virus", value: "maize_streak_virus_disease" },
    { label: "Northern Leaf Blight", value: "northern_leaf_blight" },
  ]},
  { plant: "Cucumber", diseases: [
    { label: "Anthracnose", value: "anthracnose" },
    { label: "Downy Mildew", value: "downy_mildew" },
    { label: "Gummy Stem Blight", value: "gummy_stem_blight" },
    { label: "Powdery Mildew", value: "powdery_mildew" },
  ]},
  { plant: "Grape", diseases: [
    { label: "Black Measles", value: "black_measles" },
    { label: "Black Rot", value: "black_rot" },
    { label: "Leaf Blight", value: "leaf_blight" },
  ]},
  { plant: "Groundnut", diseases: [
    { label: "Early Leaf Spot", value: "early_leaf_spot" },
    { label: "Late Leaf Spot", value: "late_leaf_spot" },
    { label: "Nutrition Deficiency", value: "nutrition_deficiency" },
    { label: "Rust", value: "rust" },
  ]},
  { plant: "Potato", diseases: [
    { label: "Early Blight", value: "early_blight" },
    { label: "Late Blight", value: "late_blight" },
  ]},
  { plant: "Tomato", diseases: [
    { label: "Bacterial Spot", value: "bacterial_spot" },
    { label: "Early Blight", value: "early_blight" },
    { label: "Late Blight", value: "late_blight" },
    { label: "Septoria Leaf Spot", value: "septoria_leaf_spot" },
    { label: "Spider Mites", value: "spider_mites_two_spotted_spider_mite" },
    { label: "Yellow Leaf Curl Virus", value: "yellow_leaf_curl_virus" },
  ]},
  { plant: "Wheat", diseases: [
    { label: "Septoria", value: "septoria" },
    { label: "Stripe Rust", value: "stripe_rust" },
  ]},
];

const DATE_PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: "Aujourd'hui", value: "today" },
  { label: "7 derniers jours", value: "7d" },
  { label: "Dernier mois", value: "30d" },
  { label: "Plage personnalisée", value: "custom" },
];

const STATUSES: { label: string; value: ValidationStatus }[] = [
  { label: "Tous", value: "all" },
  { label: "Validé", value: "validated" },
  { label: "En attente", value: "pending" },
  { label: "Rejeté", value: "rejected" },
];

type Props = {
  filters: HeatmapFiltersState;
  onChange: (next: HeatmapFiltersState) => void;
};

const selectClass =
  "w-full rounded-lg border border-white/60 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-white/5 dark:text-gray-200";

export default function FilterPanel({ filters, onChange }: Props) {
  const set = <K extends keyof HeatmapFiltersState>(key: K, value: HeatmapFiltersState[K]) =>
    onChange({ ...filters, [key]: value, month: key === "datePreset" ? null : filters.month });

  return (
    <div className="pointer-events-auto w-72 rounded-2xl border border-white/40 bg-white/70 p-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/70">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
        <Filter size={16} />
        Filtres
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            <Leaf size={12} /> Plante
          </span>
          <select className={selectClass} value={filters.plant} onChange={(e) => set("plant", e.target.value)}>
            {PLANTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            <Bug size={12} /> Maladie
          </span>
          <select className={selectClass} value={filters.disease} onChange={(e) => set("disease", e.target.value)}>
            <option value="">Toutes</option>
            {DISEASE_GROUPS.map((group) => (
              <optgroup key={group.plant} label={group.plant}>
                {group.diseases.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            <CalendarDays size={12} /> Date
          </span>
          <select
            className={selectClass}
            value={filters.datePreset}
            onChange={(e) => set("datePreset", e.target.value as DateRangePreset)}
          >
            {DATE_PRESETS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          {filters.datePreset === "custom" && (
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <input
                type="date"
                className={selectClass}
                value={filters.from}
                onChange={(e) => set("from", e.target.value)}
              />
              <input
                type="date"
                className={selectClass}
                value={filters.to}
                onChange={(e) => set("to", e.target.value)}
              />
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            <ShieldCheck size={12} /> Statut de validation
          </span>
          <select
            className={selectClass}
            value={filters.status}
            onChange={(e) => set("status", e.target.value as ValidationStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Gauge size={12} /> Confiance min.
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">{filters.minConfidence}%</span>
          </span>
          <input
            type="range"
            min={50}
            max={100}
            value={filters.minConfidence}
            onChange={(e) => set("minConfidence", Number(e.target.value))}
            className="w-full accent-emerald-600"
          />
        </label>
      </div>
    </div>
  );
}
