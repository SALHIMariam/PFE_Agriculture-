import { Trophy } from "lucide-react";
import type { RankingEntry } from "../../../services/heatmapService";

type Props = {
  ranking: RankingEntry[];
  onSelect: (governorate: string) => void;
};

const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-700"];

export default function RankingList({ ranking, onSelect }: Props) {
  const top = ranking.slice(0, 5);

  return (
    <div className="pointer-events-auto w-72 rounded-2xl border border-white/40 bg-white/70 p-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/70">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
        <Trophy size={16} />
        Régions les plus affectées
      </div>
      <div className="flex flex-col gap-1">
        {top.length === 0 && <div className="text-xs text-gray-400">Aucune donnée</div>}
        {top.map((entry, i) => (
          <button
            key={entry.governorate}
            onClick={() => onSelect(entry.governorate)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-emerald-50 dark:hover:bg-white/5"
          >
            <span className={`w-4 text-sm font-bold ${MEDAL_COLORS[i] ?? "text-gray-400"}`}>{i + 1}</span>
            <span className="flex-1 font-medium text-gray-700 dark:text-gray-200">{entry.governorate}</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">{entry.cases} cas malades</span>
          </button>
        ))}
      </div>
    </div>
  );
}
