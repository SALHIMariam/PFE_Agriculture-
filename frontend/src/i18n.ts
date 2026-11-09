import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import fr from "./locales/fr/translation.json";
import en from "./locales/en/translation.json";
import ar from "./locales/ar/translation.json";

export const SUPPORTED_LANGUAGES = ["fr", "en", "ar"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "fr";
const STORAGE_KEY = "i18nextLng";

export function isSupportedLanguage(value: unknown): value is AppLanguage {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function storedLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isSupportedLanguage(stored)) return stored;
  } catch {
    /* localStorage unavailable — fall through to default */
  }
  return DEFAULT_LANGUAGE;
}

/** Reflect the active language on <html> so CSS / the browser pick up RTL. */
export function applyDocumentLanguage(lng: string): void {
  const dir = lng === "ar" ? "rtl" : "ltr";
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", lng);
    document.documentElement.setAttribute("dir", dir);
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: storedLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

applyDocumentLanguage(i18n.language);

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore persistence failure */
  }
  applyDocumentLanguage(lng);
});

/**
 * Switch language app-wide. Safe to call with an untrusted value (e.g. from the
 * server) — unsupported values are ignored.
 */
export function setAppLanguage(lng: unknown): void {
  if (isSupportedLanguage(lng) && lng !== i18n.language) {
    void i18n.changeLanguage(lng);
  }
}

export default i18n;
