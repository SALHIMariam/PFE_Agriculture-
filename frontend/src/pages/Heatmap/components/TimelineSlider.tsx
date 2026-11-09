import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import type { TimelineEntry } from "../../../services/heatmapService";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

type Props = {
  timeline: TimelineEntry[];
  month: number | null;
  onChange: (month: number | null) => void;
};

export default function TimelineSlider({ timeline, month, onChange }: Props) {
  const [playing, setPlaying] = useState(false);
  const monthRef = useRef(month ?? 1);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    monthRef.current = month ?? 1;
  }, [month]);

  useEffect(() => {
    if (!playing) return;

    intervalRef.current = window.setInterval(() => {
      const next = (monthRef.current % 12) + 1;
      monthRef.current = next;
      onChange(next);
    }, 900);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const max = Math.max(1, ...timeline.map((t) => t.cases));

  return (
    <div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-4 rounded-2xl border border-white/40 bg-white/70 px-5 py-3 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/70">
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition hover:bg-emerald-700"
        aria-label={playing ? "Pause" : "Lecture"}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      <div className="flex-1">
        <div className="mb-1 flex h-6 items-end gap-[3px]">
          {timeline.map((t) => (
            <div
              key={t.month}
              className={`flex-1 rounded-sm transition-all duration-300 ${
                month === t.month ? "bg-emerald-600" : "bg-emerald-300/60 dark:bg-emerald-700/40"
              }`}
              style={{ height: `${Math.max(8, (t.cases / max) * 100)}%` }}
            />
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={12}
          value={month ?? 1}
          onChange={(e) => {
            setPlaying(false);
            onChange(Number(e.target.value));
          }}
          className="w-full accent-emerald-600"
        />
        <div className="mt-1 flex justify-between text-[10px] font-medium text-gray-500 dark:text-gray-400">
          {MONTH_LABELS.map((label, i) => (
            <span key={label} className={month === i + 1 ? "font-bold text-emerald-700 dark:text-emerald-400" : ""}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {month !== null && (
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            onChange(null);
          }}
          className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Toutes les périodes
        </button>
      )}
    </div>
  );
}
