import type { Locale } from "@/i18n/config";

export type LanguageOption = {
  locale: Locale;
  label: string;
  flag: string;
};

// Sem asset/dependência nova pra bandeiras — emoji cobre os 3 idiomas
// suportados hoje sem custo extra de bundle.
export const LANGUAGES: LanguageOption[] = [
  { locale: "pt-BR", label: "Português", flag: "🇧🇷" },
  { locale: "en", label: "English", flag: "🇺🇸" },
  { locale: "zh", label: "简体中文", flag: "🇨🇳" },
];
