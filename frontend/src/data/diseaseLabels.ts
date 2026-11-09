import { cropLabel } from "./crops";

export type DiseaseLabel = {
  crop: string;
  disease: string;
};

/**
 * Classe prédite (CNN) → libellés français affichés. Les clés restent les
 * noms techniques du modèle (`Tomato__early_blight`…), jamais traduits.
 * Noms de maladies alignés sur ai/copilot_serving/knowledge_base.json, sans
 * le nom de la culture (déjà affiché à côté : « Tomate — Mildiou »).
 */
export const diseaseLabels: Record<string, DiseaseLabel> = {
  Apple__black_rot: { crop: "Pommier", disease: "Pourriture noire" },
  Apple__cedar_apple_rust: { crop: "Pommier", disease: "Rouille grillagée" },
  Apple__healthy: { crop: "Pommier", disease: "Saine" },
  Apple__scab: { crop: "Pommier", disease: "Tavelure" },
  Bean__beans_angular_leaf_spot_disease: { crop: "Haricot", disease: "Tache anguleuse" },
  Bean__beans_healthy_crop: { crop: "Haricot", disease: "Saine" },
  Bean__beans_rust_disease: { crop: "Haricot", disease: "Rouille" },
  Corn__common_rust: { crop: "Maïs", disease: "Rouille commune" },
  Corn__gray_leaf_spot: { crop: "Maïs", disease: "Cercosporiose" },
  Corn__healthy: { crop: "Maïs", disease: "Saine" },
  Corn__maize_streak_virus_disease: { crop: "Maïs", disease: "Virus de la striure" },
  Corn__northern_leaf_blight: { crop: "Maïs", disease: "Helminthosporiose" },
  Cucumber__anthracnose: { crop: "Concombre", disease: "Anthracnose" },
  Cucumber__downy_mildew: { crop: "Concombre", disease: "Mildiou" },
  Cucumber__gummy_stem_blight: { crop: "Concombre", disease: "Pourriture gommeuse des tiges" },
  Cucumber__healthy: { crop: "Concombre", disease: "Saine" },
  Cucumber__powdery_mildew: { crop: "Concombre", disease: "Oïdium" },
  Grape__black_measles: { crop: "Vigne", disease: "Esca" },
  Grape__black_rot: { crop: "Vigne", disease: "Black-rot" },
  Grape__healthy: { crop: "Vigne", disease: "Saine" },
  Grape__leaf_blight: { crop: "Vigne", disease: "Brûlure des feuilles" },
  Groundnut__early_leaf_spot: { crop: "Arachide", disease: "Cercosporiose précoce" },
  Groundnut__healthy: { crop: "Arachide", disease: "Saine" },
  Groundnut__late_leaf_spot: { crop: "Arachide", disease: "Cercosporiose tardive" },
  Groundnut__nutrition_deficiency: { crop: "Arachide", disease: "Carence nutritionnelle" },
  Groundnut__rust: { crop: "Arachide", disease: "Rouille" },
  Potato__early_blight: { crop: "Pomme de terre", disease: "Alternariose" },
  Potato__healthy: { crop: "Pomme de terre", disease: "Saine" },
  Potato__late_blight: { crop: "Pomme de terre", disease: "Mildiou" },
  Tomato__bacterial_spot: { crop: "Tomate", disease: "Tache bactérienne" },
  Tomato__early_blight: { crop: "Tomate", disease: "Alternariose" },
  Tomato__healthy: { crop: "Tomate", disease: "Saine" },
  Tomato__late_blight: { crop: "Tomate", disease: "Mildiou" },
  Tomato__septoria_leaf_spot: { crop: "Tomate", disease: "Septoriose" },
  Tomato__spider_mites_two_spotted_spider_mite: { crop: "Tomate", disease: "Tétranyque tisserand" },
  Tomato__yellow_leaf_curl_virus: { crop: "Tomate", disease: "Virus des feuilles jaunes en cuillère" },
  Wheat__healthy: { crop: "Blé", disease: "Saine" },
  Wheat__septoria: { crop: "Blé", disease: "Septoriose" },
  Wheat__stripe_rust: { crop: "Blé", disease: "Rouille jaune" },

  // Classes générées par les seeders de démonstration (absentes du CNN réel).
  Apple__apple_scab: { crop: "Pommier", disease: "Tavelure" },
  Grape__esca: { crop: "Vigne", disease: "Esca" },
  Tomato__leaf_mold: { crop: "Tomate", disease: "Cladosporiose" },
  Tomato__spider_mites: { crop: "Tomate", disease: "Tétranyque tisserand" },
  Wheat__brown_rust: { crop: "Blé", disease: "Rouille brune" },
  Wheat__yellow_rust: { crop: "Blé", disease: "Rouille jaune" },
};

// Recherche insensible à la casse (ex. « tomato__late_blight » côté actualités).
const LOWER_INDEX: Record<string, DiseaseLabel> = Object.fromEntries(
  Object.entries(diseaseLabels).map(([key, label]) => [key.toLowerCase(), label]),
);

const REDUNDANT_WORDS = new Set(["disease", "crop"]);

function toSentenceCase(text: string): string {
  const words = text.split(/[_\s]+/).filter(Boolean).map((w) => w.toLowerCase());
  const joined = words.join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

function humanizeFallback(key: string): DiseaseLabel {
  const [cropPart, ...rest] = key.split("__");
  const crop = cropPart ? cropLabel(cropPart.charAt(0).toUpperCase() + cropPart.slice(1).toLowerCase()) : "Culture";

  let words = (rest.join(" ") || cropPart || "").split(/[_\s]+/).filter(Boolean);

  const cropLower = (cropPart ?? "").toLowerCase();
  while (words.length > 0 && [cropLower, `${cropLower}s`].includes(words[0].toLowerCase())) {
    words.shift();
  }

  words = words.filter((word) => !REDUNDANT_WORDS.has(word.toLowerCase()));

  return {
    crop,
    disease: words.length > 0 ? toSentenceCase(words.join(" ")) : "Diagnostic",
  };
}

export function getDiseaseLabel(key: string | null | undefined): DiseaseLabel {
  if (!key) {
    return { crop: "Culture", disease: "Diagnostic indisponible" };
  }

  return diseaseLabels[key] ?? LOWER_INDEX[key.toLowerCase()] ?? humanizeFallback(key);
}

/** « Tomate — Mildiou » à partir d'une classe prédite. */
export function formatDiseaseLabel(key: string | null | undefined): string {
  const { crop, disease } = getDiseaseLabel(key);
  return `${crop} — ${disease}`;
}

/**
 * Nom de maladie seul, à partir d'une clé partielle (« early_blight ») et,
 * si connue, de la culture (« Tomato ») — format renvoyé par certaines API.
 */
export function diseaseNameFr(disease: string | null | undefined, crop?: string | null): string {
  if (!disease) return "";
  if (disease.includes("__")) return getDiseaseLabel(disease).disease;
  if (crop) return getDiseaseLabel(`${crop}__${disease}`).disease;
  const match = Object.entries(diseaseLabels).find(([key]) => key.toLowerCase().endsWith(`__${disease.toLowerCase()}`));
  return match ? match[1].disease : toSentenceCase(disease);
}
