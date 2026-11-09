import { CircleMarker, Tooltip } from "react-leaflet";
import { useState } from "react";
import { GOVERNORATES } from "../data/governorates";
import type { RankingEntry } from "../../../services/heatmapService";

type Props = {
  ranking: RankingEntry[];
  selected: string | null;
  onSelect: (governorate: string) => void;
};

function colorFor(cases: number): string {
  if (cases === 0) return "#22c55e";
  if (cases < 30) return "#eab308";
  if (cases < 80) return "#f97316";
  if (cases < 150) return "#ef4444";
  return "#991b1b";
}

function radiusFor(cases: number): number {
  if (cases === 0) return 6;
  if (cases < 30) return 10;
  if (cases < 80) return 14;
  if (cases < 150) return 18;
  return 22;
}

export default function GovernorateMarkers({ ranking, selected, onSelect }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const casesByGovernorate = new Map(ranking.map((r) => [r.governorate, r.cases]));

  return (
    <>
      {GOVERNORATES.map((g) => {
        const cases = casesByGovernorate.get(g.name) ?? 0;
        const isActive = hovered === g.name || selected === g.name;
        const isAtRisk = cases >= 80;

        const classNames = ["governorate-marker", "governorate-marker-transition"];
        if (isActive) classNames.push("governorate-marker-active");
        if (isAtRisk) classNames.push("governorate-marker-critical");

        return (
          <CircleMarker
            key={g.name}
            center={[g.lat, g.lng]}
            radius={isActive ? radiusFor(cases) + 4 : radiusFor(cases)}
            pathOptions={{
              color: "#ffffff",
              weight: isActive ? 3 : 1.5,
              fillColor: colorFor(cases),
              fillOpacity: cases === 0 ? 0.55 : 0.85,
              className: classNames.join(" "),
            }}
            eventHandlers={{
              click: () => onSelect(g.name),
              mouseover: () => setHovered(g.name),
              mouseout: () => setHovered(null),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <span className="text-xs font-semibold">
                {g.name} · {cases} cas malades
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
