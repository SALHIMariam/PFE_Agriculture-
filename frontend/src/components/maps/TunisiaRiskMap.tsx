import { GOVERNORATES } from "../../pages/Heatmap/data/governorates";
import { RISK_COLORS, riskColor } from "./riskColors";

/**
 * Carte SVG stylisée de la Tunisie : silhouette + un point par gouvernorat
 * coloré selon son niveau de risque. Partagée par le dashboard farmer
 * (RiskMapWidget) et le dashboard admin (Home) — aucune tuile externe.
 */

export type RiskRegion = {
  governorate: string;
  total_analyses: number;
  risk_percentage: number;
};

/**
 * Silhouette simplifiée en [longitude, latitude], sens horaire depuis Tabarka.
 * Projetée avec la même fonction que les centroïdes des gouvernorats, ce qui
 * garantit que chaque point tombe au bon endroit.
 */
const TUNISIA_OUTLINE: [number, number][] = [
  [8.62, 36.94], [9.22, 37.23], [9.87, 37.33], [10.2, 37.17], [10.3, 36.9],
  [10.57, 36.87], [11.05, 37.08], [11.1, 36.85], [10.6, 36.4], [10.65, 35.82],
  [10.85, 35.77], [11.07, 35.5], [11.12, 35.23], [10.75, 34.73], [10.4, 34.4],
  [10.1, 33.88], [10.75, 33.75], [11.1, 33.5], [11.56, 33.17], [11.45, 32.6],
  [10.85, 31.95], [10.3, 31.4], [9.5, 30.23], [9.05, 31.0], [9.0, 32.0],
  [8.3, 32.5], [7.49, 33.25], [8.1, 34.1], [8.25, 34.6], [8.3, 35.25],
  [8.4, 35.7], [8.3, 36.45], [8.4, 36.65],
];

// Projection équirectangulaire corrigée de cos(34°) pour garder les proportions.
const LNG_MIN = 7.3;
const LAT_MAX = 37.5;
const SCALE = 40;
const LNG_FACTOR = Math.cos((34 * Math.PI) / 180);
const VIEW_W = 155;
const VIEW_H = 300;

function project(lng: number, lat: number): [number, number] {
  return [(lng - LNG_MIN) * LNG_FACTOR * SCALE, (LAT_MAX - lat) * SCALE];
}

const OUTLINE_PATH =
  TUNISIA_OUTLINE.map(([lng, lat], i) => {
    const [x, y] = project(lng, lat);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";

type Props = {
  regions: RiskRegion[];
  /** Gouvernorat mis en avant (point plus gros + halo animé). */
  highlight?: string | null;
  height?: number;
  className?: string;
};

export default function TunisiaRiskMap({ regions, highlight, height = 250, className }: Props) {
  const byName = new Map(regions.map((r) => [r.governorate, r]));

  return (
    <svg
      viewBox={`-6 -6 ${VIEW_W + 12} ${VIEW_H + 12}`}
      style={{ height, width: "auto", maxWidth: "100%", overflow: "visible" }}
      className={className}
      role="img"
      aria-label="Carte des risques par gouvernorat"
    >
      <path
        d={OUTLINE_PATH}
        className="fill-[#e8f5e9] stroke-[#a5d6a7] dark:fill-white/[0.06] dark:stroke-white/20"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {GOVERNORATES.map((g) => {
        const region = byName.get(g.name);
        const hasData = (region?.total_analyses ?? 0) > 0;
        const pct = region?.risk_percentage ?? 0;
        const color = hasData ? riskColor(pct) : RISK_COLORS.none;
        const isHighlighted = g.name === highlight;
        const [cx, cy] = project(g.lng, g.lat);

        return (
          <g key={g.name}>
            <title>{hasData ? `${g.name} — risque ${pct}%` : `${g.name} — aucune donnée`}</title>
            {isHighlighted && (
              <circle cx={cx} cy={cy} r={6} fill="none" stroke={color} strokeWidth={1.5}>
                <animate attributeName="r" from="6" to="16" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.9" to="0" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={cx}
              cy={cy}
              r={isHighlighted ? 6.5 : 4.5}
              fill={color}
              fillOpacity={0.92}
              stroke="#fff"
              strokeWidth={isHighlighted ? 2 : 1}
            />
          </g>
        );
      })}
    </svg>
  );
}
