export const locales = ["pt-BR", "en", "zh"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-BR";

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
