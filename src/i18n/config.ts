export const locales = ["pt-BR", "en", "zh", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-BR";

export const LOCALE_COOKIE_NAME = "asc_locale";

export const isLocale = (value: string | null | undefined): value is Locale =>
  !!value && (locales as readonly string[]).includes(value);

/** Rótulo e bandeira por locale — usado no seletor de idioma. */
export const LOCALE_LABELS: Record<Locale, { label: string; flag: string }> = {
  "pt-BR": { label: "Português", flag: "🇧🇷" },
  en: { label: "English", flag: "🇺🇸" },
  zh: { label: "中文", flag: "🇨🇳" },
  es: { label: "Español", flag: "🇪🇸" },
};

/**
 * Escolhe o melhor locale a partir de um header `Accept-Language`
 * ("pt-BR,pt;q=0.9,en;q=0.8"). Cai no `defaultLocale` se nada casar.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;
  const wanted = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .filter(Boolean);
  for (const tag of wanted) {
    const exact = locales.find((l) => l.toLowerCase() === tag);
    if (exact) return exact;
    const base = locales.find((l) => l.toLowerCase().split("-")[0] === tag.split("-")[0]);
    if (base) return base;
  }
  return defaultLocale;
}
