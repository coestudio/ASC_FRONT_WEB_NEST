import ptBR from "./dictionaries/pt-BR.json";
import en from "./dictionaries/en.json";
import zh from "./dictionaries/zh.json";

import type { Locale } from "./config";

/**
 * `pt-BR` é a fonte de verdade do shape das traduções. `en`/`zh` devem ter
 * exatamente as mesmas chaves (ver script de lint em package.json / spec §9).
 */
export type Dictionary = typeof ptBR;

export const dictionaries: Record<Locale, Dictionary> = {
  "pt-BR": ptBR,
  en: en as Dictionary,
  zh: zh as Dictionary,
};
