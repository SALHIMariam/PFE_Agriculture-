import { diseaseNameFr, formatDiseaseLabel } from "../../../../data/diseaseLabels";
type Props = {
  label: string;
  value: string;
  hint?: string;
};

export default function KpiTile({ label, value, hint }: Props) {
  const isNA = value === "N/A";

  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
      <div className={`text-2xl font-semibold ${isNA ? "text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-white/90"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{hint}</div>}
    </div>
  );
}

export function formatPct(value: number | null): string {
  return value === null ? "N/A" : `${value}%`;
}

export function formatMinutes(value: number | null): string {
  if (value === null) return "N/A";
  return value < 60 ? `${Math.round(value)} min` : `${(value / 60).toFixed(1)} h`;
}

export function formatDisease(name: string | null | undefined): string {
  if (!name) return "—";
  return name.includes("__") ? formatDiseaseLabel(name) : diseaseNameFr(name);
}
