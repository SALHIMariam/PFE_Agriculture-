export type ClimateZone = "nord" | "centre" | "sud";

export type GovernorateInfo = {
  name: string;
  lat: number;
  lng: number;
  zone: ClimateZone;
};

// Mirrors backend/config/tunisia.php — single source of truth for centroids/zones.
export const GOVERNORATES: GovernorateInfo[] = [
  { name: "Tunis", lat: 36.8, lng: 10.18, zone: "nord" },
  { name: "Ariana", lat: 36.86, lng: 10.19, zone: "nord" },
  { name: "Ben Arous", lat: 36.75, lng: 10.22, zone: "nord" },
  { name: "Manouba", lat: 36.81, lng: 10.1, zone: "nord" },
  { name: "Nabeul", lat: 36.45, lng: 10.74, zone: "nord" },
  { name: "Zaghouan", lat: 36.4, lng: 10.14, zone: "nord" },
  { name: "Bizerte", lat: 37.27, lng: 9.87, zone: "nord" },
  { name: "Béja", lat: 36.73, lng: 9.18, zone: "nord" },
  { name: "Jendouba", lat: 36.5, lng: 8.78, zone: "nord" },
  { name: "Le Kef", lat: 36.17, lng: 8.7, zone: "nord" },
  { name: "Siliana", lat: 36.08, lng: 9.37, zone: "nord" },
  { name: "Kairouan", lat: 35.68, lng: 10.1, zone: "centre" },
  { name: "Kasserine", lat: 35.17, lng: 8.83, zone: "centre" },
  { name: "Sidi Bouzid", lat: 35.04, lng: 9.48, zone: "centre" },
  { name: "Sousse", lat: 35.83, lng: 10.63, zone: "centre" },
  { name: "Monastir", lat: 35.77, lng: 10.83, zone: "centre" },
  { name: "Mahdia", lat: 35.5, lng: 11.06, zone: "centre" },
  { name: "Sfax", lat: 34.74, lng: 10.76, zone: "centre" },
  { name: "Gafsa", lat: 34.42, lng: 8.78, zone: "centre" },
  { name: "Tozeur", lat: 33.92, lng: 8.13, zone: "sud" },
  { name: "Kebili", lat: 33.7, lng: 8.97, zone: "sud" },
  { name: "Gabès", lat: 33.88, lng: 10.1, zone: "sud" },
  { name: "Médenine", lat: 33.35, lng: 10.5, zone: "sud" },
  { name: "Tataouine", lat: 32.93, lng: 10.45, zone: "sud" },
];

export const ZONE_LABELS: Record<ClimateZone, string> = {
  nord: "Nord · Humide",
  centre: "Centre · Semi-aride",
  sud: "Sud · Aride",
};

export const TUNISIA_CENTER: [number, number] = [34.4, 9.6];
