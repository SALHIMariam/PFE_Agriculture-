import { useEffect, useState } from "react";
import clsx from "clsx";
import styles from "../FarmerDashboard.module.css";
import { getCurrentWeather, type CurrentWeather } from "../../../services/weatherService";

export default function WeatherChip() {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentWeather()
      .then((w) => {
        if (!cancelled) setWeather(w);
      })
      .catch(() => {
        if (!cancelled) setWeather({ available: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const icon = weather?.available ? weather.icon ?? "⛅" : "⛅";
  const temp = weather?.available && weather.temperature != null ? `${weather.temperature}°C` : "—°C";

  return (
    <div className={clsx(styles["tb-chip"], styles["tb-chipAccent"])}>
      {icon} {temp}
    </div>
  );
}
