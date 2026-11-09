import type { RankingEntry } from "../../../services/heatmapService";

type Props = {
  ranking: RankingEntry[];
};

const TIERS = [
  { label: "Sain", color: "bg-green-500", test: (c: number) => c === 0 },
  { label: "Faible", color: "bg-yellow-500", test: (c: number) => c >= 1 && c < 30 },
  { label: "Modéré", color: "bg-orange-500", test: (c: number) => c >= 30 && c < 80 },
  { label: "Élevé", color: "bg-red-500", test: (c: number) => c >= 80 && c < 150 },
  { label: "Critique", color: "bg-red-800", test: (c: number) => c >= 150 },
];

export default function Legend({ ranking }: Props) {
  return (
    <div className="pointer-events-auto rounded-2xl border border-white/40 bg-white/70 px-4 py-3 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/70">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Légende
      </div>
      <div className="flex flex-col gap-1.5">
        {TIERS.map((tier) => {
          const count = ranking.filter((r) => tier.test(r.cases)).length;
          return (
            <div key={tier.label} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <span className={`h-2.5 w-2.5 rounded-full ${tier.color}`} />
              <span className="flex-1">{tier.label}</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">{count} gouv.</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
