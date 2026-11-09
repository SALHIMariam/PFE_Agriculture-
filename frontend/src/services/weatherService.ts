import api from "../api/client";

export type CurrentWeather = {
  available: boolean;
  governorate?: string;
  temperature?: number;
  humidity?: number | null;
  condition?: string;
  icon?: string;
};

export async function getCurrentWeather(): Promise<CurrentWeather> {
  const { data } = await api.get("/api/weather/current");
  return data as CurrentWeather;
}
