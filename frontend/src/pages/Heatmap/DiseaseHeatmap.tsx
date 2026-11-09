import { useCallback, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./DiseaseHeatmap.css";

import GovernorateMarkers from "./components/GovernorateMarkers";
import FilterPanel from "./components/FilterPanel";
import Legend from "./components/Legend";
import RankingList from "./components/RankingList";
import TimelineSlider from "./components/TimelineSlider";
import GovernoratePanel from "./components/GovernoratePanel";
import AlertPanel from "./components/AlertPanel";
import { GOVERNORATES, TUNISIA_CENTER } from "./data/governorates";
import { useHeatmapData } from "./useHeatmapData";

function FlyToGovernorate({ target }: { target: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    const info = GOVERNORATES.find((g) => g.name === target);
    if (info) {
      map.flyTo([info.lat, info.lng], 9, { duration: 1.1 });
    }
  }, [target, map]);

  return null;
}

export default function DiseaseHeatmap() {
  const {
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
  } = useHeatmapData();

  const handleSelect = useCallback(
    (governorate: string) => setSelectedGovernorate(governorate),
    [setSelectedGovernorate]
  );

  return (
    <div className="relative h-[calc(100vh-140px)] min-h-[560px] w-full overflow-hidden rounded-3xl border border-emerald-100 shadow-lg dark:border-white/10">
      <MapContainer
        center={TUNISIA_CENTER}
        zoom={7}
        className="disease-heatmap-map h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GovernorateMarkers ranking={ranking} selected={selectedGovernorate} onSelect={handleSelect} />
        <FlyToGovernorate target={selectedGovernorate} />
      </MapContainer>

      {loading && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-emerald-700 shadow-md dark:bg-gray-900/90 dark:text-emerald-400">
          Actualisation de la carte…
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-4 z-[1000] flex flex-col gap-3">
        <FilterPanel filters={filters} onChange={setFilters} />
        <AlertPanel alerts={alerts} onSelect={handleSelect} />
        <Legend ranking={ranking} />
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-[1000] flex flex-col gap-3">
        <RankingList ranking={ranking} onSelect={handleSelect} />
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-[1000] w-[calc(100%-2rem)] -translate-x-1/2">
        <TimelineSlider
          timeline={timeline}
          month={filters.month}
          onChange={(month) => setFilters({ ...filters, month })}
        />
      </div>

      <GovernoratePanel
        governorate={selectedGovernorate}
        summary={summary}
        loading={summaryLoading}
        onClose={() => setSelectedGovernorate(null)}
      />
    </div>
  );
}
