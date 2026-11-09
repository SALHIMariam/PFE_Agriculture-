/** Crop key → emoji. Shared by the profile page and the farmer topbar. */
export const CROP_EMOJIS: Record<string, string> = {
  Apple: "🍎",
  Bean: "🫘",
  Corn: "🌽",
  Cucumber: "🥒",
  Grape: "🍇",
  Groundnut: "🥜",
  Potato: "🥔",
  Tomato: "🍅",
  Wheat: "🌾",
  Mango: "🥭",
  Lemon: "🍋",
  Olive: "🫒",
  Date: "🌴",
  Orange: "🍊",
  Pepper: "🌶️",
  Onion: "🧅",
  Strawberry: "🍓",
};

export function cropEmoji(crop: string): string {
  return CROP_EMOJIS[crop] ?? "🌱";
}

/**
 * Crop key → libellé français affiché. Les clés (Apple, Tomato…) restent
 * celles envoyées à l'API et stockées en base ; seul l'affichage est traduit.
 */
export const CROP_LABELS_FR: Record<string, string> = {
  Apple: "Pommier",
  Bean: "Haricot",
  Corn: "Maïs",
  Cucumber: "Concombre",
  Grape: "Vigne",
  Groundnut: "Arachide",
  Potato: "Pomme de terre",
  Tomato: "Tomate",
  Wheat: "Blé",
  Mango: "Mangue",
  Lemon: "Citron",
  Olive: "Olivier",
  Date: "Palmier dattier",
  Orange: "Oranger",
  Pepper: "Piment",
  Onion: "Oignon",
  Strawberry: "Fraise",
};

export function cropLabel(crop: string | null | undefined): string {
  if (!crop) return "";
  return CROP_LABELS_FR[crop] ?? crop;
}
