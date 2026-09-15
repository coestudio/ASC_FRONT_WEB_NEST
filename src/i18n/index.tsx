// Ponto de entrada do i18n no client. O provider e os hooks vivem em
// src/lib/ui-prefs.tsx (tema + idioma juntos, semeados pelo __root).
export { useT, useLocale, useSetLocale } from "@/lib/ui-prefs";
export { locales, defaultLocale, isLocale, LOCALE_LABELS, type Locale } from "./config";
export type { TranslationKey } from "./translate";
