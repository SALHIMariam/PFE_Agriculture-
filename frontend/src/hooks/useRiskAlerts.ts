import { useEffect, useState } from "react";
import { getHeatmapAlerts, type AlertEntry } from "../services/heatmapService";

const POLL_INTERVAL_MS = 30000;

/**
 * Alertes de propagation régionale (GET /api/heatmap/alerts) : agrégats
 * recalculés à chaque appel, sans persistance ni id — à ne jamais mélanger
 * avec les notifications réelles (table `notifications`, qui ont un id et
 * un état lu/non-lu). Partagé entre le badge de la carte (DiseaseHeatmap)
 * et la section "Alertes régionales" du dropdown de notifications.
 */
export function useRiskAlerts(): AlertEntry[] {
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);

  useEffect(() => {
    const fetchAlerts = () => getHeatmapAlerts().then(setAlerts).catch(() => {});
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return alerts;
}
